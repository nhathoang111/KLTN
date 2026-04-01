package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ExamScoreService {

    @Autowired
    private ExamScoreRepository examScoreRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SubjectRepository subjectRepository;
    @Autowired
    private ClassRepository classRepository;
    @Autowired
    private SchoolRepository schoolRepository;
    @Autowired
    private ScheduleRepository scheduleRepository;
    @Autowired
    private EnrollmentRepository enrollmentRepository;

    private static Integer parseInteger(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof String) {
            String s = (String) obj;
            if (s.isEmpty()) return null;
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private void validateTeacherSubject(Integer currentUserId, String currentUserRole, Integer subjectId, boolean isCreate) {
        if (currentUserId == null || currentUserRole == null || !"TEACHER".equals(currentUserRole.toUpperCase()) || subjectId == null) {
            return;
        }
        List<com.example.schoolmanagement.entity.Schedule> teacherSchedules = scheduleRepository.findByTeacherId(currentUserId);
        // Một số trường hợp TKB đã tạo nhưng Schedule.subject bị null (hoặc không set đúng).
        // Khi đó fallback qua schedule.classSection.subject để vẫn đối chiếu được môn giáo viên phụ trách.
        boolean isAssigned = teacherSchedules.stream().anyMatch(schedule -> {
            Integer sid = null;
            if (schedule.getSubject() != null) {
                sid = schedule.getSubject().getId();
            } else if (schedule.getClassSection() != null && schedule.getClassSection().getSubject() != null) {
                sid = schedule.getClassSection().getSubject().getId();
            }
            return sid != null && sid.equals(subjectId);
        });
        if (!isAssigned) {
            String msg = isCreate
                    ? "Bạn không có quyền thêm điểm cho môn học này. Chỉ có thể thêm điểm cho các môn học bạn phụ trách."
                    : "Bạn không có quyền sửa điểm cho môn học này. Chỉ có thể sửa điểm cho các môn học bạn phụ trách.";
            throw new ForbiddenException(msg);
        }
    }

    public List<ExamScore> getExamScores(Integer studentId, Integer subjectId, Integer classId, Integer schoolId) {
        List<ExamScore> scores;
        if (schoolId != null) {
            scores = examScoreRepository.findBySchoolId(schoolId);
        } else if (studentId != null) {
            scores = examScoreRepository.findByStudentId(studentId);
        } else if (subjectId != null) {
            scores = examScoreRepository.findBySubjectId(subjectId);
        } else if (classId != null) {
            scores = examScoreRepository.findByClassEntityId(classId);
        } else {
            scores = examScoreRepository.findAll();
        }
        if (studentId != null && scores != null) {
            scores = scores.stream().filter(score -> score.getStudent().getId().equals(studentId)).toList();
        }
        return scores;
    }

    public ExamScore getExamScore(Integer id) {
        return examScoreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam score not found with id: " + id));
    }

    public ExamScore createExamScore(Map<String, Object> scoreData, Integer currentUserId, String currentUserRole) {
        Integer subjectId = parseInteger(scoreData.get("subjectId"));
        if (subjectId == null && scoreData.get("subjectId") != null) {
            throw new BadRequestException("Invalid subject ID format");
        }
        validateTeacherSubject(currentUserId, currentUserRole, subjectId, true);

        ExamScore examScore = new ExamScore();
        Integer studentId = parseInteger(scoreData.get("studentId"));
        if (studentId == null) {
            throw new BadRequestException("Student ID is required");
        }
        examScore.setStudent(userRepository.findById(studentId)
                .orElseThrow(() -> new BadRequestException("Invalid student ID")));
        examScore.setSchool(examScore.getStudent().getSchool());

        if (subjectId == null) {
            throw new BadRequestException("Subject ID is required");
        }
        examScore.setSubject(subjectRepository.findById(subjectId)
                .orElseThrow(() -> new BadRequestException("Invalid subject ID")));

        Integer classId = parseInteger(scoreData.get("classId"));
        if (classId != null) {
            examScore.setClassEntity(classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID")));
        } else if (scoreData.get("classId") != null) {
            throw new BadRequestException("Invalid class ID format");
        }

        Object scoreObj = scoreData.get("score");
        if (scoreObj == null) throw new BadRequestException("Score is required");
        Double scoreValue = ((Number) scoreObj).doubleValue();
        if (scoreValue < 0 || scoreValue > 10) {
            throw new BadRequestException("Score must be between 0 and 10");
        }
        examScore.setScore(scoreValue);

        String scoreType = (String) scoreData.get("scoreType");
        examScore.setScoreType(scoreType == null || scoreType.isEmpty() ? "15P" : scoreType);
        Integer attempt = parseInteger(scoreData.get("attempt"));
        if (attempt == null || attempt < 1) attempt = 1;
        examScore.setAttempt(attempt);
        examScore.setNote((String) scoreData.get("note"));
        examScore.setStatus("ACTIVE");

        return examScoreRepository.save(examScore);
    }

    public ExamScore updateExamScore(Integer id, Map<String, Object> scoreData, Integer currentUserId, String currentUserRole) {
        ExamScore examScore = getExamScore(id);
        Integer subjectId = examScore.getSubject() != null ? examScore.getSubject().getId() : null;
        if (scoreData.containsKey("subjectId")) {
            subjectId = parseInteger(scoreData.get("subjectId"));
        }
        validateTeacherSubject(currentUserId, currentUserRole, subjectId, false);

        if (scoreData.containsKey("studentId")) {
            Integer studentId = parseInteger(scoreData.get("studentId"));
            if (studentId != null) {
                examScore.setStudent(userRepository.findById(studentId)
                        .orElseThrow(() -> new BadRequestException("Invalid student ID")));
                examScore.setSchool(examScore.getStudent().getSchool());
            } else {
                throw new BadRequestException("Invalid student ID format");
            }
        }
        if (scoreData.containsKey("subjectId")) {
            Integer subId = parseInteger(scoreData.get("subjectId"));
            if (subId != null) {
                examScore.setSubject(subjectRepository.findById(subId)
                        .orElseThrow(() -> new BadRequestException("Invalid subject ID")));
            } else {
                throw new BadRequestException("Invalid subject ID format");
            }
        }
        if (scoreData.containsKey("classId")) {
            Integer classId = parseInteger(scoreData.get("classId"));
            if (classId != null) {
                examScore.setClassEntity(classRepository.findById(classId)
                        .orElseThrow(() -> new BadRequestException("Invalid class ID")));
            } else {
                throw new BadRequestException("Invalid class ID format");
            }
        }
        if (scoreData.containsKey("score")) {
            Double scoreValue = ((Number) scoreData.get("score")).doubleValue();
            if (scoreValue < 0 || scoreValue > 10) throw new BadRequestException("Score must be between 0 and 10");
            examScore.setScore(scoreValue);
        }
        if (scoreData.containsKey("scoreType")) {
            String scoreType = (String) scoreData.get("scoreType");
            if (scoreType != null && !scoreType.isEmpty()) examScore.setScoreType(scoreType);
        }
        if (scoreData.containsKey("attempt")) {
            Integer attempt = parseInteger(scoreData.get("attempt"));
            if (attempt != null && attempt >= 1) examScore.setAttempt(attempt);
        }
        if (scoreData.containsKey("note")) {
            examScore.setNote((String) scoreData.get("note"));
        }
        return examScoreRepository.save(examScore);
    }

    public void deleteExamScore(Integer id) {
        if (!examScoreRepository.existsById(id)) {
            throw new ResourceNotFoundException("Exam score not found with id: " + id);
        }
        examScoreRepository.deleteById(id);
    }

    public Map<String, Object> getScoreLockStatus(Integer schoolId) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School not found with id: " + schoolId));
        return Map.of(
                "schoolId", schoolId,
                "scoreLocked", school.getScoreLocked() != null ? school.getScoreLocked() : false
        );
    }

    public Map<String, Object> updateScoreLockStatus(Integer schoolId, Map<String, Object> lockData) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School not found with id: " + schoolId));
        Boolean scoreLocked = (Boolean) lockData.get("scoreLocked");
        if (scoreLocked == null) {
            throw new BadRequestException("scoreLocked field is required");
        }
        school.setScoreLocked(scoreLocked);
        School updated = schoolRepository.save(school);
        return Map.of(
                "message", scoreLocked ? "Score locked successfully" : "Score unlocked successfully",
                "schoolId", schoolId,
                "scoreLocked", updated.getScoreLocked()
        );
    }

    /**
     * Bảng điểm thành phần + TBM cho admin (một lớp, một môn). TBM chỉ tính trên server.
     */
    public Map<String, Object> getTbmSummary(Integer classId, Integer subjectId) {
        if (classId == null || subjectId == null) {
            throw new BadRequestException("classId và subjectId là bắt buộc");
        }
        classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp id=" + classId));
        subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn id=" + subjectId));

        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityIdWithStudents(classId);
        enrollments = enrollments.stream()
                .filter(e -> e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());
        List<User> students = enrollments.stream()
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .filter(u -> u.getRole() != null && studentRole(u.getRole().getName()))
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a, LinkedHashMap::new))
                .values()
                .stream()
                .sorted((a, b) -> {
                    String na = a.getFullName() != null ? a.getFullName() : "";
                    String nb = b.getFullName() != null ? b.getFullName() : "";
                    return na.compareToIgnoreCase(nb);
                })
                .collect(Collectors.toList());

        List<ExamScore> scoresForSubject = examScoreRepository.findByClassEntityId(classId).stream()
                .filter(e -> e.getSubject() != null && e.getSubject().getId().equals(subjectId))
                .collect(Collectors.toList());

        List<Map<String, Object>> rows = new ArrayList<>();
        for (User st : students) {
            Integer sid = st.getId();
            Double oral = findComponentScore(scoresForSubject, sid, "MIENG", 1);
            Double p15 = findComponentScore(scoresForSubject, sid, "15P", 1);
            Double t1 = findComponentScore(scoresForSubject, sid, "1TIET", 1);
            Double ck = findComponentScore(scoresForSubject, sid, "CUOIKI", 1);
            Double tbm = computeTbmFromStandardComponents(oral, p15, t1, ck);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", sid);
            row.put("fullName", st.getFullName());
            row.put("email", st.getEmail());
            row.put("oral1", oral);
            row.put("p151", p15);
            row.put("t1", t1);
            row.put("ck1", ck);
            row.put("tbm", tbm);
            rows.add(row);
        }
        return Map.of("rows", rows);
    }

    private static boolean studentRole(String roleName) {
        if (roleName == null) return false;
        String u = roleName.toUpperCase();
        return "STUDENT".equals(u) || u.startsWith("STUDENT");
    }

    private static Double findComponentScore(List<ExamScore> scores, Integer studentId, String scoreType, int attempt) {
        String want = scoreType.trim().toUpperCase();
        for (ExamScore e : scores) {
            if (e.getStudent() == null || !e.getStudent().getId().equals(studentId)) continue;
            String st = e.getScoreType() == null ? "15P" : e.getScoreType().trim().toUpperCase();
            int att = e.getAttempt() == null ? 1 : e.getAttempt();
            if (st.equals(want) && att == attempt) {
                return e.getScore();
            }
        }
        return null;
    }

    /**
     * TBM — công thức duy nhất (server); frontend không tự tính.
     * <p>
     * {@code TBM = (Miệng×1 + 15P×1 + 1T×2 + CK×3) / tổng hệ số các thành phần có điểm}
     * (hệ số 1+1+2+3 = 7 khi đủ cả bốn loại).
     * </p>
     *
     * @param mieng1 MIENG attempt 1, 15P attempt 1, 1TIET attempt 1, CUOIKI attempt 1
     * @return null nếu không có điểm thành phần nào
     */
    public static Double computeTbmFromStandardComponents(Double mieng1, Double diem15pLan1, Double motTietLan1, Double cuoiKyLan1) {
        double numerator = 0;
        double denominator = 0;
        if (isScorePresent(mieng1)) {
            numerator += mieng1 * 1;
            denominator += 1;
        }
        if (isScorePresent(diem15pLan1)) {
            numerator += diem15pLan1 * 1;
            denominator += 1;
        }
        if (isScorePresent(motTietLan1)) {
            numerator += motTietLan1 * 2;
            denominator += 2;
        }
        if (isScorePresent(cuoiKyLan1)) {
            numerator += cuoiKyLan1 * 3;
            denominator += 3;
        }
        if (denominator <= 0) {
            return null;
        }
        double tbm = numerator / denominator;
        return Math.round(tbm * 10.0) / 10.0;
    }

    private static boolean isScorePresent(Double d) {
        return d != null && !d.isNaN();
    }
    
}
