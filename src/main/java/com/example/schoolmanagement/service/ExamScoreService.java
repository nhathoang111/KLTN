package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

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
        boolean isAssigned = teacherSchedules.stream()
                .anyMatch(schedule -> schedule.getSubject() != null && schedule.getSubject().getId().equals(subjectId));
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
}
