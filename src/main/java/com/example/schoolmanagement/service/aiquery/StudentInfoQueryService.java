package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class StudentInfoQueryService {

    @Autowired private ExamScoreRepository examScoreRepository;
    @Autowired private SubjectRepository subjectRepository;

    public WeakSubjectsResult weakSubjects(Integer schoolId, Integer studentId, Set<String> allowedPairsOrNull, double threshold) {
        if (schoolId == null) throw new BadRequestException("Thiếu schoolId");
        if (studentId == null) throw new BadRequestException("Thiếu studentId");

        List<ExamScore> rows = examScoreRepository.findBySchoolIdAndStudentId(schoolId, studentId);
        if (rows == null || rows.isEmpty()) return new WeakSubjectsResult(List.of(), Map.of());

        Set<Integer> weakSubjectIds = new HashSet<>();
        Map<Integer, Integer> belowFiveCountBySubject = new HashMap<>();

        for (ExamScore e : rows) {
            if (e == null) continue;
            if (e.getStatus() != null && !"ACTIVE".equalsIgnoreCase(e.getStatus())) continue;
            if (e.getScore() == null || Double.isNaN(e.getScore())) continue;
            if (e.getSubject() == null || e.getSubject().getId() == null) continue;
            if (e.getClassEntity() == null || e.getClassEntity().getId() == null) continue;

            if (allowedPairsOrNull != null) {
                String pair = e.getClassEntity().getId() + "-" + e.getSubject().getId();
                if (!allowedPairsOrNull.contains(pair)) continue;
            }

            if (e.getScore() < threshold) {
                Integer sid = e.getSubject().getId();
                weakSubjectIds.add(sid);
                belowFiveCountBySubject.put(sid, belowFiveCountBySubject.getOrDefault(sid, 0) + 1);
            }
        }

        List<Subject> allSubjects = subjectRepository.findBySchoolIdOrderBySortIndex(schoolId);
        Map<Integer, String> subjectIdToName = new HashMap<>();
        if (allSubjects != null) {
            for (Subject s : allSubjects) {
                if (s != null && s.getId() != null) subjectIdToName.put(s.getId(), s.getName());
            }
        }

        List<String> names = new ArrayList<>();
        for (Integer sid : weakSubjectIds) {
            String name = subjectIdToName.getOrDefault(sid, "Môn " + sid);
            names.add(name);
        }
        names.sort(String::compareToIgnoreCase);

        Map<String, Object> countsBySubjectName = new HashMap<>();
        for (Map.Entry<Integer, Integer> it : belowFiveCountBySubject.entrySet()) {
            String name = subjectIdToName.getOrDefault(it.getKey(), "Môn " + it.getKey());
            countsBySubjectName.put(name, it.getValue());
        }
        return new WeakSubjectsResult(names, countsBySubjectName);
    }

    public static class WeakSubjectsResult {
        private final List<String> weakSubjectNames;
        private final Map<String, Object> belowFiveCountBySubject;

        public WeakSubjectsResult(List<String> weakSubjectNames, Map<String, Object> belowFiveCountBySubject) {
            this.weakSubjectNames = weakSubjectNames;
            this.belowFiveCountBySubject = belowFiveCountBySubject;
        }

        public List<String> getWeakSubjectNames() { return weakSubjectNames; }
        public Map<String, Object> getBelowFiveCountBySubject() { return belowFiveCountBySubject; }
    }
}

