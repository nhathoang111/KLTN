/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.TeacherSubjectRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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

    @Autowired
    private TeacherSubjectRepository teacherSubjectRepository;

    @Autowired
    private UserRepository userRepository;

    /** Số lớp đang học từng môn (subjectId -> count). Đếm theo thời khóa biểu (Schedule). */
    public Map<Integer, Long> getSubjectClassCounts() {
        List<Object[]> rows = scheduleRepository.countDistinctClassesBySubjectIdFromSchedules();
        Map<Integer, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Integer) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    /** Danh sách lớp đang học môn (id, name) – dùng projection để tránh lazy load khi serialize. */
    public List<Map<String, Object>> getClassesBySubjectId(Integer subjectId) {
        getSubjectById(subjectId);
        List<Object[]> rows = scheduleRepository.findDistinctClassIdAndNameBySubjectId(subjectId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", row[0]);
            map.put("name", row[1]);
            list.add(map);
        }
        return list;
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public List<Subject> getSubjectsBySchool(Integer schoolId) {
        return subjectRepository.findBySchoolIdOrderBySortIndex(schoolId);
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
        String rawName = subjectData.get("name") instanceof String ? (String) subjectData.get("name") : null;
        String rawCode = subjectData.get("code") instanceof String ? (String) subjectData.get("code") : null;
        subject.setName(rawName != null ? rawName.trim() : null);
        subject.setCode(rawCode != null ? rawCode.trim() : null);
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
        if (subject.getName() == null || subject.getName().isEmpty()) {
            throw new BadRequestException("Subject name is required");
        }
        if (subject.getCode() == null || subject.getCode().isEmpty()) {
            throw new BadRequestException("Subject code is required");
        }
        if (subject.getStatus() == null || subject.getStatus().trim().isEmpty()) {
            subject.setStatus("ACTIVE");
        }
        assertUniqueSubjectForCreate(schoolId, subject.getName(), subject.getCode());
        return saveSubject(subject);
    }

    public Subject updateSubject(Integer id, Subject subject) {
        Subject existing = getSubjectById(id);

        String effectiveName = existing.getName();
        String effectiveCode = existing.getCode();
        if (subject.getName() != null) {
            String t = subject.getName().trim();
            if (t.isEmpty()) {
                throw new BadRequestException("Subject name is required");
            }
            effectiveName = t;
            existing.setName(t);
        }
        if (subject.getCode() != null) {
            String t = subject.getCode().trim();
            if (t.isEmpty()) {
                throw new BadRequestException("Subject code is required");
            }
            effectiveCode = t;
            existing.setCode(t);
        }
        if (subject.getSchool() != null) {
            existing.setSchool(subject.getSchool());
        }
        if (subject.getStatus() != null) existing.setStatus(subject.getStatus());
        if (subject.getDeletedAt() != null) existing.setDeletedAt(subject.getDeletedAt());

        Integer effectiveSchoolId = null;
        if (existing.getSchool() != null && existing.getSchool().getId() != null) {
            effectiveSchoolId = existing.getSchool().getId();
        }
        assertUniqueSubjectForUpdate(effectiveSchoolId, effectiveName, effectiveCode, id);
        return saveSubject(existing);
    }

    /**
     * Trùng theo cùng phạm vi với DB: (code, school_id) và (name, school_id).
     */
    private void assertUniqueSubjectForCreate(Integer schoolId, String name, String code) {
        if (schoolId != null) {
            if (subjectRepository.findBySchoolIdAndCode(schoolId, code).isPresent()) {
                throw new BadRequestException("Mã môn đã tồn tại trong trường này");
            }
            if (subjectRepository.findByNameAndSchoolId(name, schoolId).isPresent()) {
                throw new BadRequestException("Tên môn đã tồn tại trong trường này");
            }
        } else {
            if (subjectRepository.existsByCodeWithSchoolNull(code)) {
                throw new BadRequestException("Mã môn đã tồn tại (chưa gán trường)");
            }
            if (subjectRepository.existsByNameWithSchoolNull(name)) {
                throw new BadRequestException("Tên môn đã tồn tại (chưa gán trường)");
            }
        }
    }

    private void assertUniqueSubjectForUpdate(Integer schoolId, String name, String code, Integer excludeId) {
        if (schoolId != null) {
            if (subjectRepository.existsOtherByCodeInSchool(schoolId, code, excludeId)) {
                throw new BadRequestException("Mã môn đã tồn tại trong trường này");
            }
            if (subjectRepository.existsOtherByNameInSchool(schoolId, name, excludeId)) {
                throw new BadRequestException("Tên môn đã tồn tại trong trường này");
            }
        } else {
            if (subjectRepository.existsOtherByCodeWithSchoolNull(code, excludeId)) {
                throw new BadRequestException("Mã môn đã tồn tại (chưa gán trường)");
            }
            if (subjectRepository.existsOtherByNameWithSchoolNull(name, excludeId)) {
                throw new BadRequestException("Tên môn đã tồn tại (chưa gán trường)");
            }
        }
    }

    /**
     * Danh sách giáo viên dạy 1 môn (dựa trên bảng teacher_subjects).
     * Trả về DTO tối giản: { id, fullName }.
     */
    public List<Map<String, Object>> getTeachersBySubjectId(Integer subjectId) {
        if (subjectId == null) throw new BadRequestException("Thiếu subjectId");

        Subject subject = getSubjectById(subjectId);
        Integer subjSchoolId = subject.getSchool() != null ? subject.getSchool().getId() : null;

        List<Integer> teacherIds = teacherSubjectRepository.findTeacherIdsBySubjectId(subjectId);
        if (teacherIds == null || teacherIds.isEmpty()) return List.of();

        List<User> users = userRepository.findAllById(teacherIds);
        List<Map<String, Object>> teachers = new ArrayList<>();
        for (User u : users) {
            if (u == null) continue;
            // Chặn trường hợp join trả về user khác trường (nếu dữ liệu bẩn)
            if (subjSchoolId != null) {
                if (u.getSchool() == null || u.getSchool().getId() == null) continue;
                if (!subjSchoolId.equals(u.getSchool().getId())) continue;
            }
            if (u.getRole() == null || u.getRole().getName() == null) continue;
            String rn = u.getRole().getName().toUpperCase();
            boolean isTeacher = rn.startsWith("TEACHER") || rn.contains("TEACHER") || rn.contains("GIÁO VIÊN") || rn.contains("GIAO VIEN") || rn.contains("GV");
            if (!isTeacher) continue;

            Map<String, Object> row = new HashMap<>();
            row.put("id", u.getId());
            row.put("fullName", u.getFullName());
            teachers.add(row);
        }
        return teachers;
    }

    public void deleteSubject(Integer id) {
        getSubjectById(id);
        subjectRepository.deleteById(id);
    }
}
