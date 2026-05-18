package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.IntentResult;
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
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Phân loại ý định (intent) câu hỏi tiếng Việt cho module AI hỏi đáp thông tin.
 *
 * <p><b>Hybrid NLU (KLTN):</b>
 * <ol>
 *   <li>Luồng chính: Rule-based (regex + scoring) — nhanh, không tốn quota.</li>
 *   <li>Fallback: Google Gemini "Universal Router" khi intent UNKNOWN hoặc confidence &lt; 0.52
 *       (câu biến thể, đồng nghĩa, lỗi chính tả nhẹ).</li>
 * </ol>
 * Nếu Gemini lỗi/timeout, hệ thống giữ kết quả rule-based (không làm sập luồng cũ).
 */
@Service
public class IntentParsingService {

    private static final Logger log = LoggerFactory.getLogger(IntentParsingService.class);

    /** Ngưỡng tin cậy tối thiểu của luồng regex; dưới ngưỡng → gọi Gemini. */
    private static final double CONFIDENCE_THRESHOLD = 0.52;

    /** Confidence gán cho kết quả routing từ Gemini (fallback thành công). */
    private static final double GEMINI_FALLBACK_CONFIDENCE = 0.99;

    private static final int GEMINI_INTENT_TIMEOUT_SECONDS = 25;
    private static final int GEMINI_INTENT_MAX_OUTPUT_TOKENS = 512;

    /**
     * Danh sách intent hợp lệ (tự sinh từ enum) — đưa vào prompt để Gemini chỉ chọn mã đã hỗ trợ backend.
     */
    private static final String SUPPORTED_INTENTS = Arrays.stream(AiInformationIntent.values())
            .map(Enum::name)
            .collect(Collectors.joining(", "));

    private static final Pattern CLASS_LETTER_PATTERN = Pattern.compile("\\b(\\d{2})\\s*([a-zA-Z])\\s*(\\d{1,2})\\b");
    private static final Pattern CLASS_SLASH_PATTERN = Pattern.compile("\\b(\\d{2})\\s*/\\s*(\\d{1,2})\\b");
    private static final Pattern SUBJECT_AFTER_MON_PATTERN = Pattern.compile("(?:mon|môn)\\s+([\\p{L}0-9_]+(?:\\s+[\\p{L}0-9_]+)*)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern STUDENT_NAME_PATTERN = Pattern.compile("(?:hoc\\s*sinh|học\\s*sinh|em)\\s+([\\p{L}]+(?:\\s+[\\p{L}]+){1,4})", Pattern.CASE_INSENSITIVE);
    private static final Pattern TEACHER_NAME_PATTERN = Pattern.compile("(?:giao\\s*vien|giáo\\s*viên|co|cô|thay|thầy)\\s+([\\p{L}]+(?:\\s+[\\p{L}]+){1,4})", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern STUDENT_CODE_PATTERN = Pattern.compile("\\bHS\\s*[-_]?\\s*(\\d{2,6})\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern SCHOOL_YEAR_PATTERN = Pattern.compile("\\b(20\\d{2})\\s*[-–/]\\s*(20\\d{2})\\b");
    private static final Pattern SEMESTER_PATTERN = Pattern.compile("\\b(?:hoc\\s*ky|học\\s*kỳ|hk)\\s*([12])\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TOP_N_PATTERN = Pattern.compile("\\btop\\s*(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern THRESHOLD_PATTERN = Pattern.compile("\\b(?:duoi|dưới|tren|trên)\\s*(\\d+(?:[\\.,]\\d+)?)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTH_PATTERN = Pattern.compile("\\bthang\\s*(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern WEEK_PATTERN = Pattern.compile("\\b(?:tuan|tuần)\\s*(\\d{1,2}|nay|truoc|vua\\s*roi|vừa\\s*rồi)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern DAY_OF_WEEK_PATTERN = Pattern.compile("\\bthu\\s*([2-8])\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING_PUNCTUATION = Pattern.compile("[\\p{P}\\p{S}]+$");

    private static final Map<String, String> ALIASES = new HashMap<>();
    static {
        ALIASES.put("gvcn", "giao vien chu nhiem");
        ALIASES.put("gv", "giao vien");
        ALIASES.put("tkb", "thoi khoa bieu");
        ALIASES.put("sdt", "so dien thoai");
        ALIASES.put("hk1", "hoc ky 1");
        ALIASES.put("hk2", "hoc ky 2");
        ALIASES.put("ds", "danh sach");
        ALIASES.put("tbm", "diem trung binh");
    }

    private static final List<String> ENTITY_KEYS = List.of(
            "className", "subjectName", "studentName", "teacherName", "studentCode",
            "semester", "schoolYear", "topN", "threshold", "month", "week", "dayOfWeek"
    );

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ObjectMapper looseJsonMapper = new ObjectMapper()
            .configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${GEMINI_MODEL:gemini-1.5-flash}")
    private String geminiModel;

    /**
     * Điểm vào chính: chuẩn hóa → rule-based → (tuỳ điều kiện) Gemini fallback.
     */
    public IntentResult parse(String question) {
        String preprocessed = preprocessInput(question);
        if (preprocessed.isEmpty()) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
        }

        IntentResult ruleResult = parseWithRules(preprocessed);

        if (!needsGeminiFallback(ruleResult)) {
            return ruleResult;
        }

        // --- Hybrid NLU Fallback (bước 2) ---
        log.debug("Rule-based NLU below threshold (intent={}, confidence={}), trying Gemini router",
                ruleResult.getIntent(), ruleResult.getConfidence());

        IntentResult geminiResult = parseIntentWithGemini(preprocessed);
        if (geminiResult != null
                && geminiResult.getIntent() != null
                && !AiInformationIntent.UNKNOWN.name().equals(geminiResult.getIntent())) {
            Map<String, String> merged = mergeEntities(ruleResult.getEntities(), geminiResult.getEntities());
            log.info("Gemini intent fallback succeeded: intent={}", geminiResult.getIntent());
            return new IntentResult(geminiResult.getIntent(), GEMINI_FALLBACK_CONFIDENCE, merged);
        }

        // Gemini không giúp được → giữ nguyên kết quả regex (UNKNOWN hoặc confidence thấp)
        return ruleResult;
    }

    /**
     * Chuẩn hóa đầu vào trước khi regex/Gemini: trim, gộp khoảng trắng, bỏ dấu câu cuối.
     * Không ép in thường toàn chuỗi — giữ dấu/tên riêng để regex bắt entity chính xác;
     * so khớp không phân biệt hoa thường do {@link #normalizeForMatch} khi chấm điểm intent.
     */
    public String preprocessInput(String question) {
        if (question == null) return "";
        String s = question.trim();
        s = s.replaceAll("\\s+", " ");
        s = TRAILING_PUNCTUATION.matcher(s).replaceAll("").trim();
        return s;
    }

    /**
     * Luồng rule-based gốc (regex entity extraction + intent scoring).
     */
    private IntentResult parseWithRules(String preprocessedQuestion) {
        String q = normalizeQuestion(preprocessedQuestion);
        if (q.isEmpty()) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
        }

        String rawLower = q.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(q);

        boolean hasQuantity = containsAny(norm, "bao nhieu", "may", "so luong");
        boolean hasCondition = containsAny(norm, "duoi 5", "duoi trung binh", "yeu", "can theo doi", "rui ro");

        Map<String, String> entities = extractEntities(q, rawLower, norm, hasQuantity);

        boolean hasClass = entities.containsKey("className");
        boolean hasSubject = entities.containsKey("subjectName");

        if (hasClass && hasSubject && hasQuantity && hasCondition) {
            return new IntentResult(AiInformationIntent.CLASS_SUBJECT_RISK_COUNT.name(), 0.95, entities);
        }

        ScoredIntent best = ScoredIntent.unknown();

        best = best.pick(scoreTeacherTimetable(norm, entities));
        best = best.pick(scoreHomeroomLookup(norm, entities));
        best = best.pick(scoreTeacherAssignments(norm));
        best = best.pick(scoreTeacherWorkload(norm));
        best = best.pick(scoreClassSubjectRisk(norm, entities));
        best = best.pick(scoreStudentWeakSubjects(norm, entities));
        best = best.pick(scoreClassRisk(norm, entities));
        best = best.pick(scoreClassOverview(norm, entities));
        best = best.pick(scoreStudentProfile(norm, entities));
        best = best.pick(scoreParentContact(norm, entities));
        best = best.pick(scoreStudentSubjectScore(norm, entities));
        best = best.pick(scoreStudentAverageScore(norm));
        best = best.pick(scoreStudentAttendance(norm, entities));
        best = best.pick(scoreTopStudents(norm, entities));
        best = best.pick(scoreLowestStudents(norm));
        best = best.pick(scoreStudentRank(norm));
        best = best.pick(scoreSchoolRiskOverview(norm));

        if (best.intent == AiInformationIntent.UNKNOWN || best.confidence < CONFIDENCE_THRESHOLD) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), best.confidence, entities);
        }
        return new IntentResult(best.intent.name(), best.confidence, entities);
    }

    /**
     * Gemini Universal Router: phân loại intent + trích xuất entities khi regex không đủ tin cậy.
     * Mọi lỗi (timeout, quota, JSON sai) → UNKNOWN (không ném exception ra ngoài).
     */
    public IntentResult parseIntentWithGemini(String question) {
        if (question == null || question.isBlank()) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
        }
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.debug("Gemini intent fallback skipped: missing GEMINI_API_KEY");
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
        }

        try {
            String prompt = buildGeminiRouterPrompt(question.trim());
            String responseSchema = buildIntentResponseSchema();
            String jsonText = callGeminiRouter(prompt, responseSchema);
            IntentResult parsed = mapGeminiJsonToIntentResult(jsonText);
            if (parsed != null) {
                return parsed;
            }
            log.warn("Gemini intent router returned unparseable JSON");
        } catch (Exception ex) {
            log.warn("Gemini intent fallback failed: {}", ex.toString());
        }
        return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
    }

    private boolean needsGeminiFallback(IntentResult ruleResult) {
        if (ruleResult == null) return true;
        if (AiInformationIntent.UNKNOWN.name().equals(ruleResult.getIntent())) return true;
        Double c = ruleResult.getConfidence();
        return c == null || c < CONFIDENCE_THRESHOLD;
    }

    private Map<String, String> mergeEntities(Map<String, String> ruleEntities, Map<String, String> geminiEntities) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (ruleEntities != null) merged.putAll(ruleEntities);
        if (geminiEntities != null) {
            for (Map.Entry<String, String> e : geminiEntities.entrySet()) {
                if (e.getKey() == null || e.getValue() == null) continue;
                String v = e.getValue().trim();
                if (!v.isEmpty()) merged.put(e.getKey(), v);
            }
        }
        return merged;
    }

    private Map<String, String> extractEntities(String q, String rawLower, String norm, boolean hasQuantity) {
        Map<String, String> entities = new LinkedHashMap<>();
        String className = extractClassName(q);
        if (className != null) entities.put("className", className);

        String subjectName = extractSubjectName(rawLower, norm);
        if (subjectName != null) entities.put("subjectName", subjectName);

        String studentName = (hasQuantity ? null : extractStudentName(rawLower, norm, q));
        if (studentName != null) entities.put("studentName", studentName);
        String teacherName = extractTeacherName(q);
        if (teacherName != null) entities.put("teacherName", teacherName);
        String studentCode = extractStudentCode(q);
        if (studentCode != null) entities.put("studentCode", studentCode);
        String semester = extractSemester(q);
        if (semester != null) entities.put("semester", semester);
        String schoolYear = extractSchoolYear(q);
        if (schoolYear != null) entities.put("schoolYear", schoolYear);
        String topN = extractTopN(q);
        if (topN != null) entities.put("topN", topN);
        String threshold = extractThreshold(q);
        if (threshold != null) entities.put("threshold", threshold);
        String month = extractMonth(q);
        if (month != null) entities.put("month", month);
        String week = extractWeek(q);
        if (week != null) entities.put("week", week);
        String dayOfWeek = extractDayOfWeek(q);
        if (dayOfWeek != null) entities.put("dayOfWeek", dayOfWeek);
        return entities;
    }

    private String buildGeminiRouterPrompt(String question) {
        return ""
                + "Bạn là Universal Router NLU cho hệ thống quản lý trường học phổ thông (tiếng Việt).\n"
                + "Nhiệm vụ: chọn ĐÚNG MỘT intent từ danh sách và trích xuất entities liên quan.\n"
                + "Chỉ dùng thông tin có trong câu hỏi; không bịa.\n"
                + "Nếu không khớp intent nào hoặc câu ngoài phạm vi trường học → intent = UNKNOWN.\n"
                + "\n"
                + "DANH SÁCH INTENT HỖ TRỢ (chọn nguyên mã, viết HOA):\n"
                + SUPPORTED_INTENTS + "\n"
                + "\n"
                + "Gợi ý mapping (không bắt buộc):\n"
                + "- Hỏi GVCN / chủ nhiệm lớp → HOMEROOM_LOOKUP\n"
                + "- Hỏi sĩ số / bao nhiêu học sinh lớp → CLASS_OVERVIEW hoặc ASK_CLASS_SIZE\n"
                + "- Hỏi học sinh yếu / dưới 5 theo lớp-môn → CLASS_SUBJECT_RISK_COUNT hoặc ASK_WEAK_STUDENTS_BY_CLASS_SUBJECT\n"
                + "- Hỏi môn yếu của một học sinh → STUDENT_WEAK_SUBJECTS\n"
                + "- Hỏi điểm môn / TBM / điểm danh / TKB / phân công dạy → các intent ASK_*\n"
                + "- Hỏi lớp nào cần chú ý toàn trường → SCHOOL_RISK_OVERVIEW\n"
                + "\n"
                + "ENTITIES (object, chỉ điền key có trong câu, string hoặc bỏ trống):\n"
                + "className (vd 10/2, 10A1), subjectName, studentName, teacherName, studentCode (HS123),\n"
                + "semester (1|2), schoolYear (2024-2025), topN, threshold, month, week, dayOfWeek (2-8).\n"
                + "\n"
                + "CÂU HỎI:\n"
                + question + "\n"
                + "\n"
                + "Trả về DUY NHẤT một JSON hợp lệ theo schema (không markdown).";
    }

    private String buildIntentResponseSchema() {
        StringBuilder entityProps = new StringBuilder();
        for (int i = 0; i < ENTITY_KEYS.size(); i++) {
            if (i > 0) entityProps.append(',');
            entityProps.append('"').append(ENTITY_KEYS.get(i)).append("\":{\"type\":\"STRING\"}");
        }
        return "{"
                + "\"type\":\"OBJECT\","
                + "\"required\":[\"intent\",\"entities\"],"
                + "\"properties\":{"
                + "\"intent\":{\"type\":\"STRING\"},"
                + "\"entities\":{\"type\":\"OBJECT\",\"properties\":{" + entityProps + "}}"
                + "}"
                + "}";
    }

    /**
     * Gọi Gemini generateContent — cùng pattern HttpClient như {@code GeminiGradeAnalysisService}.
     */
    private String callGeminiRouter(String prompt, String responseSchemaJson) throws Exception {
        if (geminiModel == null || geminiModel.isBlank()) {
            throw new IllegalArgumentException("Gemini model is empty");
        }

        String modelEnc = URLEncoder.encode(geminiModel, StandardCharsets.UTF_8);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelEnc + ":generateContent?key="
                + URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);

        String body = "{"
                + "\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":" + jsonString(prompt) + "}]}],"
                + "\"generationConfig\":{"
                + "\"temperature\":0,"
                + "\"responseMimeType\":\"application/json\","
                + "\"responseSchema\":" + responseSchemaJson + ","
                + "\"maxOutputTokens\":" + GEMINI_INTENT_MAX_OUTPUT_TOKENS
                + "}"
                + "}";

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(GEMINI_INTENT_TIMEOUT_SECONDS))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Gemini API error: " + response.statusCode() + " - " + decodeUtf8(response.body()));
        }

        JsonNode root = objectMapper.readTree(decodeUtf8(response.body()));
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            throw new RuntimeException("Gemini response missing candidates");
        }
        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
        if (textNode.isMissingNode() || textNode.isNull()) {
            throw new RuntimeException("Gemini response missing content.text");
        }
        return textNode.asText();
    }

    private IntentResult mapGeminiJsonToIntentResult(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) return null;

        String candidate = sanitizeJsonCandidate(stripCodeFences(rawJson).trim());
        JsonNode node = parseJsonObjectResilient(candidate);
        if (node == null || !node.isObject()) return null;

        String intentRaw = textOrNull(node.get("intent"));
        if (intentRaw == null) return null;
        String intent = intentRaw.trim().toUpperCase(Locale.ROOT);
        if (!isSupportedIntent(intent)) {
            intent = AiInformationIntent.UNKNOWN.name();
        }

        Map<String, String> entities = parseEntitiesObject(node.get("entities"));
        return new IntentResult(intent, GEMINI_FALLBACK_CONFIDENCE, entities);
    }

    private Map<String, String> parseEntitiesObject(JsonNode entitiesNode) {
        Map<String, String> out = new LinkedHashMap<>();
        if (entitiesNode == null || entitiesNode.isNull() || !entitiesNode.isObject()) {
            return out;
        }
        for (String key : ENTITY_KEYS) {
            String val = textOrNull(entitiesNode.get(key));
            if (val != null && !val.isBlank()) {
                out.put(key, val.trim());
            }
        }
        Iterator<Map.Entry<String, JsonNode>> it = entitiesNode.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            if (e.getKey() == null || out.containsKey(e.getKey())) continue;
            String val = textOrNull(e.getValue());
            if (val != null && !val.isBlank()) {
                out.put(e.getKey(), val.trim());
            }
        }
        return out;
    }

    private boolean isSupportedIntent(String intent) {
        if (intent == null || intent.isBlank()) return false;
        try {
            AiInformationIntent.valueOf(intent.trim().toUpperCase(Locale.ROOT));
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private JsonNode parseJsonObjectResilient(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ignore) {
            // continue
        }
        try {
            return looseJsonMapper.readTree(raw);
        } catch (Exception ignore) {
            // continue
        }
        String extracted = extractFirstJsonObject(raw);
        if (extracted != null) {
            try {
                return objectMapper.readTree(extracted);
            } catch (Exception ignore) {
                try {
                    return looseJsonMapper.readTree(extracted);
                } catch (Exception ignore2) {
                    return null;
                }
            }
        }
        return null;
    }

    private static String stripCodeFences(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```json", "").replaceFirst("^```", "");
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        }
        return s.trim();
    }

    private static String sanitizeJsonCandidate(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (!s.isEmpty() && s.charAt(0) == '\uFEFF') s = s.substring(1);
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= 0x00 && c <= 0x1F) continue;
            sb.append(c);
        }
        return sb.toString().trim();
    }

    private static String extractFirstJsonObject(String text) {
        if (text == null || text.isBlank()) return null;
        int depth = 0;
        int start = -1;
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
                    if (depth == 0 && start >= 0) return text.substring(start, i + 1);
                }
            }
            prev = c;
        }
        return null;
    }

    private static String textOrNull(JsonNode n) {
        if (n == null || n.isNull()) return null;
        String s = n.asText();
        return s == null ? null : s.trim();
    }

    private static String jsonString(String s) {
        if (s == null) return "null";
        String escaped = s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
        return "\"" + escaped + "\"";
    }

    private static String decodeUtf8(byte[] bytes) {
        if (bytes == null) return "";
        return new String(bytes, StandardCharsets.UTF_8);
    }

    public String normalizeQuestion(String question) {
        String q = question == null ? "" : question.trim();
        if (q.isEmpty()) return "";
        String out = " " + q + " ";
        for (Map.Entry<String, String> e : ALIASES.entrySet()) {
            out = out.replaceAll("(?i)\\b" + Pattern.quote(e.getKey()) + "\\b", e.getValue());
        }
        return out.trim();
    }

    private static ScoredIntent scoreTeacherAssignments(String norm) {
        double s = 0.0;
        if (containsAny(norm, "toi", "mình", "minh", "giao vien")) s += 0.08;
        if (containsAny(norm, "day", "giang day", "phu trach", "dang day")) s += 0.42;
        if (containsAny(norm, "lop nao", "lop gi", "nhung lop")) s += 0.25;
        if (containsAny(norm, "mon gi", "day mon", "mon nao")) s += 0.15;
        return new ScoredIntent(AiInformationIntent.TEACHER_ASSIGNMENTS, clamp01(s));
    }

    private static ScoredIntent scoreTeacherTimetable(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "thoi khoa bieu", "lich day", "tkb")) s += 0.48;
        if (containsAny(norm, "hom nay", "ngay mai", "thu")) s += 0.2;
        if (containsAny(norm, "tiet", "gio")) s += 0.15;
        if (entities.containsKey("teacherName") || containsAny(norm, "giao vien", "toi")) s += 0.12;
        return new ScoredIntent(AiInformationIntent.ASK_TEACHER_TIMETABLE, clamp01(s));
    }

    private static ScoredIntent scoreHomeroomLookup(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "gvcn", "chu nhiem", "giao vien chu nhiem")) s += 0.55;
        if (containsAny(norm, "ai la", "la ai", "do giao vien nao")) s += 0.15;
        if (entities.containsKey("className")) s += 0.25;
        return new ScoredIntent(AiInformationIntent.HOMEROOM_LOOKUP, clamp01(s));
    }

    private static ScoredIntent scoreClassOverview(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (entities.containsKey("className")) s += 0.25;
        if (containsAny(norm, "si so", "bao nhieu hoc sinh", "co may hoc sinh", "co bao nhieu hoc sinh")) s += 0.55;
        if (containsAny(norm, "bao nhieu", "may", "so luong")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.CLASS_OVERVIEW, clamp01(s));
    }

    private static ScoredIntent scoreClassRisk(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (entities.containsKey("className")) s += 0.25;
        if (containsAny(norm, "duoi 5", "duoi trung binh", "yeu", "can theo doi", "rui ro")) s += 0.5;
        if (containsAny(norm, "bao nhieu", "may", "so luong")) s += 0.15;
        if (entities.containsKey("subjectName")) s -= 0.25;
        return new ScoredIntent(AiInformationIntent.CLASS_RISK_STUDENTS_COUNT, clamp01(s));
    }

    private static ScoredIntent scoreClassSubjectRisk(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (entities.containsKey("className")) s += 0.25;
        if (entities.containsKey("subjectName")) s += 0.25;
        if (containsAny(norm, "duoi 5", "duoi trung binh", "yeu", "can theo doi", "rui ro")) s += 0.35;
        if (containsAny(norm, "mon", "môn")) s += 0.05;
        return new ScoredIntent(AiInformationIntent.CLASS_SUBJECT_RISK_COUNT, clamp01(s));
    }

    private static ScoredIntent scoreStudentWeakSubjects(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (entities.containsKey("studentName")) s += 0.35;
        if (containsAny(norm, "yeu mon nao", "mon nao yeu", "duoi trung binh mon nao", "can chu y mon nao")) s += 0.5;
        if (containsAny(norm, "duoi trung binh", "duoi 5", "yeu")) s += 0.15;
        if (entities.containsKey("className") && entities.containsKey("subjectName")) s -= 0.4;
        return new ScoredIntent(AiInformationIntent.STUDENT_WEAK_SUBJECTS, clamp01(s));
    }

    private static ScoredIntent scoreStudentProfile(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "thong tin chi tiet", "ho so", "sinh ngay", "gioi tinh")) s += 0.55;
        if (entities.containsKey("studentName") || entities.containsKey("studentCode")) s += 0.25;
        if (containsAny(norm, "hoc sinh")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_STUDENT_PROFILE, clamp01(s));
    }

    private static ScoredIntent scoreParentContact(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "so dien thoai", "sdt", "lien he")) s += 0.42;
        if (containsAny(norm, "phu huynh", "giam ho")) s += 0.35;
        if (entities.containsKey("studentName")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_PARENT_CONTACT, clamp01(s));
    }

    private static ScoredIntent scoreStudentSubjectScore(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "diem")) s += 0.35;
        if (entities.containsKey("subjectName")) s += 0.3;
        if (containsAny(norm, "hoc ky")) s += 0.1;
        if (containsAny(norm, "bao nhieu", "la bao nhieu")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_STUDENT_SUBJECT_SCORE, clamp01(s));
    }

    private static ScoredIntent scoreStudentAverageScore(String norm) {
        double s = 0.0;
        if (containsAny(norm, "diem trung binh", "tbm", "trung binh tat ca")) s += 0.75;
        if (containsAny(norm, "hoc ky")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_STUDENT_AVERAGE_SCORE, clamp01(s));
    }

    private static ScoredIntent scoreStudentAttendance(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "nghi hoc", "vang", "diem danh", "chuyen can", "khong phep")) s += 0.6;
        if (containsAny(norm, "hom nay", "thang", "tuan", "hoc ky")) s += 0.15;
        if (entities.containsKey("studentName")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_STUDENT_ATTENDANCE, clamp01(s));
    }

    private static ScoredIntent scoreTopStudents(String norm, Map<String, String> entities) {
        double s = 0.0;
        if (containsAny(norm, "top", "cao nhat", "gioi nhat", "dung dau")) s += 0.55;
        if (containsAny(norm, "hoc sinh")) s += 0.2;
        if (entities.containsKey("className")) s += 0.1;
        return new ScoredIntent(AiInformationIntent.ASK_TOP_STUDENTS_BY_CLASS, clamp01(s));
    }

    private static ScoredIntent scoreLowestStudents(String norm) {
        double s = 0.0;
        if (containsAny(norm, "thap nhat", "kem nhat", "do nhat")) s += 0.62;
        if (containsAny(norm, "hoc sinh")) s += 0.15;
        return new ScoredIntent(AiInformationIntent.ASK_LOWEST_STUDENT_BY_CLASS, clamp01(s));
    }

    private static ScoredIntent scoreStudentRank(String norm) {
        double s = 0.0;
        if (containsAny(norm, "xep hang", "dung thu may", "hang trong lop")) s += 0.72;
        return new ScoredIntent(AiInformationIntent.ASK_STUDENT_RANK_IN_CLASS, clamp01(s));
    }

    private static ScoredIntent scoreTeacherWorkload(String norm) {
        double s = 0.0;
        if (containsAny(norm, "bao nhieu tiet", "khoi luong", "bao nhieu lop")) s += 0.55;
        if (containsAny(norm, "giao vien", "toi")) s += 0.2;
        return new ScoredIntent(AiInformationIntent.ASK_TEACHER_WORKLOAD, clamp01(s));
    }

    private static ScoredIntent scoreSchoolRiskOverview(String norm) {
        double s = 0.0;
        if (containsAny(norm, "lop nao", "lop nao can chu y", "lop nao nhieu hoc sinh")) s += 0.25;
        if (containsAny(norm, "toan truong", "toan truong hoc", "toan truong")) s += 0.2;
        if (containsAny(norm, "nhieu hoc sinh yeu nhat", "can chu y nhat", "duoi trung binh nhat")) s += 0.55;
        return new ScoredIntent(AiInformationIntent.SCHOOL_RISK_OVERVIEW, clamp01(s));
    }

    private static String extractClassName(String q) {
        if (q == null || q.isBlank()) return null;

        Matcher ms = CLASS_SLASH_PATTERN.matcher(q);
        if (ms.find()) {
            String grade = ms.group(1);
            String num = ms.group(2);
            return grade + "/" + num;
        }

        Matcher ml = CLASS_LETTER_PATTERN.matcher(q);
        if (ml.find()) {
            String grade = ml.group(1);
            String letter = ml.group(2).toUpperCase(Locale.ROOT);
            String num = ml.group(3);
            return grade + letter + num;
        }
        return null;
    }

    private static String extractSubjectName(String rawLower, String norm) {
        Matcher m = SUBJECT_AFTER_MON_PATTERN.matcher(rawLower);
        if (m.find()) {
            String s = m.group(1);
            if (s != null) {
                s = s.trim();
                if (!s.isEmpty()) return s;
            }
        }
        if (containsAny(norm, "toan")) return "Toán";
        if (containsAny(norm, "van", "ngu van")) return "Ngữ văn";
        if (containsAny(norm, "anh", "tieng anh")) return "Tiếng Anh";
        if (containsAny(norm, "tin", "tin hoc", "informat")) return "Tin học";
        if (containsAny(norm, "ly", "vat ly")) return "Vật lý";
        if (containsAny(norm, "hoa", "hoa hoc")) return "Hóa học";
        if (containsAny(norm, "sinh", "sinh hoc")) return "Sinh học";
        if (containsAny(norm, "su", "lich su")) return "Lịch sử";
        if (containsAny(norm, "dia", "dia ly")) return "Địa lý";
        if (containsAny(norm, "gdcd", "giao duc cong dan")) return "GDCD";
        if (containsAny(norm, "the duc", "giao duc the chat")) return "Thể dục";
        if (containsAny(norm, "cong nghe")) return "Công nghệ";
        if (containsAny(norm, "am nhac")) return "Âm nhạc";
        if (containsAny(norm, "mi thuat", "my thuat")) return "Mĩ thuật";
        return null;
    }

    private static String extractStudentName(String rawLower, String norm, String q) {
        Matcher m = STUDENT_NAME_PATTERN.matcher(q);
        if (m.find()) {
            String name = m.group(1);
            if (name != null) {
                name = name.trim();
                String nameNorm = normalizeForMatch(name);
                if (containsAny(nameNorm, "hoc yeu", "yeu", "duoi 5", "duoi trung binh", "can theo doi", "rui ro", "mon", "tin hoc", "toan", "van")) {
                    return null;
                }
                if (containsAny(norm, "bao nhieu", "may", "so luong")) {
                    return null;
                }
                if (name.split("\\s+").length >= 2) return name;
            }
        }
        if (rawLower.contains("nguyen") || rawLower.contains("trần") || rawLower.contains("tran")) {
            return null;
        }
        return null;
    }

    private static String extractTeacherName(String q) {
        Matcher m = TEACHER_NAME_PATTERN.matcher(q);
        if (!m.find()) return null;
        String name = m.group(1);
        if (name == null) return null;
        name = name.trim();
        if (isQuestionPhrase(name)) return null;
        if (!looksLikePersonName(name)) return null;
        return name.split("\\s+").length >= 2 ? name : null;
    }

    private static String extractStudentCode(String q) {
        Matcher m = STUDENT_CODE_PATTERN.matcher(q);
        if (!m.find()) return null;
        return "HS" + m.group(1);
    }

    private static String extractSchoolYear(String q) {
        Matcher m = SCHOOL_YEAR_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1) + "-" + m.group(2);
    }

    private static String extractSemester(String q) {
        Matcher m = SEMESTER_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1);
    }

    private static String extractTopN(String q) {
        Matcher m = TOP_N_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1);
    }

    private static String extractThreshold(String q) {
        Matcher m = THRESHOLD_PATTERN.matcher(q);
        if (!m.find()) return null;
        String n = m.group(1).replace(',', '.');
        return n;
    }

    private static String extractMonth(String q) {
        Matcher m = MONTH_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1);
    }

    private static String extractWeek(String q) {
        Matcher m = WEEK_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1);
    }

    private static String extractDayOfWeek(String q) {
        Matcher m = DAY_OF_WEEK_PATTERN.matcher(q);
        if (!m.find()) return null;
        return m.group(1);
    }

    private static boolean isQuestionPhrase(String text) {
        String n = normalizeForMatch(text);
        if (n.isBlank()) return true;
        if (n.equals("ai") || n.equals("nao") || n.equals("giao vien nao")) return true;
        return n.contains(" ai ") || n.endsWith(" ai") || n.contains(" nao ") || n.endsWith(" nao")
                || n.contains("ai la giao vien") || n.contains("do giao vien nao");
    }

    private static boolean looksLikePersonName(String text) {
        String t = text == null ? "" : text.trim();
        if (t.isBlank()) return false;
        if (isQuestionPhrase(t)) return false;
        if (normalizeForMatch(t).matches(".*\\d.*")) return false;
        String[] parts = t.split("\\s+");
        if (parts.length < 2 || parts.length > 6) return false;
        for (String p : parts) {
            String n = normalizeForMatch(p);
            if (n.length() < 2) return false;
            if (containsAny(n, "giao", "vien", "co", "thay", "ai", "nao", "chu", "nhiem")) return false;
        }
        return true;
    }

    private static String normalizeForMatch(String s) {
        String x = s == null ? "" : s;
        x = x.toLowerCase(Locale.ROOT);
        x = Normalizer.normalize(x, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        x = x.replace('đ', 'd');
        x = x.replaceAll("[^a-z0-9\\s]", " ");
        x = x.replaceAll("\\s+", " ").trim();
        return x;
    }

    private static boolean containsAny(String norm, String... needles) {
        if (norm == null) return false;
        for (String n : needles) {
            if (n == null) continue;
            String nn = normalizeForMatch(n);
            if (!nn.isEmpty() && norm.contains(nn)) return true;
        }
        return false;
    }

    private static double clamp01(double v) {
        if (v < 0) return 0;
        if (v > 1) return 1;
        return v;
    }

    private static class ScoredIntent {
        private final AiInformationIntent intent;
        private final double confidence;

        private ScoredIntent(AiInformationIntent intent, double confidence) {
            this.intent = intent;
            this.confidence = confidence;
        }

        static ScoredIntent unknown() {
            return new ScoredIntent(AiInformationIntent.UNKNOWN, 0.0);
        }

        ScoredIntent pick(ScoredIntent other) {
            if (other == null) return this;
            if (other.confidence > this.confidence) return other;
            return this;
        }
    }
}
