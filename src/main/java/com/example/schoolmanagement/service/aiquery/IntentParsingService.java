package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.IntentResult;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class IntentParsingService {

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

    public IntentResult parse(String question) {
        String q = normalizeQuestion(question);
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

        if (best.intent == AiInformationIntent.UNKNOWN || best.confidence < 0.52) {
            return new IntentResult(AiInformationIntent.UNKNOWN.name(), best.confidence, entities);
        }
        return new IntentResult(best.intent.name(), best.confidence, entities);
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

