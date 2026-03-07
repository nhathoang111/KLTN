/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SubjectService {
    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    /** Số lớp đang học từng môn (subjectId -> count). Đếm theo thời khóa biểu (Schedule). */
    public Map<Integer, Long> getSubjectClassCounts() {
        List<Object[]> rows = scheduleRepository.countDistinctClassesBySubjectIdFromSchedules();
        Map<Integer, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Integer) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public List<Subject> getSubjectsBySchool(Integer schoolId) {
        return subjectRepository.findBySchoolId(schoolId);
    }

    public Subject getSubjectById(Integer id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));
    }

    public Subject saveSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public Subject createSubject(Map<String, Object> subjectData) {
        Subject subject = new Subject();
        subject.setName((String) subjectData.get("name"));
        subject.setCode((String) subjectData.get("code"));
        Object schoolIdObj = subjectData.get("schoolId");
        Integer schoolId = null;
        if (schoolIdObj instanceof Integer) {
            schoolId = (Integer) schoolIdObj;
        } else if (schoolIdObj instanceof Number) {
            schoolId = ((Number) schoolIdObj).intValue();
        }
        if (schoolId != null) {
            subject.setSchool(schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }
        if (subject.getName() == null || subject.getName().trim().isEmpty()) {
            throw new BadRequestException("Subject name is required");
        }
        if (subject.getCode() == null || subject.getCode().trim().isEmpty()) {
            throw new BadRequestException("Subject code is required");
        }
        if (subject.getStatus() == null || subject.getStatus().trim().isEmpty()) {
            subject.setStatus("ACTIVE");
        }
        return saveSubject(subject);
    }

    public Subject updateSubject(Integer id, Subject subject) {
        Subject existing = getSubjectById(id);
        if (subject.getName() != null) existing.setName(subject.getName());
        if (subject.getCode() != null) existing.setCode(subject.getCode());
        if (subject.getSchool() != null) existing.setSchool(subject.getSchool());
        if (subject.getStatus() != null) existing.setStatus(subject.getStatus());
        if (subject.getDeletedAt() != null) existing.setDeletedAt(subject.getDeletedAt());
        return saveSubject(existing);
    }

    public void deleteSubject(Integer id) {
        getSubjectById(id);
        subjectRepository.deleteById(id);
    }
}
