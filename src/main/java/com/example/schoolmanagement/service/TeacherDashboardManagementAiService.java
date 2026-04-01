package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.ai.TeacherManagementSummaryResponse;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeacherDashboardManagementAiService {

    private static final String SOURCE_GEMINI = "GEMINI";
    private static final String SOURCE_LOCAL = "LOCAL_FALLBACK";

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClassRepository classRepository;
    @Autowired
    private ScheduleRepository scheduleRepository;
    @Autowired
    private ClassSectionRepository classSectionRepository;
    @Autowired
    private EnrollmentRepository enrollmentRepository;
    @Autowired
    private ExamScoreRepository examScoreRepository;
    @Autowired
    private GeminiGradeAnalysisService geminiGradeAnalysisService;

    public TeacherManagementSummaryResponse buildManagementSummary(Integer teacherUserId, String requesterRoleHeader) {
        if (teacherUserId == null) {
            throw new BadRequestException("Thiếu X-User-Id.");
        }
        User teacher = userRepository.findById(teacherUserId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng."));
        String role = normalizeRole(requesterRoleHeader);
        if (!"TEACHER".equals(role)) {
            throw new ForbiddenException("Chỉ giáo viên mới dùng tổng quan quản lý này.");
        }
        if (!teacher.getId().equals(teacherUserId)) {
            throw new ForbiddenException("Không khớp tài khoản.");
        }
        Integer schoolId = teacher.getSchool() != null ? teacher.getSchool().getId() : null;
        if (schoolId == null) {
            throw new BadRequestException("Giáo viên chưa gắn trường.");
        }

        Set<Integer> classIds = new LinkedHashSet<>();
        Map<Integer, String> classIdToName = new HashMap<>();

        for (ClassEntity c : classRepository.findByHomeroomTeacherId(teacherUserId)) {
            if (c != null && c.getId() != null) {
                classIds.add(c.getId());
                classIdToName.put(c.getId(), safeName(c.getName(), "Lớp " + c.getId()));
            }
        }
        for (Schedule sch : scheduleRepository.findByTeacherId(teacherUserId)) {
            if (sch.getClassEntity() != null && sch.getClassEntity().getId() != null) {
                int cid = sch.getClassEntity().getId();
                classIds.add(cid);
                classIdToName.putIfAbsent(cid, safeName(sch.getClassEntity().getName(), "Lớp " + cid));
            }
        }
        for (ClassSection cs : classSectionRepository.findByTeacherIdFetchAll(teacherUserId)) {
            if (cs.getClassRoom() != null && cs.getClassRoom().getId() != null) {
                int cid = cs.getClassRoom().getId();
                classIds.add(cid);
                classIdToName.putIfAbsent(cid, safeName(cs.getClassRoom().getName(), "Lớp " + cid));
            }
        }

        Set<String> taughtPairs = new HashSet<>();
        for (Schedule sch : scheduleRepository.findByTeacherId(teacherUserId)) {
            Integer cid = sch.getClassEntity() != null ? sch.getClassEntity().getId() : null;
            Integer sid = sch.getSubject() != null ? sch.getSubject().getId() : null;
            if (cid != null && sid != null) {
                taughtPairs.add(cid + "-" + sid);
            }
        }
        for (ClassSection cs : classSectionRepository.findByTeacherIdFetchAll(teacherUserId)) {
            Integer cid = cs.getClassRoom() != null ? cs.getClassRoom().getId() : null;
            Integer sid = cs.getSubject() != null ? cs.getSubject().getId() : null;
            if (cid != null && sid != null) {
                taughtPairs.add(cid + "-" + sid);
            }
        }

        Set<Integer> studentIds = new LinkedHashSet<>();
        for (Integer cid : classIds) {
            List<Enrollment> enr = enrollmentRepository.findActiveEnrollmentsByClassId(cid);
            for (Enrollment e : enr) {
                if (e.getStudent() != null && e.getStudent().getId() != null) {
                    studentIds.add(e.getStudent().getId());
                }
            }
        }

        List<ExamScore> inScope = new ArrayList<>();
        List<ExamScore> allSchool = examScoreRepository.findBySchoolId(schoolId);
        if (allSchool != null) {
            for (ExamScore es : allSchool) {
                if (es == null) continue;
                String st = es.getStatus() == null ? "ACTIVE" : es.getStatus();
                if (!"ACTIVE".equalsIgnoreCase(st)) continue;
                if (es.getStudent() == null || es.getClassEntity() == null || es.getSubject() == null) continue;
                int cid = es.getClassEntity().getId();
                int sid = es.getSubject().getId();
                if (!classIds.contains(cid)) continue;
                if (!taughtPairs.contains(cid + "-" + sid)) continue;
                inScope.add(es);
            }
        }

        final double weakThreshold = 5.0;
        Set<Integer> needsAttentionStudents = new HashSet<>();
        Map<Integer, Set<Integer>> weakStudentsBySubjectId = new HashMap<>();
        Map<Integer, Set<Integer>> weakStudentsByClassId = new HashMap<>();
        Map<Integer, String> subjectIdToName = new HashMap<>();

        for (ExamScore es : inScope) {
            if (es.getScore() == null || Double.isNaN(es.getScore())) continue;
            int stuId = es.getStudent().getId();
            int cid = es.getClassEntity().getId();
            int subId = es.getSubject().getId();
            subjectIdToName.put(subId, safeName(es.getSubject().getName(), "Môn " + subId));
            if (es.getScore() < weakThreshold) {
                needsAttentionStudents.add(stuId);
                weakStudentsBySubjectId.computeIfAbsent(subId, k -> new HashSet<>()).add(stuId);
                weakStudentsByClassId.computeIfAbsent(cid, k -> new HashSet<>()).add(stuId);
            }
        }

        List<String> keyRiskSubjects = rankSubjects(weakStudentsBySubjectId, subjectIdToName, 5);
        List<String> keyConcernClasses = rankClasses(weakStudentsByClassId, classIdToName, 5);

        int classesAnalyzed = classIds.size();
        int studentsAnalyzed = studentIds.size();
        int needCnt = needsAttentionStudents.size();

        String managementLevel = computeManagementLevel(studentsAnalyzed, needCnt);

        String prompt = buildManagementPrompt(
                teacher.getFullName(),
                classesAnalyzed,
                studentsAnalyzed,
                needCnt,
                managementLevel,
                keyRiskSubjects,
                keyConcernClasses,
                taughtPairs.isEmpty()
        );

        GeminiGradeAnalysisService.AiExecutionContext ctx =
                GeminiGradeAnalysisService.AiExecutionContext.forEndpoint("/api/ai/teacher-management-summary");
        ctx.setSchoolId(schoolId);
        ctx.setAnalysisScope("TEACHER_DASHBOARD_MANAGEMENT");

        TeacherManagementSummaryResponse out = new TeacherManagementSummaryResponse();
        out.setClassesAnalyzedCount(classesAnalyzed);
        out.setStudentsAnalyzedCount(studentsAnalyzed);
        out.setStudentsNeedAttentionCount(needCnt);
        out.setManagementLevel(managementLevel);
        out.setKeyRiskSubjects(keyRiskSubjects);
        out.setKeyConcernClasses(keyConcernClasses);

        List<String> concerns = defaultTopConcerns(managementLevel, needCnt, keyRiskSubjects, keyConcernClasses);
        List<String> recs = defaultRecommendations(managementLevel, needCnt, taughtPairs.isEmpty());

        try {
            GeminiGradeAnalysisService.StudentSubjectAiFields ai =
                    geminiGradeAnalysisService.generateStudentSubjectAiFields(prompt, ctx);
            out.setSource(SOURCE_GEMINI);
            out.setAiSuccess(true);
            out.setAiError(null);
            String sum = ai.getSummary() != null ? ai.getSummary().trim() : "";
            if (sum.isEmpty()) {
                sum = deterministicSummary(teacher.getFullName(), managementLevel, classesAnalyzed, studentsAnalyzed, needCnt, taughtPairs.isEmpty());
            } else {
                sum = sanitizeOpeningSummary(sum, needCnt);
            }
            out.setSummary(sum);
            List<String> c = cleanList(ai.getTopConcerns(), 3);
            out.setTopConcerns(c.size() >= 2 ? c : concerns);
            List<String> r = cleanList(ai.getRecommendations(), 3);
            out.setRecommendations(r.isEmpty() ? recs : r);
        } catch (Exception ex) {
            out.setSource(SOURCE_LOCAL);
            out.setAiSuccess(false);
            out.setAiError(shortError(ex));
            out.setSummary(deterministicSummary(teacher.getFullName(), managementLevel, classesAnalyzed, studentsAnalyzed, needCnt, taughtPairs.isEmpty()));
            out.setTopConcerns(concerns);
            out.setRecommendations(recs);
        }

        if (out.getTopConcerns() == null || out.getTopConcerns().size() < 2) {
            out.setTopConcerns(concerns);
        }
        if (out.getRecommendations() == null || out.getRecommendations().isEmpty()) {
            out.setRecommendations(recs);
        }

        return out;
    }

    private static String shortError(Throwable ex) {
        if (ex == null) return "GEMINI_ERROR";
        String m = ex.getMessage();
        if (m == null || m.isBlank()) return ex.getClass().getSimpleName();
        return m.length() > 120 ? m.substring(0, 117) + "..." : m;
    }

    /** Nếu Gemini lệch sang nhãn học lực kiểu cá nhân, bỏ qua để dùng tóm tắt deterministic. */
    private static String sanitizeOpeningSummary(String summary, int needCnt) {
        if (summary == null) return "";
        String s = summary.trim();
        String lower = s.toLowerCase(Locale.ROOT);
        if (lower.startsWith("mức yếu")) {
            return "";
        }
        if (lower.contains("học sinh yếu") && needCnt == 0) {
            return "";
        }
        if (lower.contains("performancelevel")) {
            return "";
        }
        return s;
    }

    private static String computeManagementLevel(int studentsAnalyzed, int needsAttention) {
        if (studentsAnalyzed <= 0) {
            return needsAttention > 0 ? "MEDIUM" : "LOW";
        }
        double ratio = needsAttention * 1.0 / studentsAnalyzed;
        if (needsAttention == 0) return "LOW";
        if (ratio >= 0.22 || needsAttention >= 14) return "HIGH";
        if (ratio >= 0.09 || needsAttention >= 5) return "MEDIUM";
        return "LOW";
    }

    private static List<String> rankSubjects(Map<Integer, Set<Integer>> weakBySubj, Map<Integer, String> names, int limit) {
        return weakBySubj.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<Integer, Set<Integer>> e) -> e.getValue().size()).reversed())
                .limit(limit)
                .map(e -> {
                    String n = names.getOrDefault(e.getKey(), "Môn " + e.getKey());
                    int c = e.getValue().size();
                    return n + " (" + c + " HS cần theo dõi)";
                })
                .collect(Collectors.toList());
    }

    private static List<String> rankClasses(Map<Integer, Set<Integer>> weakByClass, Map<Integer, String> names, int limit) {
        return weakByClass.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<Integer, Set<Integer>> e) -> e.getValue().size()).reversed())
                .limit(limit)
                .map(e -> {
                    String n = names.getOrDefault(e.getKey(), "Lớp " + e.getKey());
                    int c = e.getValue().size();
                    return n + " — " + c + " học sinh cần theo dõi";
                })
                .collect(Collectors.toList());
    }

    private static String buildManagementPrompt(
            String teacherName,
            int classesAnalyzed,
            int studentsAnalyzed,
            int needAttention,
            String managementLevel,
            List<String> keyRiskSubjects,
            List<String> keyConcernClasses,
            boolean noTaughtPairs
    ) {
        String tn = teacherName != null ? teacherName.trim() : "Giáo viên";
        return ""
                + "Bạn là trợ lý AI hỗ trợ CÔNG TÁC QUẢN LÝ lớp học và theo dõi học sinh trong trường phổ thông.\n"
                + "PHẠM VI: Tổng quan dashboard giáo viên — NHIỀU lớp trong phạm vi phụ trách, KHÔNG phân tích một học sinh duy nhất, KHÔNG kết luận học lực một em.\n"
                + "Không dùng từ: Mức YẾU, performanceLevel, học lực yếu cho cả tập học sinh, \"13 môn dưới trung bình\" kiểu học thuật cá nhân.\n"
                + "Dùng giọng: tổng quan quản lý, giám sát lớp, phối hợp, kế hoạch theo dõi.\n"
                + "Dữ liệu dưới đây là SỐ LIỆU CHÍNH THỨC do hệ thống tính; bạn KHÔNG được tự bịa thêm số.\n"
                + "Giáo viên: " + tn + "\n"
                + "Số lớp trong phạm vi: " + classesAnalyzed + "\n"
                + "Số học sinh (hội đủ điều kiện): " + studentsAnalyzed + "\n"
                + "Số học sinh cần theo dõi thêm (có ít nhất một điểm thành phần < 5 trong môn/lớp GV phụ trách): " + needAttention + "\n"
                + "Mức độ cần chú ý (quản lý) từ backend: " + managementLevel + " (LOW=ổn định, MEDIUM=cần theo dõi, HIGH=cần ưu tiên điều phối).\n"
                + (noTaughtPairs ? "Lưu ý: chưa có cặp lớp-môn phân công giảng dạy rõ ràng trong hệ thống — viết ngắn về quản lý hành chính / TKB.\n" : "")
                + "Môn cần chú ý (theo số học sinh): " + String.join("; ", keyRiskSubjects.isEmpty() ? List.of("—") : keyRiskSubjects) + "\n"
                + "Lớp cần chú ý: " + String.join("; ", keyConcernClasses.isEmpty() ? List.of("—") : keyConcernClasses) + "\n"
                + "ĐẦU RA: một JSON duy nhất, không markdown, không giải thích ngoài JSON.\n"
                + "Schema: {\"summary\": string (<=200 ký tự, tiếng Việt), "
                + "\"topConcerns\": array 2-3 string (mỗi chuỗi <=85 ký tự), "
                + "\"recommendations\": array 2-3 string (mỗi chuỗi <=85 ký tự)}.\n"
                + "summary phải phản ánh đúng phạm vi nhiều lớp và mức " + managementLevel + ", không cá nhân hóa một học sinh.\n";
    }

    private static String deterministicSummary(String teacherName, String level, int cls, int stu, int need, boolean noPairs) {
        String tn = teacherName != null && !teacherName.isBlank() ? teacherName.trim() : "Giáo viên";
        String levelVi;
        if ("HIGH".equalsIgnoreCase(level)) {
            levelVi = "cao — nên ưu tiên phân bổ thời gian theo dõi và phối hợp";
        } else if ("MEDIUM".equalsIgnoreCase(level)) {
            levelVi = "trung bình — nên duy trì nhịp kiểm tra định kỳ";
        } else {
            levelVi = "thấp — tình hình tương đối ổn định trong phạm vi dữ liệu";
        }
        if (noPairs && cls > 0) {
            return String.format(
                    Locale.ROOT,
                    "Tổng quan quản lý cho %s: %d lớp, %d học sinh trong phạm vi. "
                            + "Chưa có liên kết môn giảng dạy rõ trong hệ thống để thống kê điểm theo phân công — mức độ cần chú ý: %s.",
                    tn, cls, stu, levelVi
            );
        }
        if (stu == 0) {
            return String.format(
                    Locale.ROOT,
                    "Tổng quan quản lý cho %s: %d lớp trong phạm vi; chưa có học sinh Active trong các lớp này hoặc chưa có dữ liệu.",
                    tn, cls
            );
        }
        return String.format(
                Locale.ROOT,
                "Tổng quan quản lý học tập của %s: %d lớp, %d học sinh; có %d học sinh cần theo dõi thêm (điểm thành phần < 5 ở môn bạn phụ trách). "
                        + "Mức độ cần chú ý: %s.",
                tn, cls, stu, need, levelVi
        );
    }

    private static List<String> defaultTopConcerns(String level, int need, List<String> subj, List<String> cls) {
        List<String> out = new ArrayList<>();
        if (need > 0) {
            out.add("Ưu tiên rà soát học sinh có điểm thành phần dưới 5 trong các môn bạn phụ trách.");
        } else {
            out.add("Duy trì theo dõi định kỳ khi có thêm cột điểm mới.");
        }
        if (subj != null && !subj.isEmpty()) {
            out.add("Tập trung điều phối môn: " + subj.get(0) + ".");
        } else if (cls != null && !cls.isEmpty()) {
            out.add("Chú ý lớp: " + cls.get(0) + ".");
        } else {
            out.add("Đồng bộ kế hoạch củng cố với tổ bộ môn khi cần.");
        }
        if (out.size() < 2) {
            out.add("Ghi nhận tiến độ và chia sẻ thông tin với GVCN khi học sinh thuộc lớp chủ nhiệm.");
        }
        return out.stream().limit(3).collect(Collectors.toList());
    }

    private static List<String> defaultRecommendations(String level, int need, boolean noPairs) {
        List<String> r = new ArrayList<>();
        if (noPairs) {
            r.add("Kiểm tra phân công giảng dạy (TKB / học phần) để hệ thống gắn đúng lớp–môn.");
            r.add("Lập danh sách việc cần làm tuần tới theo lớp bạn phụ trách.");
        } else {
            r.add("Lên lịch kiểm tra nhanh hoặc phiếu bổ trợ cho nhóm học sinh cần theo dõi.");
            r.add("Phối hợp GVCN/phụ huynh khi tỷ lệ học sinh cần theo dõi từ " + normalizeLevelWord(level) + ".");
        }
        if (need >= 8) {
            r.add("Ưu tiên phân nhóm phụ đạo theo môn có nhiều em cần theo dõi.");
        } else {
            r.add("Cập nhật nhật ký lớp sau mỗi đợt nhập điểm.");
        }
        return r.stream().limit(3).collect(Collectors.toList());
    }

    private static String normalizeLevelWord(String level) {
        if ("HIGH".equalsIgnoreCase(level)) return "mức cao";
        if ("MEDIUM".equalsIgnoreCase(level)) return "mức trung bình";
        return "mức thấp";
    }

    private static List<String> cleanList(List<String> in, int max) {
        if (in == null) return List.of();
        return in.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).distinct().limit(max).collect(Collectors.toList());
    }

    private static String safeName(String name, String fallback) {
        if (name == null || name.isBlank()) return fallback;
        return name.trim();
    }

    private static String normalizeRole(String role) {
        if (role == null) return "";
        String r = role.trim().toUpperCase(Locale.ROOT);
        if (r.contains("TEACHER")) return "TEACHER";
        if (r.contains("ADMIN")) return "ADMIN";
        return r;
    }
}
