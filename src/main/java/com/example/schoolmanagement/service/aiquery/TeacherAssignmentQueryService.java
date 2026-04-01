package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class TeacherAssignmentQueryService {

    @Autowired private ClassSectionRepository classSectionRepository;
    @Autowired private ScheduleRepository scheduleRepository;

    public TeacherAssignmentsResult getAssignments(Integer teacherId) {
        List<ClassSection> sections = classSectionRepository.findByTeacherIdFetchAll(teacherId);
        List<Schedule> schedules = scheduleRepository.findByTeacherId(teacherId);

        // Map classId -> className, and classId -> subjectNames
        Map<Integer, String> classNames = new LinkedHashMap<>();
        Map<Integer, Set<String>> subjectsByClass = new LinkedHashMap<>();

        if (sections != null) {
            for (ClassSection cs : sections) {
                if (cs == null || cs.getClassRoom() == null || cs.getClassRoom().getId() == null) continue;
                Integer cid = cs.getClassRoom().getId();
                String cn = cs.getClassRoom().getName();
                if (cn != null) classNames.putIfAbsent(cid, cn);
                if (cs.getSubject() != null && cs.getSubject().getName() != null) {
                    subjectsByClass.computeIfAbsent(cid, k -> new LinkedHashSet<>()).add(cs.getSubject().getName());
                }
            }
        }
        if (schedules != null) {
            for (Schedule s : schedules) {
                if (s == null || s.getClassEntity() == null || s.getClassEntity().getId() == null) continue;
                Integer cid = s.getClassEntity().getId();
                String cn = s.getClassEntity().getName();
                if (cn != null) classNames.putIfAbsent(cid, cn);

                String sn = null;
                if (s.getSubject() != null) sn = s.getSubject().getName();
                else if (s.getClassSection() != null && s.getClassSection().getSubject() != null) sn = s.getClassSection().getSubject().getName();
                if (sn != null && !sn.isBlank()) {
                    subjectsByClass.computeIfAbsent(cid, k -> new LinkedHashSet<>()).add(sn.trim());
                }
            }
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map.Entry<Integer, String> it : classNames.entrySet()) {
            Integer cid = it.getKey();
            String cn = it.getValue();
            Set<String> subs = subjectsByClass.getOrDefault(cid, Set.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("classId", cid);
            row.put("className", cn);
            row.put("subjects", new ArrayList<>(subs));
            items.add(row);
        }

        // sort by className
        items.sort((a, b) -> {
            String na = Objects.toString(a.get("className"), "");
            String nb = Objects.toString(b.get("className"), "");
            return na.compareToIgnoreCase(nb);
        });

        return new TeacherAssignmentsResult(items);
    }

    public static class TeacherAssignmentsResult {
        private final List<Map<String, Object>> assignments;

        public TeacherAssignmentsResult(List<Map<String, Object>> assignments) {
            this.assignments = assignments;
        }

        public List<Map<String, Object>> getAssignments() { return assignments; }
    }
}

