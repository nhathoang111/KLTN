package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.ai.ClassAiInsightRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisResponse;
import com.example.schoolmanagement.dto.ai.StudentAiInsightRequest;
import com.example.schoolmanagement.dto.ai.StudentSubjectAnalysisRequest;
import com.example.schoolmanagement.dto.ai.StudentSubjectAnalysisResponse;
import com.example.schoolmanagement.entity.*;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
        String announcementContent = buildLegacyAnnouncementContent(analysis);

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
                ann.setContent(announcementContent);
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

        // Nếu FE gửi classId/subjectId thì ưu tiên lọc đúng đúng dòng giáo viên đang phân tích.
        // (Tránh tình huống bấm AI ở dòng Sinh nhưng AI lại gom cả Toán của cùng học sinh.)
        if (req.getClassId() != null) {
            Integer requestedClassId = req.getClassId();
            scores = scores.stream().filter(es -> {
                if (es == null || es.getClassEntity() == null) return false;
                return Objects.equals(es.getClassEntity().getId(), requestedClassId);
            }).collect(Collectors.toList());
        }
        if (req.getSubjectId() != null) {
            Integer requestedSubjectId = req.getSubjectId();
            scores = scores.stream().filter(es -> {
                if (es == null || es.getSubject() == null) return false;
                return Objects.equals(es.getSubject().getId(), requestedSubjectId);
            }).collect(Collectors.toList());
        }

        // IMPORTANT: nếu người gọi là TEACHER thì AI chỉ được phân tích theo các môn/lớp mà giáo viên đó dạy.
        if ("TEACHER".equals(role) && currentUserId != null) {
            List<ClassSection> teacherSections = classSectionRepository.findByTeacherIdFetchAll(currentUserId);
            Set<String> taughtClassSubjectPairs = new HashSet<>();
            for (ClassSection cs : teacherSections) {
                if (cs == null || cs.getClassRoom() == null || cs.getSubject() == null) continue;
                Integer cid = cs.getClassRoom().getId();
                Integer sid = cs.getSubject().getId();
                if (cid != null && sid != null) {
                    taughtClassSubjectPairs.add(cid + "-" + sid);
                }
            }

            if (!taughtClassSubjectPairs.isEmpty()) {
                scores = scores.stream().filter(es -> {
                    if (es == null || es.getClassEntity() == null || es.getSubject() == null) return false;
                    Integer cid = es.getClassEntity().getId();
                    Integer sid = es.getSubject().getId();
                    return cid != null && sid != null && taughtClassSubjectPairs.contains(cid + "-" + sid);
                }).collect(Collectors.toList());
            } else {
                scores = List.of();
            }
        }

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
            String announcementContent = buildLegacyAnnouncementContent(analysis);
            for (Integer pid : parentIds) {
                User parent = userRepository.findById(pid).orElse(null);
                if (parent == null) continue;
                Announcement ann = new Announcement();
                ann.setSchool(student.getSchool());
                ann.setClassEntity(classEntity);
                ann.setCreatedBy(createdBy);
                ann.setRecipientUser(parent);
                ann.setTitle(title);
                ann.setContent(announcementContent);
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

    public StudentSubjectAnalysisResponse analyzeStudentSubjectInClass(
            StudentSubjectAnalysisRequest req,
            Integer currentUserId,
            String currentUserRole
    ) {
        String role = normalizeRole(currentUserRole);
        if (!"TEACHER".equals(role) && !"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new ForbiddenException("Chỉ giáo viên hoặc admin mới được phân tích điểm theo học sinh/môn");
        }
        if (req == null) throw new BadRequestException("Body là bắt buộc");
        if (req.getClassId() == null) throw new BadRequestException("Thiếu classId");
        if (req.getStudentId() == null) throw new BadRequestException("Thiếu studentId");
        if (req.getSubjectId() == null) throw new BadRequestException("Thiếu subjectId");

        ClassEntity cls = classRepository.findByIdWithSchool(req.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp id=" + req.getClassId()));
        User student = userRepository.findByIdWithSchoolAndRole(req.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học sinh id=" + req.getStudentId()));

        // Teacher permission: must teach that class + subject
        if ("TEACHER".equals(role)) {
            if (currentUserId == null) throw new BadRequestException("Thiếu X-User-Id");
            boolean teaches = classSectionRepository.findByTeacherIdFetchAll(currentUserId).stream()
                    .anyMatch(cs -> cs != null
                            && cs.getClassRoom() != null && Objects.equals(cs.getClassRoom().getId(), req.getClassId())
                            && cs.getSubject() != null && Objects.equals(cs.getSubject().getId(), req.getSubjectId()));
            if (!teaches) {
                throw new ForbiddenException("Bạn không được phân tích môn/lớp này (không thuộc môn giảng dạy)");
            }
        }

        // Fetch score rows for exactly this student + class + subject (current-term only exists in DB)
        List<ExamScore> rows = examScoreRepository.findByStudentIdAndSubjectIdAndClassEntityId(
                req.getStudentId(), req.getSubjectId(), req.getClassId()
        );
        if (rows == null) rows = List.of();
        rows = rows.stream()
                .filter(Objects::nonNull)
                .filter(r -> r.getStatus() == null || "ACTIVE".equalsIgnoreCase(r.getStatus()))
                .collect(Collectors.toList());

        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Không có dữ liệu điểm cho học sinh/môn/lớp đã chọn");
        }

        String subjectName = rows.stream().map(r -> r.getSubject() != null ? r.getSubject().getName() : null)
                .filter(Objects::nonNull).findFirst().orElse("Môn học");

        StudentSubjectAnalysisResponse out = new StudentSubjectAnalysisResponse();
        out.setStudentName(safeText(student.getFullName()));
        out.setClassName(safeText(cls.getName()));
        out.setSubjectName(safeText(subjectName));

        // Deterministic stats
        List<ExamScore> sorted = new ArrayList<>(rows);
        sorted.sort(Comparator.comparing(r -> r.getCreatedAt() != null ? r.getCreatedAt() : LocalDateTime.MIN));

        List<Double> scores = sorted.stream()
                .map(ExamScore::getScore)
                .filter(Objects::nonNull)
                .filter(d -> !d.isNaN())
                .collect(Collectors.toList());

        int scoreCount = scores.size();
        double min = scores.stream().mapToDouble(Double::doubleValue).min().orElse(Double.NaN);
        double max = scores.stream().mapToDouble(Double::doubleValue).max().orElse(Double.NaN);
        int belowFive = (int) scores.stream().filter(s -> s < 5.0).count();

        out.setScoreCount(scoreCount);
        out.setBelowFiveCount(belowFive);
        out.setMinScore(Double.isNaN(min) ? null : round1(min));
        out.setMaxScore(Double.isNaN(max) ? null : round1(max));

        // subjectAverage: prefer TBM formula if enough component points exist; else average of available scores
        Double tbm = computeTbmAttempt1(sorted);
        Double subjectAverage = tbm != null ? tbm : (scoreCount > 0 ? round1(scores.stream().mapToDouble(Double::doubleValue).average().orElse(Double.NaN)) : null);
        out.setSubjectAverage(subjectAverage);

        String level = classifySubjectPerformanceLevel(subjectAverage);
        out.setSubjectPerformanceLevel(level);

        String trend = computeTrendWithinSubject(sorted);
        out.setTrend(trend);

        // Gemini: only summary/topConcerns/recommendations, tone by subjectPerformanceLevel
        String prompt = buildStudentSubjectPrompt(out, sorted);
        GeminiGradeAnalysisService.StudentSubjectAiFields ai = null;
        try {
            GeminiGradeAnalysisService.AiExecutionContext ctx = GeminiGradeAnalysisService.AiExecutionContext.forEndpoint("/api/ai/insights/student-subject");
            ctx.setSchoolId(cls.getSchool() != null ? cls.getSchool().getId() : null);
            ctx.setClassId(cls.getId());
            ctx.setAnalysisScope("STUDENT_SUBJECT");
            ai = geminiGradeAnalysisService.generateStudentSubjectAiFields(prompt, ctx);
        } catch (Exception ex) {
            ai = null;
        }

        if (ai == null) {
            applyStudentSubjectFallbackNarrative(out);
        } else {
            out.setSummary(nonBlankOrFallback(ai.getSummary(), fallbackSummary(out)));
            out.setTopConcerns(cleanList(ai.getTopConcerns(), 3));
            out.setRecommendations(cleanList(ai.getRecommendations(), 3));
            if (out.getTopConcerns() == null || out.getTopConcerns().isEmpty()) {
                out.setTopConcerns(defaultConcernsByLevel(out));
            }
            if (out.getRecommendations() == null || out.getRecommendations().isEmpty()) {
                out.setRecommendations(defaultRecommendationsByLevel(out));
            }
        }
        return out;
    }

    private static Double round1(double d) {
        return BigDecimal.valueOf(d).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private static String classifySubjectPerformanceLevel(Double subjectAverage) {
        if (subjectAverage == null) return "TRUNG_BINH";
        double a = subjectAverage;
        if (a < 4.0) return "YEU";
        if (a < 6.5) return "TRUNG_BINH";
        if (a < 8.0) return "KHA";
        return "GIOI";
    }

    private static Double computeTbmAttempt1(List<ExamScore> sorted) {
        Double oral = findScore(sorted, "MIENG", 1);
        Double p15 = findScore(sorted, "15P", 1);
        Double t1 = findScore(sorted, "1TIET", 1);
        Double ck = findScore(sorted, "CUOIKI", 1);
        return ExamScoreService.computeTbmFromStandardComponents(oral, p15, t1, ck);
    }

    private static Double findScore(List<ExamScore> rows, String scoreType, int attempt) {
        String want = scoreType.trim().toUpperCase();
        for (ExamScore e : rows) {
            String st = e.getScoreType() == null ? "15P" : e.getScoreType().trim().toUpperCase();
            int att = e.getAttempt() == null ? 1 : e.getAttempt();
            if (st.equals(want) && att == attempt) return e.getScore();
        }
        return null;
    }

    private static String computeTrendWithinSubject(List<ExamScore> sorted) {
        // Default because system currently has only one term and may have very few points.
        // Only compute if we truly have "earlier vs later" points in this same subject.
        List<ExamScore> withTime = sorted.stream()
                .filter(e -> e.getCreatedAt() != null && e.getScore() != null && !e.getScore().isNaN())
                .collect(Collectors.toList());
        if (withTime.size() < 2) return "Không đủ dữ liệu để xác định xu hướng";

        int n = withTime.size();
        int split = n / 2;
        if (split <= 0 || split >= n) return "Không đủ dữ liệu để xác định xu hướng";

        double earlyAvg = withTime.subList(0, split).stream().mapToDouble(e -> e.getScore()).average().orElse(Double.NaN);
        double lateAvg = withTime.subList(split, n).stream().mapToDouble(e -> e.getScore()).average().orElse(Double.NaN);
        if (Double.isNaN(earlyAvg) || Double.isNaN(lateAvg)) return "Không đủ dữ liệu để xác định xu hướng";

        double delta = lateAvg - earlyAvg;
        if (Math.abs(delta) < 0.25) return "Ổn định";
        return delta > 0 ? "Tăng" : "Giảm";
    }

    private static String buildStudentSubjectPrompt(StudentSubjectAnalysisResponse base, List<ExamScore> rows) {
        String level = base.getSubjectPerformanceLevel();
        String tone;
        if ("YEU".equals(level)) tone = "cảnh báo nhưng mang tính hỗ trợ, ưu tiên can thiệp";
        else if ("TRUNG_BINH".equals(level)) tone = "nhắc củng cố nền tảng, theo dõi tiến độ";
        else if ("KHA".equals(level)) tone = "tích cực, động viên tiếp tục cải thiện";
        else tone = "ghi nhận kết quả tốt, khuyến khích phát huy nâng cao";

        String trend = base.getTrend() != null ? base.getTrend() : "Không đủ dữ liệu để xác định xu hướng";
        String avg = base.getSubjectAverage() != null ? String.valueOf(base.getSubjectAverage()) : "null";
        String min = base.getMinScore() != null ? String.valueOf(base.getMinScore()) : "null";
        String max = base.getMaxScore() != null ? String.valueOf(base.getMaxScore()) : "null";

        // Note: do NOT mention classAverage or multi-term data because the system doesn't have it.
        return ""
                + "Bạn là trợ lý phân tích điểm cho giáo viên bộ môn.\n"
                + "PHẠM VI BẮT BUỘC: chỉ phân tích 1 học sinh trong 1 môn học của 1 lớp, trong kỳ hiện tại.\n"
                + "DỮ LIỆU KHÔNG CÓ: KHÔNG có điểm trung bình lớp, KHÔNG có chênh lệch so với lớp, KHÔNG có nhiều kỳ để so sánh.\n"
                + "Bạn chỉ được sử dụng các số liệu được cung cấp dưới đây.\n\n"
                + "Thông tin:\n"
                + "- Học sinh: " + safeTextStatic(base.getStudentName()) + "\n"
                + "- Lớp: " + safeTextStatic(base.getClassName()) + "\n"
                + "- Môn: " + safeTextStatic(base.getSubjectName()) + "\n"
                + "- TBM môn (subjectAverage): " + avg + "\n"
                + "- Min: " + min + " | Max: " + max + "\n"
                + "- Số lượng điểm (scoreCount): " + base.getScoreCount() + "\n"
                + "- Số điểm < 5 (belowFiveCount): " + base.getBelowFiveCount() + "\n"
                + "- Mức kết quả môn (subjectPerformanceLevel - do backend quyết định): " + safeTextStatic(level) + "\n"
                + "- Xu hướng (trend - do backend quyết định): " + safeTextStatic(trend) + "\n\n"
                + "YÊU CẦU ĐẦU RA: trả về DUY NHẤT 1 JSON object hợp lệ. KHÔNG markdown, KHÔNG code block, KHÔNG giải thích.\n"
                + "Schema bắt buộc:\n"
                + "{\n"
                + "  \"summary\": \"string\",\n"
                + "  \"topConcerns\": [\"string\"],\n"
                + "  \"recommendations\": [\"string\"]\n"
                + "}\n\n"
                + "Ràng buộc:\n"
                + "- summary: 1 câu tiếng Việt, ngắn gọn (<= 140 ký tự), đúng phạm vi 1 môn.\n"
                + "- topConcerns: 1-3 ý ngắn (<= 70 ký tự/ý), tập trung vào rủi ro/điểm cần chú ý trong môn.\n"
                + "- recommendations: 1-3 khuyến nghị ngắn (<= 80 ký tự/ý), hành động được trong môn.\n"
                + "- Không được tự suy luận thêm dữ liệu không có.\n"
                + "- Văn phong theo mức " + safeTextStatic(level) + ": " + tone + ".\n";
    }

    private static String nonBlankOrFallback(String s, String fb) {
        if (s == null) return fb;
        String t = s.trim();
        return t.isEmpty() ? fb : t;
    }

    private static List<String> cleanList(List<String> in, int max) {
        if (in == null) return List.of();
        List<String> out = in.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .limit(max)
                .collect(Collectors.toList());
        return out;
    }

    private static void applyStudentSubjectFallbackNarrative(StudentSubjectAnalysisResponse out) {
        out.setSummary(fallbackSummary(out));
        out.setTopConcerns(defaultConcernsByLevel(out));
        out.setRecommendations(defaultRecommendationsByLevel(out));
    }

    private static String fallbackSummary(StudentSubjectAnalysisResponse out) {
        String lvl = out.getSubjectPerformanceLevel();
        String subj = safeTextStatic(out.getSubjectName());
        Double avg = out.getSubjectAverage();
        String avgText = avg != null ? (String.valueOf(avg)) : "chưa đủ";

        if ("YEU".equals(lvl)) {
            return "Môn " + subj + " đang ở mức YẾU (TBM " + avgText + "); cần hỗ trợ và can thiệp sớm.";
        }
        if ("TRUNG_BINH".equals(lvl)) {
            return "Môn " + subj + " ở mức TRUNG BÌNH (TBM " + avgText + "); cần củng cố để cải thiện.";
        }
        if ("KHA".equals(lvl)) {
            return "Môn " + subj + " ở mức KHÁ (TBM " + avgText + "); duy trì và cải thiện các điểm chưa ổn định.";
        }
        return "Môn " + subj + " ở mức GIỎI (TBM " + avgText + "); ghi nhận kết quả tốt và khuyến khích phát huy.";
    }

    private static List<String> defaultConcernsByLevel(StudentSubjectAnalysisResponse out) {
        String lvl = out.getSubjectPerformanceLevel();
        int below5 = out.getBelowFiveCount() != null ? out.getBelowFiveCount() : 0;
        if ("YEU".equals(lvl)) {
            return below5 > 0
                    ? List.of("Có điểm dưới 5 cần xử lý ngay", "Nền tảng kiến thức môn còn yếu")
                    : List.of("Nền tảng kiến thức môn còn yếu", "Cần tăng cường luyện tập thường xuyên");
        }
        if ("TRUNG_BINH".equals(lvl)) {
            return below5 > 0
                    ? List.of("Vẫn còn điểm dưới 5 ở một số lần kiểm tra", "Kết quả chưa ổn định")
                    : List.of("Kết quả chưa ổn định", "Dễ mất điểm ở phần kiến thức trọng tâm");
        }
        if ("KHA".equals(lvl)) {
            return List.of("Một số nội dung chưa thật sự nổi bật", "Cần giữ nhịp học đều");
        }
        return List.of("Cần duy trì sự ổn định", "Khuyến khích thử thách ở mức nâng cao");
    }

    private static List<String> defaultRecommendationsByLevel(StudentSubjectAnalysisResponse out) {
        String lvl = out.getSubjectPerformanceLevel();
        String subj = safeTextStatic(out.getSubjectName());
        if ("YEU".equals(lvl)) {
            return List.of(
                    "Ôn lại kiến thức nền tảng môn " + subj,
                    "Làm bài luyện tập theo dạng và sửa lỗi ngay",
                    "Trao đổi với phụ huynh để theo dõi sát"
            );
        }
        if ("TRUNG_BINH".equals(lvl)) {
            return List.of(
                    "Củng cố các chủ đề hay sai của môn " + subj,
                    "Tăng luyện tập ngắn hằng tuần",
                    "Chốt lại lỗi thường gặp sau mỗi bài kiểm tra"
            );
        }
        if ("KHA".equals(lvl)) {
            return List.of(
                    "Duy trì thói quen học đều và ôn theo chuyên đề",
                    "Tập trung cải thiện phần còn mất điểm",
                    "Luyện thêm đề nâng dần độ khó"
            );
        }
        return List.of(
                "Duy trì phong độ và kiểm soát lỗi nhỏ",
                "Luyện đề nâng cao để bứt phá",
                "Tham gia hoạt động/bài tập mở rộng theo môn"
        );
    }

    private static String safeTextStatic(String s) {
        if (s == null) return "";
        String t = s.trim();
        return t.isEmpty() ? "" : t;
    }

    /**
     * Legacy display text for announcements.
     * This is NOT raw Gemini output; it is derived from structured JSON fields.
     */
    private String buildLegacyAnnouncementContent(GradeAnalysisResponse analysis) {
        if (analysis == null) return "";
        String under = (analysis.getUnderAverageSubjects() == null || analysis.getUnderAverageSubjects().isEmpty())
                ? "Không có môn dưới trung bình"
                : String.join(", ", analysis.getUnderAverageSubjects());
        String rec = (analysis.getRecommendations() == null || analysis.getRecommendations().isEmpty())
                ? "Rà soát lại dữ liệu học tập"
                : analysis.getRecommendations().stream().limit(3).map(r -> "- " + safeText(r)).collect(Collectors.joining("\n"));
        return "Tóm tắt:\n" + safeText(analysis.getSummary()) + "\n\n"
                + "Môn dưới trung bình:\n" + under + "\n\n"
                + "Xu hướng:\n" + safeText(analysis.getTrend()) + "\n\n"
                + "Khuyến nghị:\n" + rec;
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

