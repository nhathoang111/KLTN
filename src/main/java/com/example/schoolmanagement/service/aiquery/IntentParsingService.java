package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.IntentResult;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class IntentParsingService {

    // Support both formats:
    // - 10A1 (letter-based)
    // - 10/2 (slash-based, as used by current system)
    private static final Pattern CLASS_LETTER_PATTERN = Pattern.compile("\\b(\\d{2})\\s*([a-zA-Z])\\s*(\\d{1,2})\\b");
    private static final Pattern CLASS_SLASH_PATTERN = Pattern.compile("\\b(\\d{2})\\s*/\\s*(\\d{1,2})\\b");
    private static final Pattern SUBJECT_AFTER_MON_PATTERN = Pattern.compile("(?:mon|môn)\\s+([\\p{L}0-9_]+(?:\\s+[\\p{L}0-9_]+)*)", Pattern.CASE_INSENSITIVE);
    private static final Pattern STUDENT_NAME_PATTERN = Pattern.compile("(?:hoc\\s*sinh|học\\s*sinh|em)\\s+([\\p{L}]+(?:\\s+[\\p{L}]+){1,4})", Pattern.CASE_INSENSITIVE);

    public IntentResult parse(String question) {
        String q = question == null ? "" : question.trim();
        if (q.isEmpty()) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), 0.0, Map.of());
        }

        String rawLower = q.toLowerCase(Locale.ROOT);
        String norm = normalizeForMatch(q);

        boolean hasQuantity = containsAny(norm, "bao nhieu", "may", "so luong");
        boolean hasCondition = containsAny(norm, "duoi 5", "duoi trung binh", "yeu", "can theo doi", "rui ro");

        Map<String, String> entities = new LinkedHashMap<>();
        String className = extractClassName(q);
        if (className != null) entities.put("className", className);

        String subjectName = extractSubjectName(rawLower, norm);
        if (subjectName != null) entities.put("subjectName", subjectName);

        // Do NOT extract studentName from counting questions (bao nhiêu/mấy/số lượng),
        // e.g. "10/2 có bao nhiêu học sinh học yếu Tin học".
        String studentName = (hasQuantity ? null : extractStudentName(rawLower, norm, q));
        if (studentName != null) entities.put("studentName", studentName);

        boolean hasClass = entities.containsKey("className");
        boolean hasSubject = entities.containsKey("subjectName");

        // Strong rule: if question looks like "count risk students for class+subject", force that intent.
        if (hasClass && hasSubject && hasQuantity && hasCondition) {
            return new IntentResult(AiInformationIntent.CLASS_SUBJECT_RISK_COUNT.name(), 0.95, entities);
        }

        // Scoring by keywords + required entities.
        // Note: This is NOT free chat; we only map to known intents.
        ScoredIntent best = ScoredIntent.unknown();

        best = best.pick(scoreHomeroomLookup(norm, entities));
        best = best.pick(scoreTeacherAssignments(norm));
        best = best.pick(scoreClassSubjectRisk(norm, entities));
        best = best.pick(scoreStudentWeakSubjects(norm, entities));
        best = best.pick(scoreClassRisk(norm, entities));
        best = best.pick(scoreClassOverview(norm, entities));
        best = best.pick(scoreSchoolRiskOverview(norm));

        if (best.intent == AiInformationIntent.UNKNOWN || best.confidence < 0.55) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), best.confidence, entities);
        }
        return new IntentResult(best.intent.name(), best.confidence, entities);
    }

    private static ScoredIntent scoreTeacherAssignments(String norm) {
        // "Tôi đang dạy những lớp nào", "phụ trách lớp nào", "dạy môn gì ở lớp nào"
        double s = 0.0;
        if (containsAny(norm, "toi", "mình", "minh")) s += 0.08;
        if (containsAny(norm, "day", "giang day", "phu trach", "dang day")) s += 0.42;
        if (containsAny(norm, "lop nao", "lop gi", "nhung lop")) s += 0.25;
        if (containsAny(norm, "mon gi", "day mon", "mon nao")) s += 0.15;
        return new ScoredIntent(AiInformationIntent.TEACHER_ASSIGNMENTS, clamp01(s));
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
        // avoid colliding with subject risk if subject provided
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
        // If already has class + subject context, this intent is usually not the right one.
        if (entities.containsKey("className") && entities.containsKey("subjectName")) s -= 0.4;
        return new ScoredIntent(AiInformationIntent.STUDENT_WEAK_SUBJECTS, clamp01(s));
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

        // Prefer slash-form if present (matches your DB naming like 10/2)
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
        // fallback: common subjects without "môn"
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
        return null;
    }

    private static String extractStudentName(String rawLower, String norm, String q) {
        Matcher m = STUDENT_NAME_PATTERN.matcher(q);
        if (m.find()) {
            String name = m.group(1);
            if (name != null) {
                name = name.trim();
                // Reject if captured phrase is likely a condition instead of a person name.
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
        // If question starts with a name-like pattern "Nguyễn Văn A ..."
        // Keep conservative: do not guess if no keyword.
        if (rawLower.contains("nguyen") || rawLower.contains("trần") || rawLower.contains("tran")) {
            // Too risky to guess; return null and let extractor handle if explicit.
            return null;
        }
        return null;
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

