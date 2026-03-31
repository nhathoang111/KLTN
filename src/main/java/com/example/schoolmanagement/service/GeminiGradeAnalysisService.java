package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.ai.GradeAnalysisRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisResponse;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.TooManyRequestsException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class GeminiGradeAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(GeminiGradeAnalysisService.class);

    private static final String SOURCE_GEMINI = "GEMINI";
    private static final String SOURCE_LOCAL_FALLBACK = "LOCAL_FALLBACK";

    private static final String AI_ERROR_INVALID_JSON = "INVALID_JSON";
    private static final String AI_ERROR_QUOTA_EXCEEDED = "QUOTA_EXCEEDED";
    private static final String AI_ERROR_MISSING_API_KEY = "MISSING_API_KEY";
    private static final String AI_ERROR_RUNTIME = "GEMINI_RUNTIME_ERROR";

    /** TTL dài hơn một chút để giảm gọi lặp Gemini (free tier dễ 429). */
    private static final long ANALYSIS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ObjectMapper looseJsonMapper = new ObjectMapper()
            .configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES.mappedFeature(), true)
            // Gemini đôi khi trả text có ký tự xuống dòng / control char trong string -> JSON strict sẽ fail
            .configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true)
            // Một số response có escape lạ, bật để “cứu” parse
            .configure(JsonReadFeature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER.mappedFeature(), true);
    private final Map<String, CachedAnalysis> analysisCache = new ConcurrentHashMap<>();

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${GEMINI_MODEL:gemini-1.5-flash}")
    private String geminiModel;

    public GradeAnalysisResponse analyzeGrade(GradeAnalysisRequest request) {
        return analyzeGrade(request, AiExecutionContext.forEndpoint("/api/ai/grade-analysis"));
    }

    public GradeAnalysisResponse analyzeGrade(GradeAnalysisRequest request, AiExecutionContext context) {
        long startedAt = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString();

        if (request == null) throw new BadRequestException("Thiếu dữ liệu phân tích");
        if (context == null) context = AiExecutionContext.forEndpoint("/api/ai/grade-analysis");

        RiskAndStats rs = calculateRiskAndStats(request, context);
        String analysisScope = (request.getClassId() == null) ? "GLOBAL" : "CLASS";
        if (context.getAnalysisScope() == null) context.setAnalysisScope(analysisScope);
        boolean strictGemini = "/api/ai/grade-analysis".equals(context.getEndpoint());

        if (request.getSubjects() == null || request.getSubjects().isEmpty()) {
            if (strictGemini) {
                throw new BadRequestException("Thiếu dữ liệu môn học để phân tích AI.");
            }
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, "MEDIUM", rs.performanceLevel);
            markExecutionSource(fb, SOURCE_LOCAL_FALLBACK, false, AI_ERROR_RUNTIME);
            logUsage(requestId, context, fb, startedAt);
            return fb;
        }

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            if (strictGemini) {
                throw new BadRequestException("Thiếu GEMINI_API_KEY hoặc key không hợp lệ.");
            }
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel, rs.performanceLevel);
            markExecutionSource(fb, SOURCE_LOCAL_FALLBACK, false, AI_ERROR_MISSING_API_KEY);
            logUsage(requestId, context, fb, startedAt);
            return fb;
        }

        try {
            String cacheKey = buildCacheKey(request, context);
            GradeAnalysisResponse cached = getFromCache(cacheKey);
            if (cached != null) {
                log.info("AI cache hit. requestId={} endpoint={}", requestId, context.getEndpoint());
                logUsage(requestId, context, cached, startedAt);
                return cached;
            }

            String prompt = buildPrompt(request, rs, context);
            GeminiCallResult gemini = callGemini(prompt);
            GradeAnalysisResponse parsed = strictGemini
                    ? parseGeminiJsonStrict(gemini.analysisText)
                    : parseGeminiJsonLenient(gemini.analysisText);
            if (parsed == null) {
                if (strictGemini) {
                    throw new BadRequestException("Gemini trả dữ liệu không đúng định dạng JSON mong đợi.");
                }
                GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel, rs.performanceLevel);
                markExecutionSource(fb, SOURCE_LOCAL_FALLBACK, false, AI_ERROR_INVALID_JSON);
                List<String> underFromRequest = rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects;
                fb.setUnderAverageSubjects(underFromRequest);
                fb.setRiskLevel(rs.riskLevel);
                fb.setSeverity(rs.riskLevel);
                fb.setTrend(rs.trend);
                fb.setPrioritySubjects(defaultPrioritySubjects(underFromRequest));
                fb.setTopConcerns(defaultTopConcerns(rs.riskLevel, underFromRequest, context));
                fb.setRecommendations(defaultRecommendationsByPerformanceLevel(rs.performanceLevel));
                fb.setSummary(buildConsistentSummary(underFromRequest, fb.getPrioritySubjects(), rs.performanceLevel));
                fb.setPromptTokens(gemini.promptTokens);
                fb.setResponseTokens(gemini.responseTokens);
                fb.setTotalTokens(gemini.totalTokens);
                logUsage(requestId, context, fb, startedAt);
                return fb;
            }

            parsed.setPromptTokens(gemini.promptTokens);
            parsed.setResponseTokens(gemini.responseTokens);
            parsed.setTotalTokens(gemini.totalTokens);
            parsed.setRiskLevel(rs.riskLevel);
            // severity must align with backend-owned riskLevel
            parsed.setSeverity(rs.riskLevel);
            if (parsed.getMetadata() == null) parsed.setMetadata(new GradeAnalysisResponse.Metadata());
            if (parsed.getMetadata().getGeneratedAt() == null) parsed.getMetadata().setGeneratedAt(LocalDateTime.now());
            if (context.getTotalStudents() != null) parsed.getMetadata().setTotalStudents(context.getTotalStudents());
            if (context.getWeakStudentCount() != null) parsed.getMetadata().setWeakStudentCount(context.getWeakStudentCount());

            // Deterministic business-rule fields (never trust AI)
            parsed.setTrend(rs.trend);
            parsed.setUnderAverageSubjects(rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects);
            parsed.setPerformanceLevel(rs.performanceLevel);

            // Defensive validation & sanitization (JSON-only contract)
            sanitizeAiJsonFields(parsed, rs);

            // Summary must be consistent with backend under-average list (Vietnamese)
            parsed.setSummary(buildConsistentSummary(parsed.getUnderAverageSubjects(), parsed.getPrioritySubjects(), rs.performanceLevel));
            markExecutionSource(parsed, SOURCE_GEMINI, true, null);
            putToCache(cacheKey, parsed);
            logUsage(requestId, context, parsed, startedAt);
            return parsed;
        } catch (Exception e) {
            log.warn("AI grade-analysis failed, fallback. requestId={} reason={}", requestId, e.toString());
            if (strictGemini) {
                if (isQuotaExceededException(e)) {
                    throw new TooManyRequestsException(buildQuotaExceededMessage(e));
                }
                throw new BadRequestException("Gemini lỗi: " + e.getMessage());
            }
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel, rs.performanceLevel);
            String aiError = AI_ERROR_RUNTIME;
            if (isQuotaExceededException(e)) {
                aiError = AI_ERROR_QUOTA_EXCEEDED;
            } else if (e.getMessage() != null && e.getMessage().toLowerCase(Locale.ROOT).contains("api key")) {
                aiError = AI_ERROR_MISSING_API_KEY;
            } else if (e.getMessage() != null) {
                String m = e.getMessage().toLowerCase(Locale.ROOT);
                if (m.contains("json") || m.contains("unexpected character") || m.contains("unexpected end-of-input")) {
                    aiError = AI_ERROR_INVALID_JSON;
                }
            }
            markExecutionSource(fb, SOURCE_LOCAL_FALLBACK, false, aiError);
            List<String> underFromRequest = rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects;
            fb.setUnderAverageSubjects(underFromRequest);
            fb.setRiskLevel(rs.riskLevel);
            fb.setSeverity(rs.riskLevel);
            fb.setTrend(rs.trend);
            fb.setPrioritySubjects(defaultPrioritySubjects(underFromRequest));
            fb.setTopConcerns(defaultTopConcerns(rs.riskLevel, underFromRequest, context));
            fb.setRecommendations(defaultRecommendationsByPerformanceLevel(rs.performanceLevel));
            fb.setSummary(buildConsistentSummary(underFromRequest, fb.getPrioritySubjects(), rs.performanceLevel));
            logUsage(requestId, context, fb, startedAt);
            return fb;
        }
    }

    private void markExecutionSource(GradeAnalysisResponse resp, String source, boolean aiSuccess, String aiError) {
        if (resp == null) return;
        resp.setSource(source);
        resp.setAiSuccess(aiSuccess);
        resp.setAiError(aiSuccess ? null : aiError);
    }

    private static class GeminiCallResult {
        private final String analysisText;
        private final Integer promptTokens;
        private final Integer responseTokens;
        private final Integer totalTokens;

        private GeminiCallResult(String analysisText, Integer promptTokens, Integer responseTokens, Integer totalTokens) {
            this.analysisText = analysisText;
            this.promptTokens = promptTokens;
            this.responseTokens = responseTokens;
            this.totalTokens = totalTokens;
        }
    }

    public static class StudentSubjectAiFields {
        private final String summary;
        private final List<String> topConcerns;
        private final List<String> recommendations;

        public StudentSubjectAiFields(String summary, List<String> topConcerns, List<String> recommendations) {
            this.summary = summary;
            this.topConcerns = topConcerns;
            this.recommendations = recommendations;
        }

        public String getSummary() {
            return summary;
        }

        public List<String> getTopConcerns() {
            return topConcerns;
        }

        public List<String> getRecommendations() {
            return recommendations;
        }
    }

    public StudentSubjectAiFields generateStudentSubjectAiFields(String prompt, AiExecutionContext ctx) throws Exception {
        // Keep JSON-only contract; schema only allows summary/topConcerns/recommendations.
        String schema = "{"
                + "\"type\":\"OBJECT\","
                + "\"required\":[\"summary\",\"topConcerns\",\"recommendations\"],"
                + "\"properties\":{"
                + "\"summary\":{\"type\":\"STRING\"},"
                + "\"topConcerns\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"},\"minItems\":1,\"maxItems\":3},"
                + "\"recommendations\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"},\"minItems\":1,\"maxItems\":3}"
                + "}"
                + "}";
        GeminiCallResult gemini = callGemini(prompt, schema, 1200, 35);
        StudentSubjectAiFields parsed = parseStudentSubjectAiJsonStrict(gemini.analysisText);
        return parsed;
    }

    private GeminiCallResult callGemini(String prompt) throws Exception {
        String schema = "{"
                + "\"type\":\"OBJECT\","
                + "\"required\":[\"summary\",\"trend\",\"severity\",\"topConcerns\",\"prioritySubjects\",\"recommendations\"],"
                + "\"properties\":{"
                + "\"summary\":{\"type\":\"STRING\"},"
                + "\"trend\":{\"type\":\"STRING\",\"enum\":[\"Tăng\",\"Giảm\",\"Ổn định\",\"Không đủ dữ liệu để xác định xu hướng\"]},"
                + "\"severity\":{\"type\":\"STRING\",\"enum\":[\"LOW\",\"MEDIUM\",\"HIGH\",\"CRITICAL\"]},"
                + "\"topConcerns\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"},\"minItems\":2,\"maxItems\":3},"
                + "\"prioritySubjects\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"},\"minItems\":1,\"maxItems\":3},"
                + "\"recommendations\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"},\"minItems\":2,\"maxItems\":3}"
                + "}"
                + "}";
        return callGemini(prompt, schema, 2400, 45);
    }

    private GeminiCallResult callGemini(String prompt, String responseSchemaJson, int maxOutputTokens, int timeoutSeconds) throws Exception {
        if (geminiModel == null || geminiModel.isBlank()) {
            throw new IllegalArgumentException("Gemini model is empty");
        }
        if (responseSchemaJson == null || responseSchemaJson.isBlank()) {
            throw new IllegalArgumentException("responseSchemaJson is empty");
        }

        String modelEnc = URLEncoder.encode(geminiModel, StandardCharsets.UTF_8);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelEnc + ":generateContent?key="
                + URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);

        String body = "{"
                + "\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":" + jsonString(prompt) + " }]}],"
                + "\"generationConfig\":{"
                + "\"temperature\":0,"
                + "\"responseMimeType\":\"application/json\","
                + "\"responseSchema\":" + responseSchemaJson + ","
                + "\"maxOutputTokens\":" + Math.max(128, maxOutputTokens)
                + "}"
                + "}";

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(Math.max(10, timeoutSeconds)))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() == 429) {
            String body429 = decodeHttpBodyBestEffort(response);
            if (shouldRetry429(body429)) {
                Long retrySec = extractRetrySeconds(body429);
                long waitMs = Math.min(45_000L, Math.max(5_000L, ((retrySec == null ? 10L : retrySec) + 1L) * 1000L));
                log.warn("Gemini returned transient 429, waiting {} ms then retrying once", waitMs);
                try {
                    Thread.sleep(waitMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Gemini retry interrupted");
                }
                response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
            } else {
                log.warn("Gemini returned quota-exhausted 429, skipping retry");
            }
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Gemini API error: " + response.statusCode() + " - " + decodeHttpBodyBestEffort(response));
        }

        String rawHttpBody = decodeHttpBodyBestEffort(response);
        JsonNode root = objectMapper.readTree(rawHttpBody);

        Integer promptTokens = null;
        Integer responseTokens = null;
        Integer totalTokens = null;
        try {
            JsonNode usage = locateUsageNode(root);
            if (usage != null && !usage.isNull()) {
                promptTokens = parseIntFromUsage(usage, "promptTokenCount", "prompt_token_count");
                responseTokens = parseIntFromUsage(usage, "candidatesTokenCount", "candidates_token_count");
                totalTokens = parseIntFromUsage(usage, "totalTokenCount", "total_token_count");
            }
        } catch (Exception ex) {
            log.debug("Gemini token usage parse failed: {}", ex.toString());
        }

        JsonNode textNode = root.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text");
        if (textNode.isMissingNode() || textNode.isNull()) {
            throw new RuntimeException("Gemini API response missing content.text");
        }
        return new GeminiCallResult(textNode.asText(), promptTokens, responseTokens, totalTokens);
    }

    private StudentSubjectAiFields parseStudentSubjectAiJsonStrict(String text) {
        if (text == null) throw new BadRequestException("Gemini trả về rỗng");
        String candidate = sanitizeGeminiJsonCandidate(stripCodeFences(text).trim());
        if (candidate.isEmpty()) throw new BadRequestException("Gemini trả về rỗng");

        JsonNode node = null;
        try {
            node = objectMapper.readTree(candidate);
        } catch (Exception ignore) {
        }
        if (node == null) {
            try {
                node = looseJsonMapper.readTree(candidate);
            } catch (Exception ignore) {
            }
        }
        if (node == null) {
            String extracted = extractFirstJsonObject(candidate);
            if (extracted != null) {
                try {
                    node = objectMapper.readTree(extracted);
                } catch (Exception ignore) {
                }
                if (node == null) {
                    try {
                        node = looseJsonMapper.readTree(extracted);
                    } catch (Exception ignore) {
                    }
                }
            }
        }
        if (node == null || !node.isObject()) {
            throw new BadRequestException("Gemini trả dữ liệu không đúng định dạng JSON mong đợi.");
        }

        String summary = textOrNull(node.get("summary"));
        List<String> concerns = readStringArray(node.get("topConcerns"), 3);
        List<String> recs = readStringArray(node.get("recommendations"), 3);
        return new StudentSubjectAiFields(summary, concerns, recs);
    }

    private static String textOrNull(JsonNode n) {
        if (n == null || n.isNull()) return null;
        String s = n.asText();
        return s == null ? null : s.trim();
    }

    private static List<String> readStringArray(JsonNode n, int max) {
        if (n == null || n.isNull() || !n.isArray()) return List.of();
        List<String> out = new ArrayList<>();
        for (JsonNode it : n) {
            if (it == null || it.isNull()) continue;
            String s = it.asText();
            if (s == null) continue;
            s = s.trim();
            if (s.isEmpty()) continue;
            out.add(s);
            if (out.size() >= max) break;
        }
        return out;
    }

    /**
     * Gemini HTTP response đôi khi bị decode sai charset nếu dùng BodyHandlers.ofString().
     * Đọc bytes rồi tự decode UTF-8 giúp giữ đúng JSON/text.
     */
    private String decodeHttpBodyBestEffort(HttpResponse<byte[]> response) {
        if (response == null || response.body() == null) return "";
        byte[] bytes = response.body();
        // Prefer UTF-8 regardless of headers (Gemini JSON should be UTF-8)
        String utf8 = new String(bytes, StandardCharsets.UTF_8);
        if (looksLikeJson(utf8) || containsJsonMarkers(utf8)) return utf8;

        // Fallback: if some environment returns bytes that are not UTF-8, try ISO-8859-1.
        // We still return something readable for error messages/logs.
        String latin1 = new String(bytes, Charset.forName("ISO-8859-1"));
        return (looksLikeJson(latin1) || containsJsonMarkers(latin1)) ? latin1 : utf8;
    }

    private boolean looksLikeJson(String s) {
        if (s == null) return false;
        String t = s.trim();
        return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
    }

    private boolean containsJsonMarkers(String s) {
        if (s == null) return false;
        return s.contains("\"candidates\"") || s.contains("\"content\"") || s.contains("\"parts\"") || s.contains("\"text\"");
    }

    private JsonNode locateUsageNode(JsonNode root) {
        if (root == null || root.isNull()) return null;
        JsonNode direct = root.get("usageMetadata");
        if (direct != null && !direct.isNull()) return direct;
        direct = root.get("usage");
        if (direct != null && !direct.isNull()) return direct;

        JsonNode candidates = root.get("candidates");
        if (candidates != null && candidates.isArray()) {
            for (JsonNode cand : candidates) {
                if (cand == null || cand.isNull()) continue;
                JsonNode um = cand.get("usageMetadata");
                if (um != null && !um.isNull()) return um;
                um = cand.get("usage");
                if (um != null && !um.isNull()) return um;
            }
        }
        return null;
    }

    private Integer parseIntFromUsage(JsonNode usageNode, String... fieldNames) {
        if (usageNode == null || usageNode.isNull()) return null;
        for (String f : fieldNames) {
            JsonNode v = usageNode.get(f);
            if (v == null || v.isNull()) continue;
            if (v.isInt() || v.isLong() || v.isNumber()) return v.asInt();
            if (v.isTextual()) {
                String s = v.asText();
                try {
                    return Integer.parseInt(s.trim());
                } catch (Exception ignore) {
                    // try next
                }
            }
            int x = v.asInt(-1);
            if (x >= 0) return x;
        }
        return null;
    }

    private String buildPrompt(GradeAnalysisRequest request, RiskAndStats rs, AiExecutionContext context) {
        String subjectsJson = request.getSubjects().stream()
                .filter(Objects::nonNull)
                .map(s -> "{"
                        + "\"name\":" + jsonString(s.getName()) + ","
                        + "\"score\":" + (s.getScore() == null ? "null" : s.getScore()) + ","
                        + "\"previousScore\":" + (s.getPreviousScore() == null ? "null" : s.getPreviousScore()) + ","
                        + "\"averageScore\":" + (s.getAverageScore() == null ? "null" : s.getAverageScore()) + ","
                        + "\"previousAverageScore\":" + (s.getPreviousAverageScore() == null ? "null" : s.getPreviousAverageScore())
                        + "}")
                .collect(Collectors.joining(","));

        String target = request.getTarget() == null ? "" : request.getTarget();
        String scope = context.getAnalysisScope() == null ? (request.getClassId() == null ? "GLOBAL" : "CLASS") : context.getAnalysisScope();

        List<String> under = rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects;
        int belowAverageSubjectCount = under.size();
        boolean coreSubjectsWeak = isAnyCoreSubjectWeak(under);
        List<String> topWeakSubjects = deriveTopWeakSubjects(request.getSubjects(), 3);
        List<String> suggestedPrioritySubjects = defaultPrioritySubjects(under);

        return "Bạn là AI trợ lý quản lý học thuật trong hệ thống quản trị trường học.\n"
                + "Chỉ dùng dữ liệu đầu vào, không suy diễn thêm.\n"
                + "Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không code block, không giải thích, không thêm text trước/sau JSON).\n"
                + "Schema JSON bắt buộc:\n"
                + "{"
                + "\"summary\":string,"
                + "\"trend\":\"Tăng\"|\"Giảm\"|\"Ổn định\"|\"Không đủ dữ liệu để xác định xu hướng\","
                + "\"severity\":\"LOW\"|\"MEDIUM\"|\"HIGH\"|\"CRITICAL\","
                + "\"topConcerns\":string[] (2..3),"
                + "\"prioritySubjects\":string[] (1..3),"
                + "\"recommendations\":string[] (2..3)"
                + "}\n"
                + "Nguyên tắc:\n"
                + "- Ngắn gọn, nhất quán, tiếng Việt, quản trị/điều hành được.\n"
                + "- Nếu scope=GLOBAL: chỉ nhận xét tổng quan toàn cục, tránh quá chi tiết từng môn cụ thể.\n"
                + "- Nếu scope=CLASS: có thể chi tiết theo môn.\n"
                + "- trend PHẢI đúng chính tả và đúng 1 trong 4 giá trị được phép.\n"
                + "- severity phải bám theo riskLevelFromBackend.\n"
                + "- Giọng điệu nội dung PHẢI thay đổi theo performanceLevelFromBackend:\n"
                + "  + YEU: cảnh báo + can thiệp/ưu tiên phụ đạo.\n"
                + "  + TRUNG_BINH: theo dõi + củng cố nền tảng để cải thiện.\n"
                + "  + KHA: tích cực + tiếp tục phát huy, cải thiện các phần chưa nổi bật.\n"
                + "  + GIOI: ghi nhận thành tích + duy trì và học nâng cao.\n"
                + "- mapping performanceLevelFromBackend (BẮT BUỘC) theo TBM backend: <4=YEU, <=6.5=TRUNG_BINH, <=8.0=KHA, >8=GIOI.\n"
                + "- topConcerns: 2-3 mối lo chính, tránh lặp.\n"
                + "- prioritySubjects: 1-3 môn quan trọng nhất, không liệt kê quá nhiều.\n"
                + "- recommendations: 2-3 hành động cụ thể, khả thi trong 1-2 tuần.\n"
                + "- Mọi chuỗi trong JSON KHÔNG xuống dòng (không ký tự newline literal trong chuỗi). summary gọn <= 120 ký tự; mỗi mục topConcerns/recommendations <= 60 ký tự.\n"
                + "- Ưu tiên môn cốt lõi khi liên quan: Toán, Ngữ văn, Tiếng Anh.\n"
                + "- Tránh câu chung chung kiểu “cần cố gắng hơn”.\n"
                + "Ràng buộc nhất quán (BẮT BUỘC):\n"
                + "- Backend là nguồn duy nhất cho danh sách môn dưới trung bình, riskLevel và performanceLevel.\n"
                + "- Bạn chỉ được sinh nội dung cho summary, topConcerns, prioritySubjects, recommendations.\n"
                + "- Không sinh riskLevel, không sinh underAverageSubjects.\n"
                + "- Không được tự khẳng định “không có môn dưới trung bình” nếu backend đã cung cấp danh sách môn dưới trung bình tồn tại.\n"
                + "Dữ liệu:\n"
                + "{"
                + "\"target\":" + jsonString(target) + ","
                + "\"scope\":" + jsonString(scope) + ","
                + "\"riskLevelFromBackend\":" + jsonString(rs.riskLevel) + ","
                + "\"computedTrendFromBackend\":" + jsonString(rs.trend) + ","
                + "\"performanceLevelFromBackend\":" + jsonString(rs.performanceLevel) + ","
                + "\"belowAverageSubjectCount\":" + belowAverageSubjectCount + ","
                + "\"underAverageSubjectsFromBackend\":" + jsonString(String.join(", ", under)) + ","
                + "\"topWeakSubjectsFromBackend\":" + jsonString(String.join(", ", topWeakSubjects)) + ","
                + "\"coreSubjectsWeak\":" + (coreSubjectsWeak ? "true" : "false") + ","
                + "\"suggestedPrioritySubjectsFromBackend\":" + jsonString(String.join(", ", suggestedPrioritySubjects)) + ","
                + "\"totalStudents\":" + (context.getTotalStudents() == null ? "null" : context.getTotalStudents()) + ","
                + "\"weakStudentCount\":" + (context.getWeakStudentCount() == null ? "null" : context.getWeakStudentCount()) + ","
                + "\"subjects\":[" + subjectsJson + "]"
                + "}";
    }

    private String jsonString(String s) {
        if (s == null) return "null";
        // JSON escape đơn giản
        String escaped = s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
        return "\"" + escaped + "\"";
    }

    public boolean isSubjectWeak(Double lowestScore, Double averageScore) {
        if (lowestScore == null) return false;
        return lowestScore < 5.0;
    }

    public String detectTrend(List<GradeAnalysisRequest.SubjectScore> subjects) {
        if (subjects == null || subjects.isEmpty()) return "Không đủ dữ liệu để xác định xu hướng";
        double diffSum = 0;
        int n = 0;
        for (GradeAnalysisRequest.SubjectScore s : subjects) {
            if (s == null) continue;
            Double cur = s.getScore();
            Double prev = s.getPreviousScore();
            if (cur != null && prev != null) {
                diffSum += (cur - prev);
                n++;
                continue;
            }
            Double curAvg = s.getAverageScore();
            Double prevAvg = s.getPreviousAverageScore();
            if (curAvg != null && prevAvg != null) {
                diffSum += (curAvg - prevAvg);
                n++;
            }
        }
        if (n == 0) return "Không đủ dữ liệu để xác định xu hướng";
        if (diffSum > 0.0001) return "Tăng";
        if (diffSum < -0.0001) return "Giảm";
        return "Ổn định";
    }

    public String calculateRiskLevel(Integer totalStudents, Integer weakStudentCount, List<String> underAverageSubjects) {
        int weak = weakStudentCount == null ? 0 : weakStudentCount;
        int total = totalStudents == null ? 0 : totalStudents;
        if (total > 0) {
            double ratio = weak * 1.0 / total;
            if (ratio >= 0.5) return "CRITICAL";
            if (ratio >= 0.3) return "HIGH";
        }
        boolean hasUnder = underAverageSubjects != null && !underAverageSubjects.isEmpty();
        return hasUnder ? "MEDIUM" : "LOW";
    }

    public boolean shouldNotify(String riskLevel, boolean sameSubjectBelowFiveMoreThanTwoTimes) {
        if ("HIGH".equalsIgnoreCase(riskLevel) || "CRITICAL".equalsIgnoreCase(riskLevel)) return true;
        return sameSubjectBelowFiveMoreThanTwoTimes;
    }

    private RiskAndStats calculateRiskAndStats(GradeAnalysisRequest request, AiExecutionContext context) {
        List<GradeAnalysisRequest.SubjectScore> subjects = request.getSubjects() == null ? List.of() : request.getSubjects();
        List<String> under = new ArrayList<>();
        List<Double> performanceVals = new ArrayList<>();
        for (GradeAnalysisRequest.SubjectScore s : subjects) {
            if (s == null || s.getName() == null) continue;
            if (isSubjectWeak(s.getScore(), s.getAverageScore() != null ? s.getAverageScore() : s.getScore())) {
                under.add(s.getName());
            }
            // averageScoreCandidate: prefer sent averageScore, fallback to score
            Double pv = s.getAverageScore() != null ? s.getAverageScore() : s.getScore();
            if (pv != null) performanceVals.add(pv);
        }
        under = under.stream().distinct().sorted(String::compareToIgnoreCase).collect(Collectors.toList());
        String trend = detectTrend(subjects);
        // RiskLevel theo business rules (deterministic từ input scores):
        // - HIGH nếu >=2 môn dưới trung bình OR avg score < 5.0
        // - MEDIUM nếu =1 môn dưới trung bình OR downward trend ở >=2 môn
        // - LOW nếu 0 môn dưới trung bình AND avg score >= 6.5
        Double avg = null;
        List<Double> scoreVals = new ArrayList<>();
        int downwardCnt = 0;
        for (GradeAnalysisRequest.SubjectScore s : subjects) {
            if (s == null) continue;
            if (s.getScore() != null) scoreVals.add(s.getScore());
            if (s.getScore() != null && s.getPreviousScore() != null) {
                if (s.getScore() < s.getPreviousScore()) downwardCnt++;
            }
        }
        if (!scoreVals.isEmpty()) {
            OptionalDouble od = scoreVals.stream().mapToDouble(Double::doubleValue).average();
            avg = od.isPresent() ? od.getAsDouble() : null;
        }

        int underCount = under.size();
        boolean avgBelow5 = avg != null && avg < 5.0;
        boolean avgGood = avg != null && avg >= 6.5;

        // performanceLevel based on deterministic thresholds
        Double avgForPerformance = null;
        if (!performanceVals.isEmpty()) {
            OptionalDouble odp = performanceVals.stream().mapToDouble(Double::doubleValue).average();
            avgForPerformance = odp.isPresent() ? odp.getAsDouble() : null;
        }
        // If we don't have any averageScore values, reuse avg from scoreVals.
        if (avgForPerformance == null) avgForPerformance = avg;
        String performanceLevel;
        if (avgForPerformance == null) {
            performanceLevel = "TRUNG_BINH";
        } else if (avgForPerformance < 4.0) {
            performanceLevel = "YEU";
        } else if (avgForPerformance <= 6.5) {
            performanceLevel = "TRUNG_BINH";
        } else if (avgForPerformance <= 8.0) {
            performanceLevel = "KHA";
        } else {
            performanceLevel = "GIOI";
        }

        String risk;
        if (underCount >= 2 || avgBelow5) {
            risk = "HIGH";
        } else if (underCount == 1 || downwardCnt >= 2) {
            risk = "MEDIUM";
        } else if (underCount == 0 && avgGood) {
            risk = "LOW";
        } else {
            risk = "MEDIUM";
        }
        return new RiskAndStats(risk, trend, under, performanceLevel);
    }

    private GradeAnalysisResponse parseGeminiJsonStrict(String text) {
        if (text == null || text.isBlank()) return null;
        String raw = sanitizeGeminiJsonCandidate(stripCodeFences(text));

        // STRICT endpoint still requires a JSON object, but parse is made resilient:
        // a) stripCodeFences
        // b) try objectMapper
        // c) try looseJsonMapper
        // d) extractFirstJsonObject + parse again
        // e) then return null
        try {
            JsonNode node = objectMapper.readTree(raw);
            return toGradeAnalysisResponseFromJson(node);
        } catch (Exception e1) {
            try {
                JsonNode node = looseJsonMapper.readTree(raw);
                return toGradeAnalysisResponseFromJson(node);
            } catch (Exception e2) {
                String extracted = extractFirstJsonObject(raw);
                if (extracted != null && !extracted.isBlank()) {
                    String exRaw = sanitizeGeminiJsonCandidate(extracted);
                    try {
                        JsonNode node = objectMapper.readTree(exRaw);
                        return toGradeAnalysisResponseFromJson(node);
                    } catch (Exception e3) {
                        try {
                            JsonNode node = looseJsonMapper.readTree(exRaw);
                            return toGradeAnalysisResponseFromJson(node);
                        } catch (Exception e4) {
                            logGeminiParseFailure("strict-extracted", raw, e4);
                            return null;
                        }
                    }
                }
                logGeminiParseFailure("strict", raw, e2);
                return null;
            }
        }
    }

    private GradeAnalysisResponse parseGeminiJsonLenient(String text) {
        if (text == null || text.isBlank()) return null;
        String raw = sanitizeGeminiJsonCandidate(stripCodeFences(text));
        try {
            JsonNode node = parseJsonNodeResilient(raw);
            return toGradeAnalysisResponseFromJson(node);
        } catch (Exception e) {
            logGeminiParseFailure("lenient", raw, e);
            return null;
        }
    }

    private GradeAnalysisResponse toGradeAnalysisResponseFromJson(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) return null;
        GradeAnalysisResponse r = new GradeAnalysisResponse();
        r.setSummary(node.path("summary").asText(null));
        r.setTrend(node.path("trend").asText(null));
        r.setSeverity(node.path("severity").asText(null));
        r.setTopConcerns(toStringList(node.get("topConcerns")));
        r.setPrioritySubjects(toStringList(node.get("prioritySubjects")));
        r.setRecommendations(toStringList(node.get("recommendations")));
        return r;
    }

    private String stripCodeFences(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```json", "").replaceFirst("^```", "");
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        }
        return s.trim();
    }

    /**
     * Lightweight sanitization before JSON parsing:
     * - trim
     * - remove BOM
     * - remove illegal ASCII control chars (including raw newlines/tabs) which commonly break JSON parsers
     * This does NOT rewrite structure or "fix" invalid JSON beyond removing control chars.
     */
    private String sanitizeGeminiJsonCandidate(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (!s.isEmpty() && s.charAt(0) == '\uFEFF') {
            s = s.substring(1);
        }
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= 0x00 && c <= 0x1F) {
                // Drop control chars. Raw newlines/tabs inside JSON strings are illegal and
                // frequently show up in Gemini output, breaking strict parsing.
                continue;
            }
            sb.append(c);
        }
        return sb.toString().trim();
    }

    private void logGeminiParseFailure(String mode, String raw, Exception e) {
        // Keep WARN concise but include exception for stacktrace.
        log.warn("Gemini JSON parse failed ({}). rawSample={}", mode, abbreviate(raw, 600), e);
        // Full raw is useful for diagnosing occasional invalid JSON from model.
        // Log at DEBUG to avoid flooding production logs.
        log.debug("Gemini raw text ({}): {}", mode, raw);
    }

    private JsonNode parseJsonNodeResilient(String raw) throws Exception {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ignored) {
            // continue
        }
        try {
            return looseJsonMapper.readTree(raw);
        } catch (Exception ignored) {
            // continue
        }
        String extracted = extractFirstJsonObject(raw);
        if (extracted != null) {
            try {
                return objectMapper.readTree(extracted);
            } catch (Exception ignored) {
                return looseJsonMapper.readTree(extracted);
            }
        }
        throw new IllegalArgumentException("No parseable JSON object in Gemini response");
    }

    private String extractFirstJsonObject(String text) {
        if (text == null || text.isBlank()) return null;
        int start = -1;
        int depth = 0;
        boolean inString = false;
        char prev = '\0';
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"' && prev != '\\') inString = !inString;
            if (!inString) {
                if (c == '{') {
                    if (depth == 0) start = i;
                    depth++;
                } else if (c == '}') {
                    if (depth > 0) depth--;
                    if (depth == 0 && start >= 0) {
                        return text.substring(start, i + 1);
                    }
                }
            }
            prev = c;
        }
        return null;
    }

    private List<String> toStringList(JsonNode node) {
        if (node == null || !node.isArray()) return new ArrayList<>();
        List<String> out = new ArrayList<>();
        for (JsonNode n : node) {
            if (n == null || n.isNull()) continue;
            String s = n.asText();
            if (s != null && !s.isBlank()) out.add(s.trim());
        }
        return out;
    }

    private GradeAnalysisResponse buildFallbackStructuredResponse(AiExecutionContext context, String riskLevel, String performanceLevel) {
        GradeAnalysisResponse r = new GradeAnalysisResponse();
        r.setSeverity(riskLevel);
        r.setPerformanceLevel(performanceLevel);
        r.setTopConcerns(defaultTopConcerns(riskLevel, List.of(), context));
        r.setPrioritySubjects(new ArrayList<>());
        r.setSummary(buildConsistentSummary(List.of(), List.of(), performanceLevel));
        r.setUnderAverageSubjects(new ArrayList<>());
        r.setTrend("Không đủ dữ liệu để xác định xu hướng.");
        r.setRecommendations(defaultRecommendationsByPerformanceLevel(performanceLevel));
        r.setRiskLevel(riskLevel);
        GradeAnalysisResponse.Metadata m = new GradeAnalysisResponse.Metadata();
        m.setGeneratedAt(LocalDateTime.now());
        m.setTotalStudents(context.getTotalStudents());
        m.setWeakStudentCount(context.getWeakStudentCount());
        r.setMetadata(m);
        return r;
    }

    private String buildLegacyAnalysis(GradeAnalysisResponse r) {
        String subjects = (r.getUnderAverageSubjects() == null || r.getUnderAverageSubjects().isEmpty())
                ? "Không có môn dưới trung bình"
                : String.join(", ", r.getUnderAverageSubjects());
        String rec = (r.getRecommendations() == null || r.getRecommendations().isEmpty())
                ? "Rà soát lại dữ liệu học tập"
                : String.join("; ", r.getRecommendations());
        return "Đánh giá:\n" + defaultStr(r.getSummary(), "Có dữ liệu cần được theo dõi thêm.") + "\n\n"
                + "Môn dưới trung bình:\n" + subjects + "\n\n"
                + "Xu hướng:\n" + defaultStr(r.getTrend(), "Không đủ dữ liệu để xác định xu hướng.") + "\n\n"
                + "Khuyến nghị:\n" + rec;
    }

    private String buildConsistentSummary(List<String> underAverageSubjects, List<String> prioritySubjects, String performanceLevel) {
        List<String> under = defaultList(underAverageSubjects);
        String level = performanceLevel == null ? "TRUNG_BINH" : performanceLevel;
        List<String> pri = defaultList(prioritySubjects).stream().limit(3).collect(Collectors.toList());

        boolean hasUnder = under != null && !under.isEmpty();
        String priText = pri.isEmpty() ? "" : String.join(", ", pri);
        String priOrGeneric = priText.isBlank() ? "các môn dưới trung bình" : priText;

        if ("YEU".equalsIgnoreCase(level)) {
            if (hasUnder) {
                return "Mức YẾU; cần ưu tiên can thiệp các môn dưới trung bình: " + priOrGeneric + ".";
            }
            return "Mức YẾU; cần theo dõi sát và có kế hoạch phụ đạo kịp thời.";
        }

        if ("TRUNG_BINH".equalsIgnoreCase(level)) {
            if (hasUnder) {
                return "Mức TRUNG BÌNH; tập trung củng cố nền tảng và cải thiện các môn còn dưới trung bình: " + priOrGeneric + ".";
            }
            return "Mức TRUNG BÌNH; duy trì mức điểm hiện tại và tăng luyện tập để tiến bộ rõ rệt hơn.";
        }

        if ("KHA".equalsIgnoreCase(level)) {
            if (hasUnder) {
                return "Mức KHÁ; vẫn còn các môn dưới trung bình cần cải thiện: " + priOrGeneric + ", đồng thời phát huy các môn tốt.";
            }
            return "Mức KHÁ; phát huy đà học tập tốt và tiếp tục cải thiện các phần chưa nổi bật.";
        }

        if ("GIOI".equalsIgnoreCase(level)) {
            if (hasUnder) {
                return "Mức GIỎI; duy trì thành tích nhưng cần xử lý thêm các điểm yếu nhỏ: " + priOrGeneric + ".";
            }
            return "Mức GIỎI; duy trì thành tích, học nâng cao và phát triển thêm năng lực theo chuyên sâu.";
        }

        if (!under.isEmpty()) {
            // fallback text for unknown performanceLevel
            int n = under.size();
            if (!pri.isEmpty()) {
                return "Có " + n + " môn dưới trung bình; ưu tiên xử lý: " + String.join(", ", pri) + ".";
            }
            return "Có " + n + " môn dưới trung bình; cần ưu tiên can thiệp theo kế hoạch.";
        }
        return "Không có môn dưới trung bình.";
    }

    private void sanitizeAiJsonFields(GradeAnalysisResponse parsed, RiskAndStats rs) {
        if (parsed == null) return;

        // summary: if blank -> deterministic Vietnamese summary will be applied later anyway
        if (parsed.getSummary() != null) {
            String s = parsed.getSummary().trim();
            parsed.setSummary(s.isBlank() ? null : s);
        }

        // trend: must be one of allowed values, otherwise fallback to backend deterministic trend
        String aiTrend = parsed.getTrend() == null ? "" : parsed.getTrend().trim();
        if (!isAllowedTrend(aiTrend)) {
            parsed.setTrend(rs != null ? rs.trend : null);
        } else {
            parsed.setTrend(aiTrend);
        }

        // severity: always align with backend riskLevel
        parsed.setSeverity(parsed.getRiskLevel());

        // topConcerns: 2-3 items
        List<String> concerns = defaultList(parsed.getTopConcerns()).stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .limit(3)
                .collect(Collectors.toList());
        if (concerns.size() < 2) {
            concerns = defaultTopConcerns(parsed.getRiskLevel(),
                    parsed.getUnderAverageSubjects() == null ? List.of() : parsed.getUnderAverageSubjects(),
                    null);
        }
        if (concerns.size() == 1) {
            concerns = List.of(concerns.get(0), "Cần theo dõi tiến độ theo tuần để giảm rủi ro học lực.");
        }
        parsed.setTopConcerns(concerns.stream().limit(3).collect(Collectors.toList()));

        // prioritySubjects: 1-3, prefer subset of underAverageSubjects, prioritize core subjects
        List<String> aiPri = defaultList(parsed.getPrioritySubjects()).stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .limit(3)
                .collect(Collectors.toList());
        List<String> backendPri = defaultPrioritySubjects(parsed.getUnderAverageSubjects() == null ? List.of() : parsed.getUnderAverageSubjects());
        List<String> pri = aiPri.isEmpty() ? backendPri : aiPri;
        if (parsed.getUnderAverageSubjects() != null && !parsed.getUnderAverageSubjects().isEmpty()) {
            List<String> under = parsed.getUnderAverageSubjects();
            pri = pri.stream().filter(under::contains).limit(3).collect(Collectors.toList());
            if (pri.isEmpty()) pri = backendPri;
        }
        if (pri.isEmpty()) {
            // no under-average subjects => keep empty, UI can hide
            parsed.setPrioritySubjects(new ArrayList<>());
        } else {
            parsed.setPrioritySubjects(pri.stream().limit(3).collect(Collectors.toList()));
        }

        // recommendations: trim, drop blanks, limit to 3; if empty -> defaults by risk
        List<String> recs = defaultList(parsed.getRecommendations()).stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .limit(3)
                .collect(Collectors.toList());
        if (recs.isEmpty()) {
            String perf = rs != null ? rs.performanceLevel : null;
            recs = defaultRecommendationsByPerformanceLevel(perf);
        }
        parsed.setRecommendations(recs);
    }

    private boolean isAllowedTrend(String t) {
        if (t == null) return false;
        return "Tăng".equals(t)
                || "Giảm".equals(t)
                || "Ổn định".equals(t)
                || "Không đủ dữ liệu để xác định xu hướng".equals(t);
    }

    private List<String> defaultTopConcerns(String riskLevel, List<String> underAverageSubjects, AiExecutionContext ctx) {
        int n = underAverageSubjects == null ? 0 : underAverageSubjects.size();
        boolean coreWeak = isAnyCoreSubjectWeak(underAverageSubjects == null ? List.of() : underAverageSubjects);
        List<String> out = new ArrayList<>();

        if ("CRITICAL".equalsIgnoreCase(riskLevel) || "HIGH".equalsIgnoreCase(riskLevel)) {
            out.add("Mức rủi ro học lực cao; cần can thiệp sớm trong 1-2 tuần.");
        } else if ("MEDIUM".equalsIgnoreCase(riskLevel)) {
            out.add("Có dấu hiệu cần theo dõi sát để tránh suy giảm kết quả học tập.");
        } else {
            out.add("Rủi ro thấp; duy trì theo dõi định kỳ để giữ ổn định.");
        }

        if (n > 0) {
            out.add("Có " + n + " môn dưới trung bình; nguy cơ lan rộng nếu không có kế hoạch phụ đạo.");
        } else {
            out.add("Chưa phát hiện môn dưới trung bình theo dữ liệu hiện tại.");
        }

        if (coreWeak) {
            out.add("Môn cốt lõi đang yếu (Toán/Ngữ văn/Tiếng Anh), cần ưu tiên xử lý.");
        }

        return out.stream().limit(3).collect(Collectors.toList());
    }

    private List<String> defaultPrioritySubjects(List<String> underAverageSubjects) {
        List<String> under = underAverageSubjects == null ? List.of() : underAverageSubjects;
        List<String> core = List.of("Toán", "Ngữ văn", "Tiếng Anh");
        List<String> out = new ArrayList<>();
        for (String c : core) {
            if (under.contains(c)) out.add(c);
        }
        for (String s : under) {
            if (out.size() >= 3) break;
            if (s != null && !out.contains(s)) out.add(s);
        }
        return out.stream().limit(3).collect(Collectors.toList());
    }

    private boolean isAnyCoreSubjectWeak(List<String> underAverageSubjects) {
        if (underAverageSubjects == null || underAverageSubjects.isEmpty()) return false;
        for (String s : underAverageSubjects) {
            if (s == null) continue;
            String t = s.trim();
            if ("Toán".equalsIgnoreCase(t) || "Ngữ văn".equalsIgnoreCase(t) || "Tiếng Anh".equalsIgnoreCase(t)) return true;
        }
        return false;
    }

    private List<String> deriveTopWeakSubjects(List<GradeAnalysisRequest.SubjectScore> subjects, int k) {
        if (subjects == null || subjects.isEmpty()) return List.of();
        int limit = Math.max(1, Math.min(3, k));
        return subjects.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getName() != null && !s.getName().isBlank())
                .sorted((a, b) -> {
                    Double sa = a.getScore();
                    Double sb = b.getScore();
                    if (sa == null && sb == null) return 0;
                    if (sa == null) return 1;
                    if (sb == null) return -1;
                    return Double.compare(sa, sb);
                })
                .map(s -> s.getName().trim())
                .distinct()
                .limit(limit)
                .collect(Collectors.toList());
    }

    private boolean isQuotaExceededException(Exception e) {
        if (e == null || e.getMessage() == null) return false;
        String m = e.getMessage();
        return m.contains(" 429 ") || m.contains("RESOURCE_EXHAUSTED") || m.contains("Quota exceeded");
    }

    private String buildQuotaExceededMessage(Exception e) {
        String msg = e != null ? String.valueOf(e.getMessage()) : "";
        if (msg.isBlank()) {
            return "Gemini vượt quota. Vui lòng kiểm tra billing/quota trên Google AI Studio.";
        }
        String lower = msg.toLowerCase(Locale.ROOT);
        // Free tier: giới hạn theo ngày / model — chờ vài chục giây không giải quyết được.
        if (lower.contains("generaterequestsperdayperprojectpermodel-freetier")
                || lower.contains("generate_content_free_tier_requests")) {
            String model = extractJsonStringField(msg, "model");
            String limit = extractQuotaValue(msg);
            StringBuilder sb = new StringBuilder();
            sb.append("Đã hết quota miễn phí trong ngày cho Gemini");
            if (model != null && !model.isBlank()) {
                sb.append(" (model ").append(model).append(")");
            }
            if (limit != null && !limit.isBlank()) {
                sb.append(". Giới hạn free tier: khoảng ").append(limit).append(" lần gọi/ngày/project");
            }
            sb.append(". Cách xử lý: đợi sang ngày mới (theo múi giờ quota Google), bật billing, hoặc dùng API key/project khác còn quota.");
            return sb.toString();
        }
        Long waitSec = extractRetrySeconds(msg);
        if (waitSec != null && waitSec > 0) {
            return "Gemini giới hạn tạm thời. Có thể thử lại sau khoảng " + waitSec + " giây (nếu vẫn lỗi thì đã hết quota ngày — xem billing/quota).";
        }
        return "Gemini vượt quota. Vui lòng kiểm tra billing/quota hoặc thử lại sau.";
    }

    private String extractJsonStringField(String raw, String fieldName) {
        if (raw == null || fieldName == null) return null;
        Matcher m = Pattern.compile("\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*\"([^\"]+)\"").matcher(raw);
        return m.find() ? m.group(1) : null;
    }

    private String extractQuotaValue(String raw) {
        if (raw == null) return null;
        Matcher m = Pattern.compile("\"quotaValue\"\\s*:\\s*\"([^\"]+)\"").matcher(raw);
        return m.find() ? m.group(1) : null;
    }

    private Long extractRetrySeconds(String raw) {
        if (raw == null || raw.isBlank()) return null;
        Matcher m1 = Pattern.compile("retryDelay\"\\s*:\\s*\"(\\d+)s\"").matcher(raw);
        if (m1.find()) return Long.parseLong(m1.group(1));
        Matcher m2 = Pattern.compile("Please retry in\\s+([0-9]+(?:\\.[0-9]+)?)s").matcher(raw);
        if (m2.find()) {
            double d = Double.parseDouble(m2.group(1));
            return (long) Math.ceil(d);
        }
        return null;
    }

    private boolean shouldRetry429(String rawBody) {
        if (rawBody == null || rawBody.isBlank()) return true;
        String s = rawBody.toLowerCase(Locale.ROOT);
        // Daily/project quota exhausted -> retrying immediately is useless and burns extra requests.
        if (s.contains("generaterequestsperdayperprojectpermodel-freetier")
                || s.contains("exceeded your current quota")
                || s.contains("check your plan and billing details")) {
            return false;
        }
        // Short-term throttling can be retried once.
        return s.contains("please retry in") || s.contains("retrydelay") || s.contains("resource_exhausted");
    }

    private String abbreviate(String s, int maxLen) {
        if (s == null) return null;
        if (s.length() <= maxLen) return s;
        return s.substring(0, maxLen) + "...";
    }

    private String buildCacheKey(GradeAnalysisRequest request, AiExecutionContext context) {
        try {
            String reqJson = objectMapper.writeValueAsString(request);
            String endpoint = context != null && context.getEndpoint() != null ? context.getEndpoint() : "";
            return endpoint + "|" + reqJson;
        } catch (Exception e) {
            // Fallback simple key when serialization fails
            String target = request != null ? String.valueOf(request.getTarget()) : "";
            int subjectSize = (request != null && request.getSubjects() != null) ? request.getSubjects().size() : 0;
            return "fallback|" + target + "|" + subjectSize;
        }
    }

    private GradeAnalysisResponse getFromCache(String cacheKey) {
        if (cacheKey == null || cacheKey.isBlank()) return null;
        CachedAnalysis cached = analysisCache.get(cacheKey);
        if (cached == null) return null;
        if (cached.expiresAtMs < System.currentTimeMillis()) {
            analysisCache.remove(cacheKey);
            return null;
        }
        return copyResponse(cached.response);
    }

    private void putToCache(String cacheKey, GradeAnalysisResponse response) {
        if (cacheKey == null || cacheKey.isBlank() || response == null) return;
        CachedAnalysis c = new CachedAnalysis();
        c.expiresAtMs = System.currentTimeMillis() + ANALYSIS_CACHE_TTL_MS;
        c.response = copyResponse(response);
        analysisCache.put(cacheKey, c);
    }

    private GradeAnalysisResponse copyResponse(GradeAnalysisResponse response) {
        if (response == null) return null;
        try {
            return objectMapper.readValue(objectMapper.writeValueAsBytes(response), GradeAnalysisResponse.class);
        } catch (Exception e) {
            return response;
        }
    }

    private static class CachedAnalysis {
        private GradeAnalysisResponse response;
        private long expiresAtMs;
    }

    private void logUsage(String requestId, AiExecutionContext context, GradeAnalysisResponse resp, long startedAtMs) {
        long duration = System.currentTimeMillis() - startedAtMs;
        log.info("AI_USAGE requestId={} endpoint={} schoolId={} classId={} riskLevel={} source={} aiSuccess={} aiError={} promptTokens={} responseTokens={} totalTokens={} durationMs={}",
                requestId,
                context.getEndpoint(),
                context.getSchoolId(),
                context.getClassId(),
                resp != null ? resp.getRiskLevel() : null,
                resp != null ? resp.getSource() : null,
                resp != null ? resp.getAiSuccess() : null,
                resp != null ? resp.getAiError() : null,
                resp != null ? resp.getPromptTokens() : null,
                resp != null ? resp.getResponseTokens() : null,
                resp != null ? resp.getTotalTokens() : null,
                duration);
    }

    private List<String> defaultList(List<String> in) {
        return in == null ? new ArrayList<>() : in;
    }

    private String defaultStr(String v, String def) {
        return (v == null || v.isBlank()) ? def : v;
    }

    private String normalizeTrend(String trend, List<GradeAnalysisRequest.SubjectScore> subjects) {
        if (trend == null || trend.isBlank()) return detectTrend(subjects);
        String t = trend.trim().toLowerCase(Locale.ROOT);
        if (t.contains("tăng")) return "Tăng";
        if (t.contains("giảm")) return "Giảm";
        if (t.contains("ổn")) return "Ổn định";
        if (t.contains("không đủ")) return "Không đủ dữ liệu để xác định xu hướng";
        return trend;
    }

    private List<String> defaultRecommendationsByRisk(String riskLevel) {
        if ("CRITICAL".equalsIgnoreCase(riskLevel)) {
            return List.of("Ưu tiên can thiệp các môn yếu ngay trong tuần này", "Phối hợp giáo viên bộ môn và phụ huynh theo dõi hằng tuần");
        }
        if ("HIGH".equalsIgnoreCase(riskLevel)) {
            return List.of("Tập trung phụ đạo nhóm học sinh yếu theo môn", "Theo dõi tiến độ cải thiện theo tuần");
        }
        if ("MEDIUM".equalsIgnoreCase(riskLevel)) {
            return List.of("Rà soát lại dữ liệu học tập", "Bổ sung luyện tập cho các chủ đề còn yếu");
        }
        return List.of("Duy trì kế hoạch học tập hiện tại", "Tiếp tục theo dõi định kỳ");
    }

    private List<String> defaultRecommendationsByPerformanceLevel(String performanceLevel) {
        String lvl = performanceLevel == null ? "TRUNG_BINH" : performanceLevel;
        if ("YEU".equalsIgnoreCase(lvl)) {
            return List.of(
                    "Phụ đạo trọng điểm theo môn yếu",
                    "Theo dõi sát tiến độ cải thiện theo tuần",
                    "Phối hợp phụ huynh để kiểm soát việc tự học"
            );
        }
        if ("TRUNG_BINH".equalsIgnoreCase(lvl)) {
            return List.of(
                    "Củng cố nền tảng, bù lấp lỗ hổng kiến thức cơ bản",
                    "Tăng luyện tập theo dạng bài trọng tâm",
                    "Rà soát lại sai sót sau mỗi đợt kiểm tra ngắn"
            );
        }
        if ("KHA".equalsIgnoreCase(lvl)) {
            return List.of(
                    "Phát huy các điểm mạnh và tiếp tục rèn kỹ năng còn thiếu",
                    "Cải thiện các môn/chuyên đề chưa nổi bật",
                    "Tăng bài tập vận dụng để nâng mức ổn định"
            );
        }
        // GIOI
        return List.of(
                "Duy trì thành tích hiện tại",
                "Học nâng cao và bồi dưỡng thêm theo chuyên đề",
                "Phát triển năng lực qua bài tập/đề nâng cao"
        );
    }

    private List<String> normalizeUnderAverageSubjects(List<String> aiList, List<String> backendList) {
        List<String> normalized = new ArrayList<>();
        for (String item : defaultList(aiList)) {
            if (item == null) continue;
            String s = item.trim();
            if (s.isEmpty()) continue;
            String lower = s.toLowerCase(Locale.ROOT);
            if (lower.contains("không có môn dưới trung bình")
                    || lower.contains("khong co mon duoi trung binh")
                    || lower.equals("none")
                    || lower.equals("n/a")
                    || lower.equals("null")) {
                continue;
            }
            normalized.add(s);
        }
        normalized = normalized.stream().distinct().collect(Collectors.toList());
        if (normalized.isEmpty() && backendList != null && !backendList.isEmpty()) {
            return backendList;
        }
        return normalized;
    }

    private List<String> deriveUnderAverageFromRequest(List<GradeAnalysisRequest.SubjectScore> subjects) {
        if (subjects == null || subjects.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (GradeAnalysisRequest.SubjectScore s : subjects) {
            if (s == null || s.getName() == null || s.getName().isBlank()) continue;
            Double avg = s.getAverageScore() != null ? s.getAverageScore() : s.getScore();
            if (isSubjectWeak(s.getScore(), avg)) {
                out.add(s.getName().trim());
            }
        }
        return out.stream().distinct().sorted(String::compareToIgnoreCase).collect(Collectors.toList());
    }

    private static class RiskAndStats {
        private final String riskLevel;
        private final String trend;
        private final List<String> underAverageSubjects;
        private final String performanceLevel;

        private RiskAndStats(String riskLevel, String trend, List<String> underAverageSubjects, String performanceLevel) {
            this.riskLevel = riskLevel;
            this.trend = trend;
            this.underAverageSubjects = underAverageSubjects;
            this.performanceLevel = performanceLevel;
        }
    }

    public static class AiExecutionContext {
        private String endpoint;
        private Integer schoolId;
        private Integer classId;
        private Integer totalStudents;
        private Integer weakStudentCount;
        private String analysisScope;
        private String riskLevel;

        public static AiExecutionContext forEndpoint(String endpoint) {
            AiExecutionContext c = new AiExecutionContext();
            c.endpoint = endpoint;
            return c;
        }

        public String getEndpoint() { return endpoint; }
        public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
        public Integer getSchoolId() { return schoolId; }
        public void setSchoolId(Integer schoolId) { this.schoolId = schoolId; }
        public Integer getClassId() { return classId; }
        public void setClassId(Integer classId) { this.classId = classId; }
        public Integer getTotalStudents() { return totalStudents; }
        public void setTotalStudents(Integer totalStudents) { this.totalStudents = totalStudents; }
        public Integer getWeakStudentCount() { return weakStudentCount; }
        public void setWeakStudentCount(Integer weakStudentCount) { this.weakStudentCount = weakStudentCount; }
        public String getAnalysisScope() { return analysisScope; }
        public void setAnalysisScope(String analysisScope) { this.analysisScope = analysisScope; }
        public String getRiskLevel() { return riskLevel; }
        public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    }
}

