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
    /** TTL dài hơn một chút để giảm gọi lặp Gemini (free tier dễ 429). */
    private static final long ANALYSIS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ObjectMapper looseJsonMapper = new ObjectMapper()
            .configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES.mappedFeature(), true);
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
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, "MEDIUM");
            logUsage(requestId, context, fb, startedAt);
            return fb;
        }

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            if (strictGemini) {
                throw new BadRequestException("Thiếu GEMINI_API_KEY hoặc key không hợp lệ.");
            }
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel);
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
            GradeAnalysisResponse parsed = parseGeminiStructuredJson(gemini.analysisText, context);
            if (parsed == null) {
                if (strictGemini) {
                    throw new BadRequestException("Gemini trả dữ liệu không đúng định dạng JSON mong đợi.");
                }
                GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel);
                List<String> underFromRequest = rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects;
                fb.setUnderAverageSubjects(underFromRequest);
                fb.setRiskLevel(rs.riskLevel);
                fb.setTrend(rs.trend);
                fb.setSummary(buildConsistentSummary(underFromRequest, rs.riskLevel));
                fb.setAnalysis(buildLegacyAnalysis(fb));
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
            if (parsed.getMetadata() == null) parsed.setMetadata(new GradeAnalysisResponse.Metadata());
            if (parsed.getMetadata().getGeneratedAt() == null) parsed.getMetadata().setGeneratedAt(LocalDateTime.now());
            if (context.getTotalStudents() != null) parsed.getMetadata().setTotalStudents(context.getTotalStudents());
            if (context.getWeakStudentCount() != null) parsed.getMetadata().setWeakStudentCount(context.getWeakStudentCount());

            // Deterministic business-rule fields (never trust AI)
            parsed.setTrend(rs.trend);
            parsed.setUnderAverageSubjects(rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects);

            List<String> recs = defaultList(parsed.getRecommendations());
            if (recs.isEmpty()) {
                recs = defaultRecommendationsByRisk(parsed.getRiskLevel());
            }
            parsed.setRecommendations(recs);

            // Summary must be consistent with under-average list
            parsed.setSummary(buildConsistentSummary(parsed.getUnderAverageSubjects(), parsed.getRiskLevel()));
            parsed.setAnalysis(buildLegacyAnalysis(parsed));
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
            GradeAnalysisResponse fb = buildFallbackStructuredResponse(context, rs.riskLevel);
            List<String> underFromRequest = rs.underAverageSubjects == null ? List.of() : rs.underAverageSubjects;
            fb.setUnderAverageSubjects(underFromRequest);
            fb.setRiskLevel(rs.riskLevel);
            fb.setTrend(rs.trend);
            fb.setSummary(buildConsistentSummary(underFromRequest, rs.riskLevel));
            fb.setAnalysis(buildLegacyAnalysis(fb));
            logUsage(requestId, context, fb, startedAt);
            return fb;
        }
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

    private GeminiCallResult callGemini(String prompt) throws Exception {
        if (geminiModel == null || geminiModel.isBlank()) {
            throw new IllegalArgumentException("Gemini model is empty");
        }

        String modelEnc = URLEncoder.encode(geminiModel, StandardCharsets.UTF_8);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelEnc + ":generateContent?key="
                + URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);

        // Prompt Gemini
        // generationConfig để giảm “lạc format”, temperature thấp
        String body = "{"
                + "\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":" + jsonString(prompt) + " }]}],"
                + "\"generationConfig\":{"
                + "\"temperature\":0,"
                + "\"responseMimeType\":\"application/json\","
                + "\"responseSchema\":{"
                + "\"type\":\"OBJECT\","
                + "\"required\":[\"summary\",\"trend\",\"recommendations\"],"
                + "\"properties\":{"
                + "\"summary\":{\"type\":\"STRING\"},"
                + "\"trend\":{\"type\":\"STRING\"},"
                + "\"recommendations\":{\"type\":\"ARRAY\",\"items\":{\"type\":\"STRING\"}}"
                + "}"
                + "},"
                + "\"maxOutputTokens\":512"
                + "}"
                + "}";

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 429) {
            String body429 = response.body();
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
                response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            } else {
                log.warn("Gemini returned quota-exhausted 429, skipping retry");
            }
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Gemini API error: " + response.statusCode() + " - " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());

        // Token usage (nếu Gemini trả usageMetadata)
        Integer promptTokens = null;
        Integer responseTokens = null;
        Integer totalTokens = null;
        try {
            JsonNode usage = locateUsageNode(root);
            if (usage != null && !usage.isNull()) {
                promptTokens = parseIntFromUsage(usage, "promptTokenCount", "prompt_token_count");
                responseTokens = parseIntFromUsage(usage, "candidatesTokenCount", "candidates_token_count");
                totalTokens = parseIntFromUsage(usage, "totalTokenCount", "total_token_count");

                log.debug("Gemini usage node found: {}", usage);
                log.debug("Gemini token usage parsed: promptTokens={}, responseTokens={}, totalTokens={}",
                        promptTokens, responseTokens, totalTokens);
            } else {
                log.debug("Gemini token usage missing usageMetadata/usage node");
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
        return "Bạn là AI phân tích điểm học tập trong hệ thống quản trị trường học.\n"
                + "Chỉ dùng dữ liệu đầu vào, không suy diễn thêm.\n"
                + "Trả về DUY NHẤT 1 JSON hợp lệ, không markdown, không giải thích.\n"
                + "JSON schema:\n"
                + "{"
                + "\"summary\":string,"
                + "\"trend\":string,"
                + "\"recommendations\":string[]"
                + "}\n"
                + "Nguyên tắc:\n"
                + "- Ngắn gọn, nhất quán, tiếng Việt.\n"
                + "- Nếu scope=GLOBAL: chỉ nhận xét tổng quan toàn cục, tránh quá chi tiết từng môn cụ thể.\n"
                + "- Nếu scope=CLASS: có thể chi tiết theo môn.\n"
                + "- trend dùng các giá trị: Tăng/Giảm/Ổn định/Không đủ dữ liệu để xác định xu hướng.\n"
                + "- recommendations tối đa 3 ý, ngắn.\n"
                + "Ràng buộc nhất quán (BẮT BUỘC):\n"
                + "- Backend là nguồn duy nhất cho danh sách môn dưới trung bình và riskLevel.\n"
                + "- Bạn chỉ được sinh nội dung text cho summary/trend/recommendations.\n"
                + "- Không được tự khẳng định “không có môn dưới trung bình” nếu backend đã cung cấp danh sách môn dưới trung bình tồn tại.\n"
                + "Dữ liệu:\n"
                + "{"
                + "\"target\":" + jsonString(target) + ","
                + "\"scope\":" + jsonString(scope) + ","
                + "\"riskLevelFromBackend\":" + jsonString(rs.riskLevel) + ","
                + "\"computedTrendFromBackend\":" + jsonString(rs.trend) + ","
                + "\"underAverageSubjectsFromBackend\":" + jsonString(String.join(", ", rs.underAverageSubjects)) + ","
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
        for (GradeAnalysisRequest.SubjectScore s : subjects) {
            if (s == null || s.getName() == null) continue;
            if (isSubjectWeak(s.getScore(), s.getAverageScore() != null ? s.getAverageScore() : s.getScore())) {
                under.add(s.getName());
            }
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
        return new RiskAndStats(risk, trend, under);
    }

    private GradeAnalysisResponse parseGeminiStructuredJson(String text, AiExecutionContext context) {
        if (text == null || text.isBlank()) return null;
        String raw = text.trim();
        if (raw.startsWith("```")) {
            raw = raw.replaceFirst("^```json", "").replaceFirst("^```", "");
            if (raw.endsWith("```")) raw = raw.substring(0, raw.length() - 3);
            raw = raw.trim();
        }
        try {
            JsonNode node = parseJsonNodeResilient(raw);
            GradeAnalysisResponse r = new GradeAnalysisResponse();
            r.setSummary(node.path("summary").asText(null));
            r.setTrend(node.path("trend").asText(null));
            r.setRecommendations(toStringList(node.get("recommendations")));
            return r;
        } catch (Exception e) {
            // Backward compatibility: nếu Gemini vẫn trả dạng 4 block text cũ,
            // parse lại thành cấu trúc mới thay vì rơi ngay vào fallback generic.
            GradeAnalysisResponse legacy = parseLegacyBlockText(raw);
            if (legacy != null) return legacy;
            log.warn("Gemini JSON parse failed. rawSample={}", abbreviate(raw, 600));
            return null;
        }
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

    private GradeAnalysisResponse parseLegacyBlockText(String text) {
        if (text == null || text.isBlank()) return null;
        String s = text.trim();
        if (!s.contains("Đánh giá:") || !s.contains("Môn dưới trung bình:")
                || !s.contains("Xu hướng:") || !s.contains("Khuyến nghị:")) {
            return null;
        }
        try {
            String summary = extractBlock(s, "Đánh giá:", "Môn dưới trung bình:");
            String under = extractBlock(s, "Môn dưới trung bình:", "Xu hướng:");
            String trend = extractBlock(s, "Xu hướng:", "Khuyến nghị:");
            String rec = extractBlock(s, "Khuyến nghị:", null);

            GradeAnalysisResponse r = new GradeAnalysisResponse();
            r.setSummary(summary);
            r.setTrend(trend);
            if (under == null || under.isBlank() || under.toLowerCase(Locale.ROOT).contains("không có môn dưới trung bình")) {
                r.setUnderAverageSubjects(new ArrayList<>());
            } else {
                List<String> subjects = new ArrayList<>();
                for (String part : under.split(",")) {
                    String item = part.trim();
                    if (!item.isEmpty()) {
                        // bỏ phần "(điểm)" nếu có để giữ list môn sạch
                        int idx = item.indexOf(" (");
                        subjects.add(idx > 0 ? item.substring(0, idx).trim() : item);
                    }
                }
                r.setUnderAverageSubjects(subjects);
            }

            List<String> recs = new ArrayList<>();
            if (rec != null && !rec.isBlank()) {
                for (String line : rec.split("\\n")) {
                    String item = line.replace("-", "").trim();
                    if (!item.isEmpty()) recs.add(item);
                }
            }
            r.setRecommendations(recs);
            return r;
        } catch (Exception e) {
            return null;
        }
    }

    private String extractBlock(String text, String start, String end) {
        int s = text.indexOf(start);
        if (s < 0) return "";
        s += start.length();
        int e = (end == null) ? text.length() : text.indexOf(end, s);
        if (e < 0) e = text.length();
        return text.substring(s, e).trim();
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

    private GradeAnalysisResponse buildFallbackStructuredResponse(AiExecutionContext context, String riskLevel) {
        GradeAnalysisResponse r = new GradeAnalysisResponse();
        r.setSummary(buildConsistentSummary(List.of(), riskLevel));
        r.setUnderAverageSubjects(new ArrayList<>());
        r.setTrend("Không đủ dữ liệu để xác định xu hướng.");
        r.setRecommendations(List.of("Rà soát lại dữ liệu học tập"));
        r.setRiskLevel(riskLevel);
        GradeAnalysisResponse.Metadata m = new GradeAnalysisResponse.Metadata();
        m.setGeneratedAt(LocalDateTime.now());
        m.setTotalStudents(context.getTotalStudents());
        m.setWeakStudentCount(context.getWeakStudentCount());
        r.setMetadata(m);
        r.setAnalysis(buildLegacyAnalysis(r));
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

    /**
     * Deterministic, strictly consistent summary based ONLY on backend-derived underAverageSubjects.
     * Validation requirements (case-sensitive phrases):
     * - underAverageSubjects non-empty => summary contains "subjects below average"
     * - underAverageSubjects empty     => summary contains "No subjects below average"
     */
    private String buildConsistentSummary(List<String> underAverageSubjects, String riskLevel) {
        List<String> under = defaultList(underAverageSubjects);
        if (!under.isEmpty()) {
            return "subjects below average detected: " + String.join(", ", under);
        }
        return "No subjects below average detected";
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
        log.info("AI_USAGE requestId={} endpoint={} schoolId={} classId={} riskLevel={} promptTokens={} responseTokens={} totalTokens={} durationMs={}",
                requestId,
                context.getEndpoint(),
                context.getSchoolId(),
                context.getClassId(),
                resp != null ? resp.getRiskLevel() : null,
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

        private RiskAndStats(String riskLevel, String trend, List<String> underAverageSubjects) {
            this.riskLevel = riskLevel;
            this.trend = trend;
            this.underAverageSubjects = underAverageSubjects;
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

