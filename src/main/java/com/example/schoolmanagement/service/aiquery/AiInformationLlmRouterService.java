package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.IntentResult;
import com.example.schoolmanagement.service.GeminiGradeAnalysisService;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class AiInformationLlmRouterService {

    private static final Logger log = LoggerFactory.getLogger(AiInformationLlmRouterService.class);

    private final ObjectMapper mapper = new ObjectMapper()
            .configure(JsonReadFeature.ALLOW_TRAILING_COMMA.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES.mappedFeature(), true)
            .configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);

    @Autowired private GeminiGradeAnalysisService geminiGradeAnalysisService;

    public IntentResult route(String question, String role) {
        AiInformationQueryPlan plan = plan(question, role);
        Map<String, String> entities = new LinkedHashMap<>();
        if (plan.getFilters() != null) entities.putAll(plan.getFilters());
        entities.put("_router", "GEMINI");
        String action = plan.getLegacyAction() == null || plan.getLegacyAction().isBlank()
                ? AiInformationIntent.UNKNOWN.name()
                : plan.getLegacyAction();
        return new IntentResult(action, plan.getConfidence(), entities);
    }

    public AiInformationQueryPlan plan(String question, String role) {
        String q = question == null ? "" : question.trim();
        if (q.isBlank()) return unknownPlan();

        try {
            String raw = geminiGradeAnalysisService.generateJson(buildPrompt(q, role), responseSchema(), 1000, 20);
            AiInformationQueryPlan parsed = parsePlan(raw);
            return parsed == null ? unknownPlan() : parsed;
        } catch (Exception e) {
            log.warn("LLM information-query router failed. reason={}", e.toString());
            return unknownPlan();
        }
    }

    private AiInformationQueryPlan unknownPlan() {
        AiInformationQueryPlan plan = new AiInformationQueryPlan();
        plan.setEntity("unknown");
        plan.setOperation("unknown");
        plan.setLegacyAction(AiInformationIntent.UNKNOWN.name());
        plan.setConfidence(0.0);
        return plan;
    }

    private IntentResult parse(String raw) throws Exception {
        if (raw == null || raw.isBlank()) return null;
        JsonNode root = mapper.readTree(stripCodeFences(raw.trim()));
        if (root == null || !root.isObject()) return null;

        String action = root.path("action").asText(root.path("intent").asText("UNKNOWN"))
                .trim()
                .toUpperCase(Locale.ROOT);
        AiInformationIntent intent;
        try {
            intent = AiInformationIntent.valueOf(action);
        } catch (Exception ignore) {
            intent = AiInformationIntent.UNKNOWN;
        }

        double confidence = root.path("confidence").isNumber() ? root.path("confidence").asDouble() : 0.7;
        Map<String, String> entities = new LinkedHashMap<>();
        JsonNode params = root.path("params");
        if (params.isMissingNode() || params.isNull()) params = root.path("entities");
        if (params.isObject()) {
            copyText(params, entities, "className");
            copyText(params, entities, "subjectName");
            copyText(params, entities, "studentName");
            copyText(params, entities, "teacherName");
            copyText(params, entities, "studentCode");
            copyText(params, entities, "semester");
            copyText(params, entities, "schoolYear");
            copyText(params, entities, "topN");
            copyText(params, entities, "threshold");
            copyText(params, entities, "month");
            copyText(params, entities, "week");
            copyText(params, entities, "dayOfWeek");
        }

        return new IntentResult(intent.name(), Math.max(0.0, Math.min(1.0, confidence)), entities);
    }

    private AiInformationQueryPlan parsePlan(String raw) throws Exception {
        if (raw == null || raw.isBlank()) return null;
        JsonNode root = mapper.readTree(stripCodeFences(raw.trim()));
        if (root == null || !root.isObject()) return null;

        AiInformationQueryPlan plan = new AiInformationQueryPlan();
        plan.setEntity(root.path("entity").asText("unknown").trim().toLowerCase(Locale.ROOT));
        plan.setOperation(root.path("operation").asText("unknown").trim().toLowerCase(Locale.ROOT));
        plan.setLegacyAction(root.path("legacyAction").asText(root.path("action").asText("UNKNOWN")).trim().toUpperCase(Locale.ROOT));
        plan.setConfidence(root.path("confidence").isNumber() ? root.path("confidence").asDouble() : 0.7);

        Map<String, String> filters = new LinkedHashMap<>();
        JsonNode filterNode = root.path("filters");
        if (filterNode.isMissingNode() || filterNode.isNull()) filterNode = root.path("params");
        if (filterNode.isObject()) {
            copyText(filterNode, filters, "className");
            copyText(filterNode, filters, "subjectName");
            copyText(filterNode, filters, "studentName");
            copyText(filterNode, filters, "teacherName");
            copyText(filterNode, filters, "studentCode");
            copyText(filterNode, filters, "semester");
            copyText(filterNode, filters, "schoolYear");
            copyText(filterNode, filters, "topN");
            copyText(filterNode, filters, "threshold");
            copyText(filterNode, filters, "month");
            copyText(filterNode, filters, "week");
            copyText(filterNode, filters, "dayOfWeek");
            copyText(filterNode, filters, "status");
        }
        plan.setFilters(filters);
        return plan;
    }

    private static void copyText(JsonNode source, Map<String, String> out, String key) {
        JsonNode v = source.path(key);
        if (v.isMissingNode() || v.isNull()) return;
        String s = v.asText(null);
        if (s != null && !s.trim().isBlank()) out.put(key, s.trim());
    }

    private String buildPrompt(String question, String role) {
        return """
                Ban la bo dinh tuyen cau hoi cho he thong quan ly truong hoc.
                Chi tra ve JSON theo schema. Khong giai thich.

                Vai tro nguoi hoi: %s

                Tra ve mot query plan an toan. Neu query plan khong du de tra loi, dien legacyAction gan nhat.

                Entity hop le: school, class, student, teacher, parent, score, attendance, schedule, unknown.
                Operation hop le: count, list, summary, get, average, min, max, rank, unknown.

                Vi du:
                - "hien dang co bao nhieu lop" => entity=class, operation=count, filters={}, legacyAction=ASK_SCHOOL_STATISTICS.
                - "co bao nhieu hoc sinh" => entity=student, operation=count, filters={}, legacyAction=ASK_SCHOOL_STATISTICS.
                - "co bao nhieu giao vien" => entity=teacher, operation=count, filters={}, legacyAction=ASK_SCHOOL_STATISTICS.
                - "lop 10A1 co bao nhieu hoc sinh" => entity=student, operation=count, filters={className:"10A1"}, legacyAction=ASK_CLASS_SIZE.
                - "danh sach hoc sinh lop 10A1" => entity=student, operation=list, filters={className:"10A1"}, legacyAction=ASK_STUDENTS_BY_CLASS.

                Legacy action hop le:
                - ASK_SCHOOL_STATISTICS: thong ke toan truong, tong so hoc sinh/giao vien/lop.
                - SCHOOL_RISK_OVERVIEW: lop nao can chu y/rui ro/nhieu hoc sinh yeu nhat trong truong.
                - HOMEROOM_LOOKUP: hoi GVCN cua mot lop cu the. Can className.
                - CLASS_OVERVIEW hoac ASK_CLASS_SIZE: hoi si so/tong quan mot lop. Can className.
                - ASK_STUDENTS_BY_CLASS: hoi danh sach hoc sinh cua lop. Can className.
                - CLASS_RISK_STUDENTS_COUNT: hoi mot lop co bao nhieu hoc sinh yeu/duoi 5 noi chung. Can className.
                - CLASS_SUBJECT_RISK_COUNT: hoi mot lop co bao nhieu hoc sinh yeu/duoi 5 theo mon. Can className, subjectName.
                - ASK_TOP_STUDENTS_BY_CLASS: hoi top/cao nhat/gioi nhat trong lop. Can className, co the co subjectName/topN.
                - ASK_LOWEST_STUDENT_BY_CLASS: hoi hoc sinh thap diem/kem nhat trong lop. Can className, co the co subjectName.
                - ASK_CLASS_ATTENDANCE_OVERVIEW: hoi diem danh/chuyen can/nghi/vang cua lop. Can className.
                - ASK_STUDENT_PROFILE: hoi ho so/thong tin ca nhan hoc sinh. Can studentName hoac studentCode, tru khi role STUDENT.
                - ASK_STUDENT_CLASS: hoi hoc sinh dang hoc lop nao. Can studentName/studentCode, tru khi role STUDENT/PARENT co mot con.
                - ASK_PARENT_CONTACT: hoi lien he/SDT phu huynh cua hoc sinh. Can studentName/studentCode.
                - ASK_STUDENT_SUBJECT_SCORE: hoi diem hoc sinh theo mon. Can subjectName, can studentName/studentCode neu khong phai STUDENT.
                - ASK_STUDENT_AVERAGE_SCORE: hoi diem trung binh hoc sinh. Can studentName/studentCode neu khong phai STUDENT.
                - STUDENT_WEAK_SUBJECTS: hoi hoc sinh yeu/can chu y mon nao. Can studentName/studentCode neu khong phai STUDENT.
                - ASK_STUDENT_ATTENDANCE: hoi nghi hoc/vang/diem danh hoc sinh.
                - ASK_STUDENT_TIMETABLE: hoi thoi khoa bieu/lich hoc hoc sinh.
                - ASK_STUDENT_OVERVIEW: hoi tong quan/nhan xet tinh hinh hoc tap hoc sinh.
                - ASK_STUDENT_PREDICTION: hoi du bao/rui ro hoc tap hoc sinh.
                - ASK_STUDENT_RANK_IN_CLASS: hoi xep hang hoc sinh trong lop.
                - ASK_TEACHER_ASSIGNMENTS: giao vien hoi minh day/phu trach lop nao.
                - ASK_TEACHER_HOMEROOM_CLASSES: giao vien hoi minh chu nhiem lop nao.
                - ASK_TEACHER_TIMETABLE: hoi lich day/thoi khoa bieu giao vien.
                - ASK_TEACHER_WORKLOAD: hoi so tiet/so lop/khoi luong giang day.
                - ASK_TEACHER_PERFORMANCE_OVERVIEW: hoi tong quan cac lop giao vien phu trach.
                - UNKNOWN: neu cau hoi khong lien quan du lieu truong hoc hoac khong the xac dinh action.

                Quy tac:
                - legacyAction phai dung ten enum o tren.
                - filters chi gom cac key neu co trong cau hoi: className, subjectName, studentName, teacherName, studentCode, semester, schoolYear, topN, threshold, month, week, dayOfWeek, status.
                - className giu dung dang cau hoi, vi du 10A1 hoac 10/2.
                - subjectName viet ten mon tieng Viet tu nhien, vi du Toan, Ngu van, Tieng Anh.
                - semester chi la "1" hoac "2" neu co HK1/HK2/hoc ky 1/2.
                - dayOfWeek la so 2-8 neu hoi thu trong tuan.
                - Neu hoi dem so luong mot loai du lieu, dung operation=count va entity tuong ung.
                - Neu role ADMIN/SUPER_ADMIN va hoi toan truong, legacyAction uu tien ASK_SCHOOL_STATISTICS hoac SCHOOL_RISK_OVERVIEW.
                - Neu role TEACHER hoi "toi dang chu nhiem lop nao", chon ASK_TEACHER_HOMEROOM_CLASSES.

                Cau hoi: %s
                """.formatted(role == null || role.isBlank() ? "UNKNOWN" : role, question);
    }

    private String responseSchema() {
        return "{"
                + "\"type\":\"OBJECT\","
                + "\"required\":[\"entity\",\"operation\",\"filters\",\"legacyAction\",\"confidence\"],"
                + "\"properties\":{"
                + "\"entity\":{\"type\":\"STRING\",\"enum\":[\"school\",\"class\",\"student\",\"teacher\",\"parent\",\"score\",\"attendance\",\"schedule\",\"unknown\"]},"
                + "\"operation\":{\"type\":\"STRING\",\"enum\":[\"count\",\"list\",\"summary\",\"get\",\"average\",\"min\",\"max\",\"rank\",\"unknown\"]},"
                + "\"legacyAction\":{\"type\":\"STRING\",\"enum\":["
                + "\"ASK_STUDENT_PROFILE\",\"ASK_STUDENT_CLASS\",\"ASK_PARENT_CONTACT\",\"ASK_STUDENTS_BY_CLASS\","
                + "\"ASK_CLASS_SIZE\",\"ASK_STUDENT_SUBJECT_SCORE\",\"ASK_STUDENT_AVERAGE_SCORE\","
                + "\"ASK_WEAK_STUDENTS_BY_CLASS_SUBJECT\",\"ASK_TOP_STUDENTS_BY_CLASS\",\"ASK_LOWEST_STUDENT_BY_CLASS\","
                + "\"ASK_STUDENT_RANK_IN_CLASS\",\"ASK_STUDENT_ATTENDANCE\",\"ASK_CLASS_ATTENDANCE_OVERVIEW\","
                + "\"ASK_STUDENT_TIMETABLE\",\"ASK_STUDENT_OVERVIEW\",\"ASK_SCHOOL_STATISTICS\",\"ASK_STUDENT_PREDICTION\","
                + "\"ASK_TEACHER_ASSIGNMENTS\",\"ASK_TEACHER_HOMEROOM_CLASSES\",\"ASK_TEACHER_TIMETABLE\","
                + "\"ASK_TEACHER_WORKLOAD\",\"ASK_TEACHER_PERFORMANCE_OVERVIEW\","
                + "\"CLASS_OVERVIEW\",\"CLASS_RISK_STUDENTS_COUNT\",\"CLASS_SUBJECT_RISK_COUNT\","
                + "\"STUDENT_WEAK_SUBJECTS\",\"TEACHER_ASSIGNMENTS\",\"HOMEROOM_LOOKUP\",\"SCHOOL_RISK_OVERVIEW\",\"UNKNOWN\"]},"
                + "\"confidence\":{\"type\":\"NUMBER\"},"
                + "\"filters\":{\"type\":\"OBJECT\",\"properties\":{"
                + "\"className\":{\"type\":\"STRING\"},\"subjectName\":{\"type\":\"STRING\"},"
                + "\"studentName\":{\"type\":\"STRING\"},\"teacherName\":{\"type\":\"STRING\"},"
                + "\"studentCode\":{\"type\":\"STRING\"},\"semester\":{\"type\":\"STRING\"},"
                + "\"schoolYear\":{\"type\":\"STRING\"},\"topN\":{\"type\":\"STRING\"},"
                + "\"threshold\":{\"type\":\"STRING\"},\"month\":{\"type\":\"STRING\"},"
                + "\"week\":{\"type\":\"STRING\"},\"dayOfWeek\":{\"type\":\"STRING\"},\"status\":{\"type\":\"STRING\"}"
                + "}}"
                + "}"
                + "}";
    }

    private static String stripCodeFences(String text) {
        String s = text == null ? "" : text.trim();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```(?:json)?\\s*", "");
            s = s.replaceFirst("\\s*```$", "");
        }
        return s.trim();
    }
}
