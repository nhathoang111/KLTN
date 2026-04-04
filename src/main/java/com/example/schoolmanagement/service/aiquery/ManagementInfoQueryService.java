package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class ManagementInfoQueryService {

    @Autowired private ExamScoreRepository examScoreRepository;

    public List<Map<String, Object>> topRiskClasses(Integer schoolId, double threshold, int limit) {
        List<ExamScore> rows = examScoreRepository.findBySchoolId(schoolId);
        if (rows == null || rows.isEmpty()) return List.of();

        // classId -> set(studentId)
        Map<Integer, Set<Integer>> weakByClass = new HashMap<>();
        Map<Integer, String> classIdToName = new HashMap<>();

        for (ExamScore e : rows) {
            if (e == null) continue;
            if (e.getStatus() != null && !"ACTIVE".equalsIgnoreCase(e.getStatus())) continue;
            if (e.getClassEntity() == null || e.getClassEntity().getId() == null) continue;
            if (e.getStudent() == null || e.getStudent().getId() == null) continue;
            if (e.getScore() == null || Double.isNaN(e.getScore())) continue;
            if (e.getScore() >= threshold) continue;

            Integer cid = e.getClassEntity().getId();
            weakByClass.computeIfAbsent(cid, k -> new HashSet<>()).add(e.getStudent().getId());
            if (e.getClassEntity().getName() != null) classIdToName.putIfAbsent(cid, e.getClassEntity().getName());
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<Integer, Set<Integer>> it : weakByClass.entrySet()) {
            Integer cid = it.getKey();
            int cnt = it.getValue() != null ? it.getValue().size() : 0;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("classId", cid);
            row.put("className", classIdToName.getOrDefault(cid, "Lớp " + cid));
            row.put("belowFiveStudentsCount", cnt);
            out.add(row);
        }

        out.sort(Comparator.comparingInt((Map<String, Object> m) -> ((Number) Objects.requireNonNullElse(m.get("belowFiveStudentsCount"), 0)).intValue()).reversed());
        if (out.size() > Math.max(1, limit)) return out.subList(0, limit);
        return out;
    }
}

