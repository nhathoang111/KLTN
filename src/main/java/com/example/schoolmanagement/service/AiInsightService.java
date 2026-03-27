package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.ai.ClassAiInsightRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisResponse;
import com.example.schoolmanagement.dto.ai.StudentAiInsightRequest;
import com.example.schoolmanagement.entity.*;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiInsightService {

    @Autowired private ClassRepository classRepository;
    @Autowired private ExamScoreRepository examScoreRepository;
    @Autowired private ClassSectionRepository classSectionRepository;
    @Autowired private AnnouncementRepository announcementRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParentStudentRepository parentStudentRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private GeminiGradeAnalysisService geminiGradeAnalysisService;

    public Map<String, Object> analyzeClassAndNotifyTeachers(
            ClassAiInsightRequest req,
            Integer currentUserId,
            String currentUserRole
    ) {
        String role = normalizeRole(currentUserRole);
        if (!"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new ForbiddenException("Chỉ Admin/Super Admin mới được phân tích điểm theo lớp");
        }
        if (req == null || req.getClassId() == null) throw new BadRequestException("Thiếu classId");

        ClassEntity cls = classRepository.findByIdWithSchool(req.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp id=" + req.getClassId()));

        int curDays = clampDays(req.getCurrentWindowDays(), 30);
        int prevDays = clampDays(req.getPreviousWindowDays(), 30);

        List<ExamScore> scores = examScoreRepository.findByClassEntityId(cls.getId());
        if (scores == null) scores = List.of();

        GradeAnalysisRequest analysisReq = buildGradeAnalysisForClass(cls, scores, curDays, prevDays);

        int totalStudents = countDistinctStudents(scores);
        int weakStudentCount = countWeakStudents(scores);
        String risk = geminiGradeAnalysisService.calculateRiskLevel(totalStudents, weakStudentCount, List.of());

        GeminiGradeAnalysisService.AiExecutionContext ctx = GeminiGradeAnalysisService.AiExecutionContext.forEndpoint("/api/ai/insights/class");
        ctx.setSchoolId(cls.getSchool() != null ? cls.getSchool().getId() : null);
        ctx.setClassId(cls.getId());
        ctx.setTotalStudents(totalStudents);
        ctx.setWeakStudentCount(weakStudentCount);
        ctx.setAnalysisScope("CLASS");
        ctx.setRiskLevel(risk);

        GradeAnalysisResponse analysis = geminiGradeAnalysisService.analyzeGrade(analysisReq, ctx);

        // Teachers to notify: all teachers assigned in class sections for this class
        List<ClassSection> sections = classSectionRepository.findByClassRoomIdFetchSubjectTeacher(cls.getId());
        Set<Integer> teacherIds = sections.stream()
                .map(cs -> cs.getTeacher() != null ? cs.getTeacher().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        User createdBy = (currentUserId != null) ? userRepository.findById(currentUserId).orElse(null) : null;
        if (createdBy == null) throw new BadRequestException("Thiếu/không hợp lệ X-User-Id");

        String title = "[AI] Phân tích điểm lớp " + safeText(cls.getName());

        List<Integer> announcementIds = new ArrayList<>();
        boolean shouldNotify = geminiGradeAnalysisService.shouldNotify(analysis.getRiskLevel(), false);
        if (shouldNotify) {
            for (Integer tid : teacherIds) {
                User teacher = userRepository.findById(tid).orElse(null);
                if (teacher == null) continue;
                Announcement ann = new Announcement();
                ann.setSchool(cls.getSchool());
                ann.setClassEntity(cls);
                ann.setCreatedBy(createdBy);
                ann.setRecipientUser(teacher);
                ann.setTitle(title);
                ann.setContent(analysis.getAnalysis());
                ann.setCreatedAt(LocalDateTime.now());
                Announcement saved = announcementRepository.save(ann);
                announcementIds.add(saved.getId());
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("analysis", analysis); // backward compatibility
        out.put("summary", analysis.getSummary());
        out.put("underAverageSubjects", analysis.getUnderAverageSubjects());
        out.put("trend", analysis.getTrend());
        out.put("recommendations", analysis.getRecommendations());
        out.put("riskLevel", analysis.getRiskLevel());
        out.put("metadata", analysis.getMetadata());
        out.put("notifiedTeacherCount", shouldNotify ? teacherIds.size() : 0);
        out.put("announcementIds", announcementIds);
        return out;
    }

    public Map<String, Object> analyzeStudentAndNotifyParents(
            StudentAiInsightRequest req,
            Integer currentUserId,
            String currentUserRole
    ) {
        String role = normalizeRole(currentUserRole);
        if (!"TEACHER".equals(role) && !"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new ForbiddenException("Chỉ giáo viên hoặc admin mới được phân tích điểm theo học sinh");
        }
        if (req == null || req.getStudentId() == null) throw new BadRequestException("Thiếu studentId");

        User student = userRepository.findByIdWithSchoolAndRole(req.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học sinh id=" + req.getStudentId()));

        // basic check role is STUDENT (best-effort)
        String studentRole = student.getRole() != null && student.getRole().getName() != null
                ? student.getRole().getName().toUpperCase() : "";
        if (!studentRole.contains("STUDENT")) {
            throw new BadRequestException("User không phải học sinh");
        }

        int curDays = clampDays(req.getCurrentWindowDays(), 30);
        int prevDays = clampDays(req.getPreviousWindowDays(), 30);

        // Lọc theo đúng school để tránh trường hợp một user có thể phát sinh dữ liệu điểm từ nhiều trường
        Integer studentSchoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        List<ExamScore> scores = (studentSchoolId != null)
                ? examScoreRepository.findBySchoolIdAndStudentId(studentSchoolId, student.getId())
                : examScoreRepository.findByStudentId(student.getId());
        if (scores == null) scores = List.of();

        GradeAnalysisRequest analysisReq = buildGradeAnalysisForStudent(student, scores, curDays, prevDays);

        int weakSubjectCount = (int) analysisReq.getSubjects().stream()
                .filter(s -> geminiGradeAnalysisService.isSubjectWeak(s.getScore(), s.getAverageScore() != null ? s.getAverageScore() : s.getScore()))
                .count();
        int totalStudents = 1;
        int weakStudentCount = weakSubjectCount > 0 ? 1 : 0;
        String risk = geminiGradeAnalysisService.calculateRiskLevel(totalStudents, weakStudentCount, List.of());

        GeminiGradeAnalysisService.AiExecutionContext ctx = GeminiGradeAnalysisService.AiExecutionContext.forEndpoint("/api/ai/insights/student");
        ctx.setSchoolId(studentSchoolId);
        ctx.setClassId(null);
        ctx.setTotalStudents(totalStudents);
        ctx.setWeakStudentCount(weakStudentCount);
        ctx.setAnalysisScope("CLASS");
        ctx.setRiskLevel(risk);

        GradeAnalysisResponse analysis = geminiGradeAnalysisService.analyzeGrade(analysisReq, ctx);

        // Notify parents only if has any subject under 5.0 in current "score" values we sent
        boolean hasUnder = analysisReq.getSubjects().stream()
                .anyMatch(s -> geminiGradeAnalysisService.isSubjectWeak(s.getScore(), s.getAverageScore() != null ? s.getAverageScore() : s.getScore()));
        boolean sameSubjectBelowFiveMoreThanTwoTimes = analysisReq.getSubjects().stream()
                .anyMatch(s -> s.getBelowFiveCount() != null && s.getBelowFiveCount() > 2);
        boolean shouldNotify = geminiGradeAnalysisService.shouldNotify(analysis.getRiskLevel(), sameSubjectBelowFiveMoreThanTwoTimes);

        User createdBy = (currentUserId != null) ? userRepository.findById(currentUserId).orElse(null) : null;
        if (createdBy == null) throw new BadRequestException("Thiếu/không hợp lệ X-User-Id");

        // Determine student's current class (active enrollment)
        ClassEntity classEntity = null;
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
        if (enrollments != null) {
            Enrollment active = enrollments.stream()
                    .filter(e -> e != null && e.getClassEntity() != null)
                    .filter(e -> e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus()))
                    .findFirst().orElse(null);
            if (active != null) classEntity = active.getClassEntity();
        }

        List<Integer> announcementIds = new ArrayList<>();
        int parentCount = 0;
        if (hasUnder && shouldNotify) {
            List<ParentStudent> links = parentStudentRepository.findByStudentId(student.getId());
            Set<Integer> parentIds = links.stream()
                    .map(ps -> ps.getParent() != null ? ps.getParent().getId() : null)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            parentCount = parentIds.size();

            String title = "[AI] Cảnh báo điểm dưới trung bình: " + safeText(student.getFullName());
            for (Integer pid : parentIds) {
                User parent = userRepository.findById(pid).orElse(null);
                if (parent == null) continue;
                Announcement ann = new Announcement();
                ann.setSchool(student.getSchool());
                ann.setClassEntity(classEntity);
                ann.setCreatedBy(createdBy);
                ann.setRecipientUser(parent);
                ann.setTitle(title);
                ann.setContent(analysis.getAnalysis());
                ann.setCreatedAt(LocalDateTime.now());
                Announcement saved = announcementRepository.save(ann);
                announcementIds.add(saved.getId());
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("analysis", analysis); // backward compatibility
        out.put("summary", analysis.getSummary());
        out.put("underAverageSubjects", analysis.getUnderAverageSubjects());
        out.put("trend", analysis.getTrend());
        out.put("recommendations", analysis.getRecommendations());
        out.put("riskLevel", analysis.getRiskLevel());
        out.put("metadata", analysis.getMetadata());
        out.put("hasUnderAverage", hasUnder);
        out.put("notifiedParentCount", parentCount);
        out.put("announcementIds", announcementIds);
        return out;
    }

    private GradeAnalysisRequest buildGradeAnalysisForClass(ClassEntity cls, List<ExamScore> scores, int curDays, int prevDays) {
        GradeAnalysisRequest req = new GradeAnalysisRequest();
        req.setTarget("Lớp: " + safeText(cls.getName()));
        req.setClassId(cls.getId());
        req.setSubjects(buildSubjectScores(scores, curDays, prevDays));
        return req;
    }

    private GradeAnalysisRequest buildGradeAnalysisForStudent(User student, List<ExamScore> scores, int curDays, int prevDays) {
        GradeAnalysisRequest req = new GradeAnalysisRequest();
        String name = student.getFullName() != null ? student.getFullName() : ("ID " + student.getId());
        req.setTarget("Học sinh: " + name);
        req.setClassId(null);
        req.setSubjects(buildSubjectScores(scores, curDays, prevDays));
        return req;
    }

    /**
     * Quy ước:
     * - score: MIN điểm trong current window
     * - previousScore: MIN điểm trong previous window (ngay trước current window)
     */
    private List<GradeAnalysisRequest.SubjectScore> buildSubjectScores(List<ExamScore> scores, int curDays, int prevDays) {
        long nowMs = System.currentTimeMillis();
        long dayMs = 24L * 60 * 60 * 1000;
        long curStart = nowMs - curDays * dayMs;
        long prevStart = nowMs - (curDays + prevDays) * dayMs;

        Map<String, Double> curMin = new HashMap<>();
        Map<String, Double> prevMin = new HashMap<>();
        Map<String, List<Double>> curScores = new HashMap<>();
        Map<String, List<Double>> prevScores = new HashMap<>();
        Map<String, Integer> belowFiveCount = new HashMap<>();

        for (ExamScore es : scores) {
            if (es == null || es.getSubject() == null) continue;
            String subjectName = es.getSubject().getName() != null ? es.getSubject().getName() : "Môn";
            Double sc = es.getScore();
            if (sc == null) continue;

            long t = toMillis(es.getCreatedAt());
            if (t <= 0) continue;

            if (t >= curStart) {
                curMin.merge(subjectName, sc, Math::min);
                curScores.computeIfAbsent(subjectName, k -> new ArrayList<>()).add(sc);
                if (sc < 5.0) belowFiveCount.merge(subjectName, 1, Integer::sum);
            } else if (t >= prevStart && t < curStart) {
                prevMin.merge(subjectName, sc, Math::min);
                prevScores.computeIfAbsent(subjectName, k -> new ArrayList<>()).add(sc);
            }
        }

        // if no createdAt-based windows found, fallback to global min per subject
        if (curMin.isEmpty()) {
            for (ExamScore es : scores) {
                if (es == null || es.getSubject() == null || es.getScore() == null) continue;
                String subjectName = es.getSubject().getName() != null ? es.getSubject().getName() : "Môn";
                curMin.merge(subjectName, es.getScore(), Math::min);
                curScores.computeIfAbsent(subjectName, k -> new ArrayList<>()).add(es.getScore());
                if (es.getScore() < 5.0) belowFiveCount.merge(subjectName, 1, Integer::sum);
            }
        }

        List<GradeAnalysisRequest.SubjectScore> out = new ArrayList<>();
        for (Map.Entry<String, Double> e : curMin.entrySet()) {
            GradeAnalysisRequest.SubjectScore s = new GradeAnalysisRequest.SubjectScore();
            s.setName(e.getKey());
            s.setScore(e.getValue());
            if (prevMin.containsKey(e.getKey())) s.setPreviousScore(prevMin.get(e.getKey()));
            s.setAverageScore(avg(curScores.get(e.getKey())));
            s.setPreviousAverageScore(avg(prevScores.get(e.getKey())));
            s.setBelowFiveCount(belowFiveCount.getOrDefault(e.getKey(), 0));
            out.add(s);
        }

        /*
         * Khi mọi điểm được tạo trong cùng "current window" (vd. nhập hàng loạt trong vài ngày)
         * thì prevMin trống → không có previousScore. Bổ sung: với mỗi môn, nếu vẫn thiếu
         * previousScore nhưng có ≥2 bản ghi trong current window, lấy MIN nửa đầu timeline
         * (theo createdAt) làm mốc so sánh xu hướng; score (MIN cả window) giữ nguyên.
         */
        for (GradeAnalysisRequest.SubjectScore s : out) {
            if (s.getPreviousScore() != null) continue;
            String subj = s.getName();
            List<AbstractMap.SimpleEntry<Long, Double>> pts = new ArrayList<>();
            for (ExamScore es : scores) {
                if (es == null || es.getSubject() == null || es.getScore() == null) continue;
                String subjectName = es.getSubject().getName() != null ? es.getSubject().getName() : "Môn";
                if (!Objects.equals(subjectName, subj)) continue;
                long t = toMillis(es.getCreatedAt());
                if (t < curStart) continue;
                pts.add(new AbstractMap.SimpleEntry<>(t, es.getScore()));
            }
            if (pts.size() < 2) continue;
            pts.sort(Comparator.comparing(AbstractMap.SimpleEntry::getKey));
            int mid = pts.size() / 2;
            double firstHalfMin = pts.subList(0, mid).stream()
                    .mapToDouble(AbstractMap.SimpleEntry::getValue)
                    .min()
                    .orElse(Double.NaN);
            if (!Double.isNaN(firstHalfMin)) {
                s.setPreviousScore(firstHalfMin);
            }
        }

        out.sort(Comparator.comparing(GradeAnalysisRequest.SubjectScore::getName, String::compareToIgnoreCase));
        return out;
    }

    private long toMillis(LocalDateTime dt) {
        if (dt == null) return -1;
        try {
            return dt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        } catch (Exception e) {
            return -1;
        }
    }

    private int clampDays(Integer days, int def) {
        if (days == null) return def;
        if (days < 7) return 7;
        if (days > 365) return 365;
        return days;
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        String r = role.trim().toUpperCase();
        if (r.contains("SUPER_ADMIN")) return "SUPER_ADMIN";
        if (r.contains("ADMIN")) return "ADMIN";
        if (r.contains("TEACHER")) return "TEACHER";
        return r;
    }

    private String safeText(String s) {
        return s == null ? "" : s.trim();
    }

    private Double avg(List<Double> vals) {
        if (vals == null || vals.isEmpty()) return null;
        return vals.stream().filter(Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(Double.NaN);
    }

    private int countDistinctStudents(List<ExamScore> scores) {
        if (scores == null) return 0;
        return (int) scores.stream()
                .map(es -> es != null && es.getStudent() != null ? es.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .distinct()
                .count();
    }

    private int countWeakStudents(List<ExamScore> scores) {
        if (scores == null || scores.isEmpty()) return 0;
        Map<Integer, List<ExamScore>> byStudent = scores.stream()
                .filter(Objects::nonNull)
                .filter(es -> es.getStudent() != null && es.getStudent().getId() != null)
                .collect(Collectors.groupingBy(es -> es.getStudent().getId()));

        int weak = 0;
        for (Map.Entry<Integer, List<ExamScore>> e : byStudent.entrySet()) {
            Map<String, List<Double>> subj = new HashMap<>();
            for (ExamScore es : e.getValue()) {
                if (es.getSubject() == null || es.getScore() == null) continue;
                String sn = es.getSubject().getName() != null ? es.getSubject().getName() : "Môn";
                subj.computeIfAbsent(sn, k -> new ArrayList<>()).add(es.getScore());
            }
            boolean isWeak = subj.values().stream().anyMatch(list -> {
                double min = list.stream().mapToDouble(Double::doubleValue).min().orElse(10.0);
                double avg = list.stream().mapToDouble(Double::doubleValue).average().orElse(10.0);
                return geminiGradeAnalysisService.isSubjectWeak(min, avg);
            });
            if (isWeak) weak++;
        }
        return weak;
    }
}

