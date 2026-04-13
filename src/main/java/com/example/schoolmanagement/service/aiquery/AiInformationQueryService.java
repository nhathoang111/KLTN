package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.AiInformationQueryRequest;
import com.example.schoolmanagement.dto.ai.query.AiInformationQueryResponse;
import com.example.schoolmanagement.dto.ai.query.IntentResult;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.repository.ParentStudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class AiInformationQueryService {

    private static final Logger log = LoggerFactory.getLogger(AiInformationQueryService.class);
    private static final double THRESHOLD = 5.0;

    @Autowired private IntentParsingService intentParsingService;
    @Autowired private EntityExtractionService entityExtractionService;
    @Autowired private AuthorizationService authorizationService;

    @Autowired private ClassInfoQueryService classInfoQueryService;
    @Autowired private StudentInfoQueryService studentInfoQueryService;
    @Autowired private TeacherAssignmentQueryService teacherAssignmentQueryService;
    @Autowired private ManagementInfoQueryService managementInfoQueryService;
    @Autowired private AiInformationReadQueryService aiInformationReadQueryService;
    @Autowired private ParentStudentRepository parentStudentRepository;

    public AiInformationQueryResponse handle(AiInformationQueryRequest req, Integer userIdHeader, String roleHeader) {
        long started = System.currentTimeMillis();
        String question = req != null ? req.getQuestion() : null;

        AiInformationQueryResponse resp = new AiInformationQueryResponse();
        try {
            AuthorizationService.AuthContext ctx = authorizationService.buildContext(userIdHeader, roleHeader);

            IntentResult intentRes = intentParsingService.parse(question);
            AiInformationIntent intent = parseIntent(intentRes.getIntent());

            Map<String, String> entitiesForNormalize = new LinkedHashMap<>();
            if (intentRes.getEntities() != null) entitiesForNormalize.putAll(intentRes.getEntities());
            entitiesForNormalize.put("_intent", intentRes.getIntent());
            EntityExtractionService.NormalizedEntities ne = entityExtractionService.normalizeEntities(ctx.getSchoolId(), entitiesForNormalize);
            Map<String, Object> entitiesOut = buildEntitiesOut(intentRes, ne);

            if (intent == AiInformationIntent.UNKNOWN) {
                resp.setIntent(AiInformationIntent.UNKNOWN.name());
                resp.setEntities(entitiesOut);
                resp.setData(null);
                resp.setAnswer("Tôi chưa hiểu rõ câu hỏi. Bạn có thể hỏi về học sinh, lớp học, môn học hoặc phân công giảng dạy.");
                resp.setSource("RULE_BASED");
                resp.setSuccess(true);
                resp.setMessage("UNKNOWN_INTENT");
                return resp;
            }

            QueryResult qr = dispatch(intent, ctx, ne, intentRes.getEntities());
            resp.setIntent(intent.name());
            resp.setEntities(entitiesOut);
            resp.setData(qr.data);
            resp.setAnswer(qr.answer);
            resp.setSource("AI+DB");
            resp.setSuccess(true);
            resp.setMessage("OK");

            long elapsed = System.currentTimeMillis() - started;
            log.info("information-query ok userId={} role={} intent={} entities={} elapsedMs={}",
                    ctx.getUserId(), ctx.getRole(), intent.name(), safeLogEntities(entitiesOut), elapsed);
            return resp;
        } catch (ForbiddenException fe) {
            resp.setIntent("FORBIDDEN");
            resp.setEntities(Map.of());
            resp.setData(null);
            resp.setAnswer("Bạn không có quyền tra cứu thông tin này.");
            resp.setSource("AUTH");
            resp.setSuccess(false);
            resp.setMessage(fe.getMessage());
            return resp;
        } catch (BadRequestException bre) {
            resp.setIntent("BAD_REQUEST");
            resp.setEntities(Map.of());
            resp.setData(null);
            resp.setAnswer(bre.getMessage());
            resp.setSource("VALIDATION");
            resp.setSuccess(false);
            resp.setMessage(bre.getMessage());
            return resp;
        } catch (Exception ex) {
            resp.setIntent("ERROR");
            resp.setEntities(Map.of());
            resp.setData(null);
            resp.setAnswer("Hệ thống đang bận hoặc có lỗi. Vui lòng thử lại.");
            resp.setSource("SYSTEM");
            resp.setSuccess(false);
            resp.setMessage(ex.getClass().getSimpleName());
            return resp;
        }
    }

    private QueryResult dispatch(AiInformationIntent intent, AuthorizationService.AuthContext ctx, EntityExtractionService.NormalizedEntities ne, Map<String, String> entities) {
        if (intent == AiInformationIntent.TEACHER_ASSIGNMENTS || intent == AiInformationIntent.ASK_TEACHER_ASSIGNMENTS) {
            if (!"TEACHER".equals(ctx.getRole())) throw new ForbiddenException("Chỉ giáo viên mới dùng truy vấn này.");
            var r = teacherAssignmentQueryService.getAssignments(ctx.getUserId());
            Map<String, Object> data = Map.of("assignments", r.getAssignments());
            String answer = r.getAssignments().isEmpty()
                    ? "Hiện chưa có phân công giảng dạy (lớp/môn) cho tài khoản này."
                    : "Bạn đang phụ trách " + r.getAssignments().size() + " lớp (theo phân công/TKB).";
            return new QueryResult(data, answer);
        }

        if (intent == AiInformationIntent.SCHOOL_RISK_OVERVIEW) {
            authorizationService.requireAdmin(ctx);
            List<Map<String, Object>> top = managementInfoQueryService.topRiskClasses(ctx.getSchoolId(), THRESHOLD, 5);
            Map<String, Object> data = Map.of("topRiskClasses", top);
            String answer = top.isEmpty()
                    ? "Chưa đủ dữ liệu điểm để xếp hạng lớp cần chú ý."
                    : "Các lớp cần chú ý nhất được xếp theo số học sinh có điểm thành phần < 5.";
            return new QueryResult(data, answer);
        }

        ClassEntity cls = ne.getClassEntity();
        Subject subj = ne.getSubject();
        User student = ne.getStudent();

        switch (intent) {
            case HOMEROOM_LOOKUP -> {
                if (cls == null) throw new BadRequestException("Thiếu tên lớp. Ví dụ: \"GVCN lớp 10A1 là ai?\"");

                Integer childId = null;
                if (isParent(ctx.getRole())) {
                    childId = resolveSingleChildInClassOrNull(ctx.getUserId(), cls.getId());
                    if (childId == null) {
                        throw new ForbiddenException("Phụ huynh cần hỏi kèm tên con (nếu có nhiều con) hoặc không có con thuộc lớp này.");
                    }
                }
                authorizationService.requireCanLookupHomeroom(ctx, cls.getId(), childId);

                String t = classInfoQueryService.homeroomTeacherName(cls);
                Map<String, Object> data = Map.of(
                        "className", cls.getName(),
                        "homeroomTeacher", t
                );
                String answer = (t == null || t.isBlank())
                        ? ("Lớp " + cls.getName() + " hiện chưa có giáo viên chủ nhiệm trong hệ thống.")
                        : ("GVCN lớp " + cls.getName() + " là " + t + ".");
                return new QueryResult(data, answer);
            }
            case CLASS_OVERVIEW -> {
                if (cls == null) throw new BadRequestException("Thiếu tên lớp. Ví dụ: \"Lớp 10A1 có bao nhiêu học sinh?\"");
                // Full-class info: admin or homeroom only
                authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                long count = classInfoQueryService.classStudentCount(cls.getId());
                Map<String, Object> data = Map.of("studentCount", count);
                return new QueryResult(data, "Lớp " + cls.getName() + " hiện có " + count + " học sinh (theo danh sách ACTIVE).");
            }
            case CLASS_RISK_STUDENTS_COUNT -> {
                if (cls == null) throw new BadRequestException("Thiếu tên lớp. Ví dụ: \"10A1 có bao nhiêu học sinh dưới 5?\"");
                // Business rule: only admin or homeroom can ask full-class risk (all subjects)
                authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                int cnt = classInfoQueryService.classRiskStudentsCount(cls.getId(), THRESHOLD);
                Map<String, Object> data = Map.of("belowFiveStudentsCount", cnt);
                return new QueryResult(data, "Lớp " + cls.getName() + " hiện có " + cnt + " học sinh có ít nhất một điểm thành phần < 5.");
            }
            case CLASS_SUBJECT_RISK_COUNT -> {
                if (cls == null) throw new BadRequestException("Thiếu tên lớp. Ví dụ: \"10A1 có mấy bạn yếu Toán?\"");
                if (subj == null) throw new BadRequestException("Thiếu môn học. Ví dụ: \"10A1 có mấy bạn yếu Toán?\"");
                authorizationService.requireCanAccessClassSubject(ctx, cls.getId(), subj.getId());
                int cnt = classInfoQueryService.classSubjectRiskStudentsCount(cls.getId(), subj.getId(), THRESHOLD);
                Map<String, Object> data = Map.of("belowFiveCount", cnt);
                return new QueryResult(data, "Lớp " + cls.getName() + " hiện có " + cnt + " học sinh có điểm thành phần < 5 ở môn " + subj.getName() + ".");
            }
            case ASK_WEAK_STUDENTS_BY_CLASS_SUBJECT -> {
                if (cls == null) throw new BadRequestException("Thiếu lớp.");
                if (subj == null) throw new BadRequestException("Thiếu môn học.");
                authorizationService.requireCanAccessClassSubject(ctx, cls.getId(), subj.getId());
                int cnt = classInfoQueryService.classSubjectRiskStudentsCount(cls.getId(), subj.getId(), THRESHOLD);
                Map<String, Object> data = Map.of("belowFiveCount", cnt);
                return new QueryResult(data, "Lớp " + cls.getName() + " có " + cnt + " học sinh dưới ngưỡng ở môn " + subj.getName() + ".");
            }
            case STUDENT_WEAK_SUBJECTS -> {
                if (student == null) throw new BadRequestException("Thiếu tên học sinh. Ví dụ: \"Học sinh Nguyễn Văn A yếu môn nào?\"");

                // Role-based scope:
                // - ADMIN: all
                // - TEACHER: only subjects they teach for that student's class-subject pairs (unless homeroom of student's class)
                // - PARENT: own child only
                // - STUDENT: self only
                Set<String> allowedPairs = null;
                if (isAdmin(ctx.getRole())) {
                    allowedPairs = null;
                } else if ("TEACHER".equals(ctx.getRole())) {
                    // If teacher is homeroom of student's active class => allow all for that class (still school-only)
                    boolean homeroom = false;
                    // We don't have explicit classId in this intent; treat as not homeroom unless we can infer via taughtPairs.
                    // Keep safe: limit to taught pairs.
                    if (!homeroom) allowedPairs = authorizationService.taughtPairs(ctx);
                } else if (isParent(ctx.getRole())) {
                    if (!authorizationService.canParentAccessStudent(ctx, student.getId())) throw new ForbiddenException("Phụ huynh chỉ được xem con của mình.");
                    allowedPairs = null;
                } else if (isStudent(ctx.getRole())) {
                    if (!authorizationService.canStudentAccessSelf(ctx, student.getId())) throw new ForbiddenException("Học sinh chỉ được xem bản thân.");
                    allowedPairs = null;
                } else {
                    throw new ForbiddenException("Không hỗ trợ quyền này.");
                }

                var r = studentInfoQueryService.weakSubjects(ctx.getSchoolId(), student.getId(), allowedPairs, THRESHOLD);
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("weakSubjects", r.getWeakSubjectNames());
                data.put("belowFiveCountBySubject", r.getBelowFiveCountBySubject());

                String answer;
                if (r.getWeakSubjectNames().isEmpty()) {
                    answer = "Chưa ghi nhận môn có điểm thành phần < 5 trong phạm vi bạn được phép tra cứu cho " + safeName(student.getFullName()) + ".";
                } else {
                    answer = safeName(student.getFullName()) + " có điểm thành phần < 5 ở: " + String.join(", ", r.getWeakSubjectNames()) + ".";
                    if ("TEACHER".equals(ctx.getRole())) {
                        answer += " (Chỉ tính trong phạm vi lớp–môn bạn đang phụ trách.)";
                    }
                }
                return new QueryResult(data, answer);
            }
            case ASK_CLASS_SIZE -> {
                if (cls == null) throw new BadRequestException("Thiếu tên lớp.");
                authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                long count = classInfoQueryService.classStudentCount(cls.getId());
                Map<String, Object> data = Map.of("studentCount", count);
                return new QueryResult(data, "Lớp " + cls.getName() + " hiện có " + count + " học sinh.");
            }
            case ASK_STUDENT_PROFILE -> {
                var p = aiInformationReadQueryService.studentProfile(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_CLASS -> {
                var p = aiInformationReadQueryService.studentClass(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_PARENT_CONTACT -> {
                var p = aiInformationReadQueryService.studentProfile(ctx, ne, entities);
                @SuppressWarnings("unchecked")
                Map<String, Object> base = new LinkedHashMap<>((Map<String, Object>) p.data());
                // Số điện thoại PH nằm ở quan hệ parent_student; lấy danh sách phụ huynh của học sinh.
                Integer studentId = base.get("studentId") instanceof Number n ? n.intValue() : null;
                if (studentId == null) throw new BadRequestException("Không xác định được học sinh để tra cứu phụ huynh.");
                List<Map<String, Object>> contacts = parentStudentRepository.findByStudentId(studentId).stream()
                        .map(ps -> ps != null ? ps.getParent() : null)
                        .filter(Objects::nonNull)
                        .map(par -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("parentId", par.getId());
                            m.put("fullName", par.getFullName());
                            m.put("phone", par.getPhone());
                            m.put("relationship", par.getRelationship());
                            return m;
                        }).toList();
                base.put("parentContacts", contacts);
                String answer = contacts.isEmpty()
                        ? "Chưa có thông tin liên hệ phụ huynh trong hệ thống."
                        : "Đã tìm thấy " + contacts.size() + " liên hệ phụ huynh.";
                return new QueryResult(base, answer);
            }
            case ASK_STUDENTS_BY_CLASS -> {
                if (cls == null) throw new BadRequestException("Thiếu lớp.");
                authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                var p = aiInformationReadQueryService.studentsByClass(ne);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_SUBJECT_SCORE -> {
                var p = aiInformationReadQueryService.studentSubjectScore(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_AVERAGE_SCORE -> {
                var p = aiInformationReadQueryService.studentAverageScore(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_ATTENDANCE -> {
                var p = aiInformationReadQueryService.studentAttendance(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_TOP_STUDENTS_BY_CLASS -> {
                if (cls == null) throw new BadRequestException("Thiếu lớp.");
                if (subj != null) authorizationService.requireCanAccessClassSubject(ctx, cls.getId(), subj.getId());
                else authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                var p = aiInformationReadQueryService.topStudentsByClass(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_LOWEST_STUDENT_BY_CLASS -> {
                if (cls == null) throw new BadRequestException("Thiếu lớp.");
                if (subj != null) authorizationService.requireCanAccessClassSubject(ctx, cls.getId(), subj.getId());
                else authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                var p = aiInformationReadQueryService.lowestStudentByClass(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_RANK_IN_CLASS -> {
                var p = aiInformationReadQueryService.studentRankInClass(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_CLASS_ATTENDANCE_OVERVIEW -> {
                if (cls == null) throw new BadRequestException("Thiếu lớp.");
                authorizationService.requireCanAccessClassFull(ctx, cls.getId());
                var p = aiInformationReadQueryService.classAttendanceOverview(ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_TIMETABLE -> {
                var p = aiInformationReadQueryService.studentTimetable(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_OVERVIEW -> {
                var p = aiInformationReadQueryService.studentOverview(ctx, ne, entities, THRESHOLD);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_SCHOOL_STATISTICS -> {
                authorizationService.requireAdmin(ctx);
                var p = aiInformationReadQueryService.schoolStatistics(ctx.getSchoolId());
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_STUDENT_PREDICTION -> {
                var p = aiInformationReadQueryService.studentPrediction(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_TEACHER_TIMETABLE -> {
                var p = aiInformationReadQueryService.teacherTimetable(ctx, ne, entities);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_TEACHER_WORKLOAD -> {
                var p = aiInformationReadQueryService.teacherWorkload(ctx, ne);
                return new QueryResult(p.data(), p.answer());
            }
            case ASK_TEACHER_PERFORMANCE_OVERVIEW -> {
                var p = aiInformationReadQueryService.teacherPerformanceOverview(ctx, ne);
                return new QueryResult(p.data(), p.answer());
            }
            default -> throw new BadRequestException("Intent chưa được hỗ trợ: " + intent.name());
        }
    }

    private static AiInformationIntent parseIntent(String s) {
        if (s == null) return AiInformationIntent.UNKNOWN;
        try {
            return AiInformationIntent.valueOf(s.trim().toUpperCase());
        } catch (Exception ignore) {
            return AiInformationIntent.UNKNOWN;
        }
    }

    private Map<String, Object> buildEntitiesOut(IntentResult ir, EntityExtractionService.NormalizedEntities ne) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (ir != null && ir.getEntities() != null) {
            for (Map.Entry<String, String> e : ir.getEntities().entrySet()) {
                if (e.getKey() != null && e.getKey().startsWith("_")) continue;
                out.put(e.getKey(), e.getValue());
            }
        }
        if (ne != null) {
            if (ne.getClassEntity() != null) out.put("classId", ne.getClassEntity().getId());
            if (ne.getSubject() != null) out.put("subjectId", ne.getSubject().getId());
            if (ne.getStudent() != null) out.put("studentId", ne.getStudent().getId());
            if (ne.getTeacher() != null) out.put("teacherId", ne.getTeacher().getId());
        }
        return out;
    }

    private Integer resolveSingleChildInClassOrNull(Integer parentId, Integer classId) {
        var links = parentStudentRepository.findByParentIdFetchStudent(parentId);
        if (links == null || links.isEmpty()) return null;
        List<Integer> candidates = links.stream()
                .map(ps -> ps != null && ps.getStudent() != null ? ps.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .filter(stuId -> authorizationService.studentInClass(stuId, classId))
                .toList();
        if (candidates.size() == 1) return candidates.get(0);
        return null;
    }

    private static String safeName(String n) {
        return n == null || n.isBlank() ? "học sinh" : n.trim();
    }

    private static boolean isAdmin(String role) {
        return role != null && role.toUpperCase().contains("ADMIN");
    }

    private static boolean isParent(String role) {
        if (role == null) return false;
        String r = role.toUpperCase();
        return r.contains("PARENT") || r.contains("PHU_HUYNH") || r.contains("PHỤ HUYNH");
    }

    private static boolean isStudent(String role) {
        if (role == null) return false;
        String r = role.toUpperCase();
        return r.contains("STUDENT") || r.contains("HỌC SINH") || r.contains("HOC SINH");
    }

    private static Object safeLogEntities(Map<String, Object> entities) {
        if (entities == null) return Map.of();
        Map<String, Object> safe = new LinkedHashMap<>(entities);
        // avoid logging full names if present
        if (safe.containsKey("studentName")) safe.put("studentName", "***");
        return safe;
    }

    private static class QueryResult {
        private final Object data;
        private final String answer;

        private QueryResult(Object data, String answer) {
            this.data = data;
            this.answer = answer;
        }
    }
}

