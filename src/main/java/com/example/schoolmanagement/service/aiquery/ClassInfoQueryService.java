package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class ClassInfoQueryService {

    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private ExamScoreRepository examScoreRepository;
    @Autowired private UserRepository userRepository;

    public long classStudentCount(Integer classId) {
        if (classId == null) throw new BadRequestException("Thiếu classId");
        return enrollmentRepository.countActiveByClassEntityId(classId);
    }

    public int classRiskStudentsCount(Integer classId, double threshold) {
        if (classId == null) throw new BadRequestException("Thiếu classId");
        List<ExamScore> rows = examScoreRepository.findByClassEntityId(classId);
        if (rows == null || rows.isEmpty()) return 0;
        Set<Integer> students = new HashSet<>();
        for (ExamScore e : rows) {
            if (e == null) continue;
            if (e.getStatus() != null && !"ACTIVE".equalsIgnoreCase(e.getStatus())) continue;
            if (e.getStudent() == null || e.getStudent().getId() == null) continue;
            if (e.getScore() == null || Double.isNaN(e.getScore())) continue;
            if (e.getScore() < threshold) students.add(e.getStudent().getId());
        }
        return students.size();
    }

    public int classSubjectRiskStudentsCount(Integer classId, Integer subjectId, double threshold) {
        if (classId == null) throw new BadRequestException("Thiếu classId");
        if (subjectId == null) throw new BadRequestException("Thiếu subjectId");
        List<ExamScore> rows = examScoreRepository.findByClassEntityId(classId);
        if (rows == null || rows.isEmpty()) return 0;
        Set<Integer> students = new HashSet<>();
        for (ExamScore e : rows) {
            if (e == null) continue;
            if (e.getStatus() != null && !"ACTIVE".equalsIgnoreCase(e.getStatus())) continue;
            if (e.getStudent() == null || e.getStudent().getId() == null) continue;
            if (e.getSubject() == null || e.getSubject().getId() == null) continue;
            if (!Objects.equals(e.getSubject().getId(), subjectId)) continue;
            if (e.getScore() == null || Double.isNaN(e.getScore())) continue;
            if (e.getScore() < threshold) students.add(e.getStudent().getId());
        }
        return students.size();
    }

    public String homeroomTeacherName(ClassEntity cls) {
        if (cls == null) return null;
        User t = cls.getHomeroomTeacher();
        if (t == null || t.getId() == null) return null;
        // ensure fullName loaded
        User u = userRepository.findById(t.getId()).orElse(null);
        return u != null ? u.getFullName() : t.getFullName();
    }
}

