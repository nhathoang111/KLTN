package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.Attendance;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.ParentStudentRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AiInformationReadQueryService {

    @Autowired private UserRepository userRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private ExamScoreRepository examScoreRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private ScheduleRepository scheduleRepository;
    @Autowired private ParentStudentRepository parentStudentRepository;
    @Autowired private StudentInfoQueryService studentInfoQueryService;

    public QueryPayload studentProfile(AuthorizationService.AuthContext ctx,
                                       EntityExtractionService.NormalizedEntities ne,
                                       Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        Enrollment active = resolveActiveEnrollment(student.getId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("studentCode", entities.getOrDefault("studentCode", "HS" + student.getId()));
        data.put("fullName", student.getFullName());
        data.put("dateOfBirth", student.getDateOfBirth());
        data.put("gender", student.getGender());
        data.put("status", student.getStatus());
        if (active != null && active.getClassEntity() != null) {
            data.put("classId", active.getClassEntity().getId());
            data.put("className", active.getClassEntity().getName());
            data.put("schoolYear", active.getClassEntity().getSchoolYear() != null ? active.getClassEntity().getSchoolYear().getName() : null);
            data.put("enrollmentStatus", active.getStatus());
        }
        return new QueryPayload(
                data,
                "Thông tin học sinh " + safe(student.getFullName()) +
                        (active != null && active.getClassEntity() != null ? (" đang thuộc lớp " + active.getClassEntity().getName() + ".") : ".")
        );
    }

    public QueryPayload studentClass(AuthorizationService.AuthContext ctx,
                                     EntityExtractionService.NormalizedEntities ne,
                                     Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        Enrollment active = resolveActiveEnrollment(student.getId());
        if (active == null || active.getClassEntity() == null) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("studentId", student.getId());
            data.put("fullName", safe(student.getFullName()));
            data.put("className", null);
            data.put("enrollmentStatus", "INACTIVE");
            return new QueryPayload(data, safe(student.getFullName()) + " hiện chưa có lớp ACTIVE.");
        }
        ClassEntity cls = active.getClassEntity();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("fullName", safe(student.getFullName()));
        data.put("classId", cls.getId());
        data.put("className", cls.getName());
        data.put("schoolYear", cls.getSchoolYear() != null ? cls.getSchoolYear().getName() : null);
        data.put("enrollmentStatus", active.getStatus());
        return new QueryPayload(data, safe(student.getFullName()) + " đang học lớp " + cls.getName() + ".");
    }

    public QueryPayload studentSubjectScore(AuthorizationService.AuthContext ctx,
                                            EntityExtractionService.NormalizedEntities ne,
                                            Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        Subject subject = ne.getSubject();
        if (subject == null) throw new BadRequestException("Thiếu môn học.");
        String semester = entities.get("semester");
        String schoolYear = entities.get("schoolYear");
        List<ExamScore> rows = examScoreRepository.findBySchoolIdAndStudentId(ctx.getSchoolId(), student.getId()).stream()
                .filter(e -> e != null && e.getSubject() != null && Objects.equals(e.getSubject().getId(), subject.getId()))
                .filter(e -> e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .filter(e -> matchesSemester(e, semester))
                .filter(e -> matchesSchoolYear(e, schoolYear))
                .toList();

        if (rows.isEmpty()) {
            return new QueryPayload(Map.of(
                    "studentId", student.getId(),
                    "subjectId", subject.getId(),
                    "subjectName", subject.getName(),
                    "scores", List.of()
            ), "Chưa có điểm môn " + subject.getName() + " cho " + safe(student.getFullName()) + " trong phạm vi yêu cầu.");
        }
        double avg = rows.stream().map(ExamScore::getScore).filter(Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(0.0);
        List<Map<String, Object>> scores = rows.stream()
                .sorted(Comparator.comparing(ExamScore::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("score", e.getScore());
                    m.put("scoreType", e.getScoreType());
                    m.put("attempt", e.getAttempt());
                    m.put("className", e.getClassEntity() != null ? e.getClassEntity().getName() : null);
                    m.put("semester", e.getClassSection() != null ? e.getClassSection().getSemester() : null);
                    m.put("schoolYear", e.getClassSection() != null ? e.getClassSection().getSchoolYear() : null);
                    return m;
                })
                .toList();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("subjectId", subject.getId());
        data.put("subjectName", subject.getName());
        data.put("semester", semester);
        data.put("schoolYear", schoolYear);
        data.put("averageScore", round2(avg));
        data.put("scores", scores);
        return new QueryPayload(data,
                safe(student.getFullName()) + " có điểm TB môn " + subject.getName() + " là " + round2(avg) + ".");
    }

    public QueryPayload studentAverageScore(AuthorizationService.AuthContext ctx,
                                            EntityExtractionService.NormalizedEntities ne,
                                            Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        String semester = entities.get("semester");
        String schoolYear = entities.get("schoolYear");
        List<ExamScore> rows = examScoreRepository.findBySchoolIdAndStudentId(ctx.getSchoolId(), student.getId()).stream()
                .filter(e -> e != null && (e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus())))
                .filter(e -> matchesSemester(e, semester))
                .filter(e -> matchesSchoolYear(e, schoolYear))
                .toList();
        if (rows.isEmpty()) {
            return new QueryPayload(Map.of("studentId", student.getId(), "scores", List.of()),
                    "Chưa có dữ liệu điểm trong phạm vi yêu cầu.");
        }
        Map<Integer, List<ExamScore>> bySubjectId = rows.stream()
                .filter(e -> e.getSubject() != null && e.getSubject().getId() != null)
                .collect(Collectors.groupingBy(e -> e.getSubject().getId()));

        List<Map<String, Object>> bySubject = new ArrayList<>();
        for (Map.Entry<Integer, List<ExamScore>> en : bySubjectId.entrySet()) {
            List<ExamScore> list = en.getValue();
            if (list == null || list.isEmpty()) continue;
            Subject s = list.get(0).getSubject();
            double avg = list.stream().map(ExamScore::getScore).filter(Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(0.0);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("subjectId", en.getKey());
            row.put("subjectName", s != null ? s.getName() : ("Môn " + en.getKey()));
            row.put("averageScore", round2(avg));
            row.put("samples", list.size());
            bySubject.add(row);
        }
        bySubject.sort(Comparator.comparing(o -> String.valueOf(o.get("subjectName")), String.CASE_INSENSITIVE_ORDER));
        double overall = rows.stream().map(ExamScore::getScore).filter(Objects::nonNull).mapToDouble(Double::doubleValue).average().orElse(0.0);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("semester", semester);
        data.put("schoolYear", schoolYear);
        data.put("overallAverageScore", round2(overall));
        data.put("bySubject", bySubject);
        return new QueryPayload(data, "Điểm trung bình hiện tại của " + safe(student.getFullName()) + " là " + round2(overall) + ".");
    }

    public QueryPayload studentAttendance(AuthorizationService.AuthContext ctx,
                                          EntityExtractionService.NormalizedEntities ne,
                                          Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        DateRange range = resolveDateRange(entities);
        List<Attendance> rows = attendanceRepository.findBySchoolIdAndStudentId(ctx.getSchoolId(), student.getId()).stream()
                .filter(a -> a.getAttendanceDate() != null)
                .filter(a -> !a.getAttendanceDate().isBefore(range.start()) && !a.getAttendanceDate().isAfter(range.end()))
                .toList();
        long present = rows.stream().filter(a -> "PRESENT".equalsIgnoreCase(a.getStatus())).count();
        long absent = rows.stream().filter(a -> "ABSENT".equalsIgnoreCase(a.getStatus())).count();
        long late = rows.stream().filter(a -> "LATE".equalsIgnoreCase(a.getStatus())).count();
        long excused = rows.stream().filter(a -> noteContains(a.getNote(), "co phep", "xin phep")).count();
        long unexcused = rows.stream().filter(a -> noteContains(a.getNote(), "khong phep", "vắng không phép")).count();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("from", range.start());
        data.put("to", range.end());
        data.put("presentCount", present);
        data.put("absentCount", absent);
        data.put("lateCount", late);
        data.put("excusedAbsentCount", excused);
        data.put("unexcusedAbsentCount", unexcused);
        data.put("totalSessions", rows.size());
        String answer = safe(student.getFullName()) + ": có mặt " + present + ", nghỉ " + absent + ", đi trễ " + late + " trong khoảng tra cứu.";
        return new QueryPayload(data, answer);
    }

    public QueryPayload topStudentsByClass(AuthorizationService.AuthContext ctx,
                                           EntityExtractionService.NormalizedEntities ne,
                                           Map<String, String> entities) {
        ClassEntity cls = ne.getClassEntity();
        if (cls == null) throw new BadRequestException("Thiếu lớp.");
        Subject subject = ne.getSubject();
        String semester = entities.get("semester");
        String schoolYear = entities.get("schoolYear");
        int topN = parsePositiveInt(entities.get("topN"), 5);

        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityIdWithStudents(cls.getId()).stream()
                .filter(e -> e.getStudent() != null && e.getStudent().getId() != null)
                .toList();
        Set<Integer> studentIds = enrollments.stream().map(e -> e.getStudent().getId()).collect(Collectors.toSet());
        if (studentIds.isEmpty()) {
            return new QueryPayload(Map.of("classId", cls.getId(), "students", List.of()), "Lớp " + cls.getName() + " chưa có học sinh ACTIVE.");
        }

        Map<Integer, String> nameById = enrollments.stream().collect(Collectors.toMap(
                e -> e.getStudent().getId(),
                e -> safe(e.getStudent().getFullName()),
                (a, b) -> a
        ));

        List<ExamScore> rows = examScoreRepository.findByClassEntityId(cls.getId()).stream()
                .filter(e -> e != null && e.getStudent() != null && studentIds.contains(e.getStudent().getId()))
                .filter(e -> e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .filter(e -> subject == null || (e.getSubject() != null && Objects.equals(e.getSubject().getId(), subject.getId())))
                .filter(e -> matchesSemester(e, semester))
                .filter(e -> matchesSchoolYear(e, schoolYear))
                .toList();

        Map<Integer, Double> avgByStudent = rows.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getStudent().getId(),
                        Collectors.averagingDouble(e -> e.getScore() != null ? e.getScore() : 0.0)
                ));
        List<Map<String, Object>> ranked = avgByStudent.entrySet().stream()
                .sorted(Map.Entry.<Integer, Double>comparingByValue().reversed())
                .limit(topN)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("studentId", e.getKey());
                    m.put("fullName", nameById.getOrDefault(e.getKey(), "HS#" + e.getKey()));
                    m.put("averageScore", round2(e.getValue()));
                    return m;
                })
                .collect(Collectors.toList());
        for (int i = 0; i < ranked.size(); i++) ranked.get(i).put("rank", i + 1);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("classId", cls.getId());
        data.put("className", cls.getName());
        data.put("topN", topN);
        data.put("subjectName", subject != null ? subject.getName() : null);
        data.put("semester", semester);
        data.put("schoolYear", schoolYear);
        data.put("students", ranked);
        String answer = ranked.isEmpty()
                ? "Chưa có dữ liệu điểm để xếp hạng lớp " + cls.getName() + "."
                : "Đã lấy top " + ranked.size() + " học sinh điểm cao nhất của lớp " + cls.getName() + ".";
        return new QueryPayload(data, answer);
    }

    public QueryPayload studentsByClass(EntityExtractionService.NormalizedEntities ne) {
        ClassEntity cls = ne.getClassEntity();
        if (cls == null) throw new BadRequestException("Thiếu lớp.");
        List<Map<String, Object>> students = enrollmentRepository.findByClassEntityIdWithStudents(cls.getId()).stream()
                .filter(e -> e.getStudent() != null)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("studentId", e.getStudent().getId());
                    m.put("fullName", safe(e.getStudent().getFullName()));
                    m.put("status", e.getStatus());
                    return m;
                }).toList();
        return new QueryPayload(
                Map.of("classId", cls.getId(), "className", cls.getName(), "students", students),
                "Lớp " + cls.getName() + " có " + students.size() + " học sinh ACTIVE."
        );
    }

    public QueryPayload studentTimetable(AuthorizationService.AuthContext ctx,
                                         EntityExtractionService.NormalizedEntities ne,
                                         Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        Enrollment active = resolveActiveEnrollment(student.getId());
        if (active == null || active.getClassEntity() == null) {
            return new QueryPayload(Map.of("studentId", student.getId(), "schedules", List.of()), "Chưa xác định được lớp hiện tại của học sinh.");
        }
        Integer classId = active.getClassEntity().getId();
        Integer day = parsePositiveInt(entities.get("dayOfWeek"), null);
        List<Map<String, Object>> schedules = scheduleRepository.findByClassEntityId(classId).stream()
                .filter(s -> day == null || Objects.equals(s.getDayOfWeek(), day))
                .sorted(Comparator.comparing(Schedule::getPeriod, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("scheduleId", s.getId());
                    m.put("dayOfWeek", s.getDayOfWeek());
                    m.put("date", s.getDate());
                    m.put("period", s.getPeriod());
                    m.put("room", s.getRoom());
                    m.put("subjectName", s.getSubject() != null ? s.getSubject().getName() : null);
                    return m;
                }).toList();
        return new QueryPayload(
                Map.of("studentId", student.getId(), "className", active.getClassEntity().getName(), "schedules", schedules),
                "Đã lấy thời khóa biểu của " + safe(student.getFullName()) + "."
        );
    }

    public QueryPayload teacherTimetable(AuthorizationService.AuthContext ctx,
                                         EntityExtractionService.NormalizedEntities ne,
                                         Map<String, String> entities) {
        Integer teacherId = ne.getTeacher() != null ? ne.getTeacher().getId() : null;
        if (teacherId == null && "TEACHER".equals(ctx.getRole())) teacherId = ctx.getUserId();
        if (teacherId == null) throw new BadRequestException("Thiếu giáo viên.");
        Integer day = parsePositiveInt(entities.get("dayOfWeek"), null);
        List<Map<String, Object>> schedules = scheduleRepository.findByTeacherId(teacherId).stream()
                .filter(s -> day == null || Objects.equals(s.getDayOfWeek(), day))
                .sorted(Comparator.comparing(Schedule::getPeriod, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("scheduleId", s.getId());
                    m.put("className", s.getClassEntity() != null ? s.getClassEntity().getName() : null);
                    m.put("subjectName", s.getSubject() != null ? s.getSubject().getName() : null);
                    m.put("dayOfWeek", s.getDayOfWeek());
                    m.put("period", s.getPeriod());
                    m.put("room", s.getRoom());
                    m.put("date", s.getDate());
                    return m;
                }).toList();
        return new QueryPayload(
                Map.of("teacherId", teacherId, "schedules", schedules),
                "Đã lấy " + schedules.size() + " lịch dạy."
        );
    }

    public QueryPayload teacherWorkload(AuthorizationService.AuthContext ctx,
                                        EntityExtractionService.NormalizedEntities ne) {
        Integer teacherId = ne.getTeacher() != null ? ne.getTeacher().getId() : null;
        if (teacherId == null && "TEACHER".equals(ctx.getRole())) teacherId = ctx.getUserId();
        if (teacherId == null) throw new BadRequestException("Thiếu giáo viên.");
        List<Schedule> schedules = scheduleRepository.findByTeacherId(teacherId);
        long classCount = schedules.stream().map(s -> s.getClassEntity() != null ? s.getClassEntity().getId() : null).filter(Objects::nonNull).distinct().count();
        long subjectCount = schedules.stream().map(s -> s.getSubject() != null ? s.getSubject().getId() : null).filter(Objects::nonNull).distinct().count();
        long periodCount = schedules.stream().map(Schedule::getPeriod).filter(Objects::nonNull).count();
        return new QueryPayload(
                Map.of("teacherId", teacherId, "classesCount", classCount, "subjectsCount", subjectCount, "scheduledPeriods", periodCount),
                "Giáo viên hiện phụ trách " + classCount + " lớp, " + subjectCount + " môn, " + periodCount + " tiết."
        );
    }

    public QueryPayload teacherPerformanceOverview(AuthorizationService.AuthContext ctx,
                                                   EntityExtractionService.NormalizedEntities ne) {
        Integer teacherId = ne.getTeacher() != null ? ne.getTeacher().getId() : null;
        if (teacherId == null && "TEACHER".equals(ctx.getRole())) teacherId = ctx.getUserId();
        if (teacherId == null) throw new BadRequestException("Thiếu giáo viên.");
        Set<Integer> classIds = scheduleRepository.findByTeacherId(teacherId).stream()
                .map(s -> s.getClassEntity() != null ? s.getClassEntity().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (classIds.isEmpty()) return new QueryPayload(Map.of("teacherId", teacherId, "classesCount", 0), "Chưa có dữ liệu lớp giảng dạy.");
        List<ExamScore> rows = classIds.stream().flatMap(cid -> examScoreRepository.findByClassEntityId(cid).stream())
                .filter(e -> e.getScore() != null && (e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus())))
                .toList();
        double avg = rows.stream().mapToDouble(ExamScore::getScore).average().orElse(0.0);
        long weak = rows.stream().filter(e -> e.getScore() < 5.0).count();
        return new QueryPayload(
                Map.of("teacherId", teacherId, "classesCount", classIds.size(), "averageScore", round2(avg), "belowFiveCount", weak),
                "Tổng quan giảng dạy: điểm TB " + round2(avg) + ", số điểm dưới 5 là " + weak + "."
        );
    }

    public QueryPayload classAttendanceOverview(EntityExtractionService.NormalizedEntities ne, Map<String, String> entities) {
        ClassEntity cls = ne.getClassEntity();
        if (cls == null) throw new BadRequestException("Thiếu lớp.");
        DateRange range = resolveDateRange(entities);
        List<Attendance> rows = attendanceRepository.findByClassEntityId(cls.getId()).stream()
                .filter(a -> a.getAttendanceDate() != null)
                .filter(a -> !a.getAttendanceDate().isBefore(range.start()) && !a.getAttendanceDate().isAfter(range.end()))
                .toList();
        long present = rows.stream().filter(a -> "PRESENT".equalsIgnoreCase(a.getStatus())).count();
        long absent = rows.stream().filter(a -> "ABSENT".equalsIgnoreCase(a.getStatus())).count();
        long late = rows.stream().filter(a -> "LATE".equalsIgnoreCase(a.getStatus())).count();
        return new QueryPayload(
                Map.of("classId", cls.getId(), "className", cls.getName(), "presentCount", present, "absentCount", absent, "lateCount", late),
                "Chuyên cần lớp " + cls.getName() + ": có mặt " + present + ", nghỉ " + absent + ", đi trễ " + late + "."
        );
    }

    public QueryPayload schoolStatistics(Integer schoolId) {
        List<User> students = userRepository.findBySchoolIdAndRoleName(schoolId, "%STUDENT%");
        long total = students.size();
        long male = students.stream().filter(u -> eqAny(u.getGender(), "MALE", "NAM")).count();
        long female = students.stream().filter(u -> eqAny(u.getGender(), "FEMALE", "NU", "NỮ")).count();
        List<ExamScore> scores = examScoreRepository.findBySchoolId(schoolId).stream()
                .filter(e -> e.getStudent() != null && (e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus())))
                .toList();
        Map<Integer, Double> avgByStu = scores.stream().collect(Collectors.groupingBy(
                e -> e.getStudent().getId(),
                Collectors.averagingDouble(e -> e.getScore() != null ? e.getScore() : 0.0)
        ));
        long gioi = avgByStu.values().stream().filter(v -> v >= 8.0).count();
        long yeu = avgByStu.values().stream().filter(v -> v < 5.0).count();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalStudents", total);
        data.put("maleStudents", male);
        data.put("femaleStudents", female);
        data.put("excellentStudents", gioi);
        data.put("weakStudents", yeu);
        return new QueryPayload(data, "Toàn trường có " + total + " học sinh; giỏi " + gioi + ", yếu " + yeu + ".");
    }

    public QueryPayload studentOverview(AuthorizationService.AuthContext ctx,
                                        EntityExtractionService.NormalizedEntities ne,
                                        Map<String, String> entities,
                                        double threshold) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        QueryPayload avg = studentAverageScore(ctx, ne, entities);
        var weak = studentInfoQueryService.weakSubjects(ctx.getSchoolId(), student.getId(), null, threshold);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentId", student.getId());
        data.put("overall", avg.data());
        data.put("weakSubjects", weak.getWeakSubjectNames());
        data.put("belowFiveCountBySubject", weak.getBelowFiveCountBySubject());
        String answer = weak.getWeakSubjectNames().isEmpty()
                ? safe(student.getFullName()) + " có mức học tập tương đối ổn định."
                : safe(student.getFullName()) + " cần lưu ý các môn: " + String.join(", ", weak.getWeakSubjectNames()) + ".";
        return new QueryPayload(data, answer);
    }

    public QueryPayload studentPrediction(AuthorizationService.AuthContext ctx,
                                          EntityExtractionService.NormalizedEntities ne,
                                          Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        List<ExamScore> rows = examScoreRepository.findBySchoolIdAndStudentId(ctx.getSchoolId(), student.getId()).stream()
                .filter(e -> e.getScore() != null && (e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus())))
                .toList();
        double avg = rows.stream().mapToDouble(ExamScore::getScore).average().orElse(0.0);
        String risk = avg >= 8 ? "LOW" : (avg >= 6.5 ? "MEDIUM" : "HIGH");
        String prediction = "LOW".equals(risk) ? "Khả năng đạt yêu cầu cao." :
                ("MEDIUM".equals(risk) ? "Khả năng đạt yêu cầu ở mức trung bình." : "Nguy cơ không đạt yêu cầu cao nếu không cải thiện.");
        return new QueryPayload(
                Map.of("studentId", student.getId(), "averageScore", round2(avg), "riskLevel", risk),
                safe(student.getFullName()) + ": " + prediction
        );
    }

    public QueryPayload lowestStudentByClass(AuthorizationService.AuthContext ctx,
                                             EntityExtractionService.NormalizedEntities ne,
                                             Map<String, String> entities) {
        QueryPayload top = topStudentsByClass(ctx, ne, Map.of(
                "topN", String.valueOf(Integer.MAX_VALUE),
                "semester", Objects.toString(entities.get("semester"), ""),
                "schoolYear", Objects.toString(entities.get("schoolYear"), "")
        ));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> ranked = (List<Map<String, Object>>) ((Map<String, Object>) top.data()).getOrDefault("students", List.of());
        if (ranked.isEmpty()) {
            return new QueryPayload(top.data(), "Chưa có dữ liệu điểm để xác định học sinh thấp nhất.");
        }
        Map<String, Object> last = ranked.get(ranked.size() - 1);
        return new QueryPayload(Map.of("student", last), "Học sinh điểm thấp nhất hiện tại là " + last.get("fullName") + ".");
    }

    public QueryPayload studentRankInClass(AuthorizationService.AuthContext ctx,
                                           EntityExtractionService.NormalizedEntities ne,
                                           Map<String, String> entities) {
        User student = resolveStudentFromContext(ctx, ne, entities);
        ClassEntity cls = ne.getClassEntity();
        if (cls == null) {
            Enrollment active = resolveActiveEnrollment(student.getId());
            cls = active != null ? active.getClassEntity() : null;
        }
        if (cls == null) throw new BadRequestException("Thiếu lớp để xếp hạng.");
        Subject subject = ne.getSubject();
        String semester = entities.get("semester");
        String schoolYear = entities.get("schoolYear");
        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityIdWithStudents(cls.getId());
        Set<Integer> studentIds = enrollments.stream()
                .filter(e -> e.getStudent() != null && e.getStudent().getId() != null)
                .map(e -> e.getStudent().getId())
                .collect(Collectors.toSet());
        Map<Integer, String> nameById = enrollments.stream()
                .filter(e -> e.getStudent() != null && e.getStudent().getId() != null)
                .collect(Collectors.toMap(e -> e.getStudent().getId(), e -> safe(e.getStudent().getFullName()), (a, b) -> a));
        List<ExamScore> rows = examScoreRepository.findByClassEntityId(cls.getId()).stream()
                .filter(e -> e != null && e.getStudent() != null && studentIds.contains(e.getStudent().getId()))
                .filter(e -> e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .filter(e -> subject == null || (e.getSubject() != null && Objects.equals(e.getSubject().getId(), subject.getId())))
                .filter(e -> matchesSemester(e, semester))
                .filter(e -> matchesSchoolYear(e, schoolYear))
                .toList();
        List<Map<String, Object>> ranked = rows.stream()
                .collect(Collectors.groupingBy(e -> e.getStudent().getId(), Collectors.averagingDouble(e -> e.getScore() != null ? e.getScore() : 0.0)))
                .entrySet().stream()
                .sorted(Map.Entry.<Integer, Double>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("studentId", e.getKey());
                    m.put("fullName", nameById.getOrDefault(e.getKey(), "HS#" + e.getKey()));
                    m.put("averageScore", round2(e.getValue()));
                    return m;
                })
                .collect(Collectors.toList());
        for (int i = 0; i < ranked.size(); i++) ranked.get(i).put("rank", i + 1);
        Map<String, Object> me = ranked.stream().filter(r -> Objects.equals(((Number) r.get("studentId")).intValue(), student.getId())).findFirst().orElse(null);
        if (me == null) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("studentId", student.getId());
            data.put("rank", null);
            return new QueryPayload(data, "Chưa đủ dữ liệu để xếp hạng.");
        }
        return new QueryPayload(me, safe(student.getFullName()) + " đang xếp hạng " + me.get("rank") + " trong lớp.");
    }

    private static boolean matchesSemester(ExamScore e, String semester) {
        if (semester == null || semester.isBlank()) return true;
        String sem = e.getClassSection() != null ? e.getClassSection().getSemester() : null;
        if (sem == null) return true;
        String n = sem.replaceAll("\\D+", "");
        return semester.equals(n) || sem.trim().equalsIgnoreCase("Học kỳ " + semester) || sem.trim().equalsIgnoreCase("HK" + semester);
    }

    private static boolean matchesSchoolYear(ExamScore e, String schoolYear) {
        if (schoolYear == null || schoolYear.isBlank()) return true;
        String sy = e.getClassSection() != null ? e.getClassSection().getSchoolYear() : null;
        if (sy == null) return true;
        return sy.replace("–", "-").trim().equalsIgnoreCase(schoolYear.replace("–", "-").trim());
    }

    private User resolveStudentFromContext(AuthorizationService.AuthContext ctx,
                                           EntityExtractionService.NormalizedEntities ne,
                                           Map<String, String> entities) {
        if (ne.getStudent() != null) return ne.getStudent();
        if ("STUDENT".equals(ctx.getRole())) {
            return userRepository.findById(ctx.getUserId()).orElseThrow(() -> new BadRequestException("Không tìm thấy học sinh đăng nhập."));
        }
        if ("PARENT".equals(ctx.getRole())) {
            List<User> children = parentStudentRepository.findByParentIdFetchStudent(ctx.getUserId()).stream()
                    .map(ps -> ps != null ? ps.getStudent() : null)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            if (children.size() == 1) return children.get(0);
            throw new BadRequestException("Phụ huynh có nhiều con, vui lòng nêu rõ tên học sinh.");
        }
        throw new BadRequestException("Thiếu tên học sinh.");
    }

    private Enrollment resolveActiveEnrollment(Integer studentId) {
        return enrollmentRepository.findByStudentId(studentId).stream()
                .filter(e -> e.getClassEntity() != null)
                .filter(e -> e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .findFirst()
                .orElse(null);
    }

    private DateRange resolveDateRange(Map<String, String> entities) {
        LocalDate today = LocalDate.now();
        String monthStr = entities.get("month");
        if (monthStr != null && !monthStr.isBlank()) {
            int month = parsePositiveInt(monthStr, today.getMonthValue());
            LocalDate first = LocalDate.of(today.getYear(), Math.max(1, Math.min(12, month)), 1);
            return new DateRange(first.atStartOfDay(), first.withDayOfMonth(first.lengthOfMonth()).atTime(23, 59, 59));
        }
        String week = entities.get("week");
        if (week != null && !week.isBlank()) {
            LocalDate start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate end = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            if (week.toLowerCase(Locale.ROOT).contains("truoc")) {
                start = start.minusWeeks(1);
                end = end.minusWeeks(1);
            }
            return new DateRange(start.atStartOfDay(), end.atTime(23, 59, 59));
        }
        return new DateRange(today.minusDays(30).atStartOfDay(), today.atTime(23, 59, 59));
    }

    private static boolean noteContains(String note, String... terms) {
        if (note == null) return false;
        String n = note.toLowerCase(Locale.ROOT);
        for (String t : terms) {
            if (n.contains(t.toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private static String safe(String s) {
        return s == null || s.isBlank() ? "học sinh" : s.trim();
    }

    private static boolean eqAny(String src, String... arr) {
        if (src == null) return false;
        for (String a : arr) if (src.equalsIgnoreCase(a)) return true;
        return false;
    }

    private static int parsePositiveInt(String v, int fallback) {
        try {
            int n = Integer.parseInt(String.valueOf(v).trim());
            return n > 0 ? n : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private static Integer parsePositiveInt(String v, Integer fallback) {
        if (v == null) return fallback;
        try {
            int n = Integer.parseInt(v.trim());
            return n > 0 ? n : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    public record QueryPayload(Object data, String answer) {}
    private record DateRange(LocalDateTime start, LocalDateTime end) {}
}
