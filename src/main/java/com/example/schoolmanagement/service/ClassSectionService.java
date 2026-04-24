package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.util.ClassStatusPolicy;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ClassSectionService {

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    public List<ClassSection> getAll() {
        return classSectionRepository.findAll();
    }

    public ClassSection getById(Integer id) {
        return classSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class section not found with id: " + id));
    }

    public List<ClassSection> getBySchoolId(Integer schoolId) {
        return classSectionRepository.findBySchoolId(schoolId);
    }

    public List<ClassSection> getByClassRoomId(Integer classRoomId) {
        return classSectionRepository.findByClassRoomId(classRoomId);
    }

    /** Dùng cho API list theo lớp: load subject + teacher trong 1 query, tránh lazy 500. */
    public List<ClassSection> getByClassRoomIdForApi(Integer classRoomId) {
        return classSectionRepository.findByClassRoomIdFetchSubjectTeacher(classRoomId);
    }

    public List<ClassSection> getByTeacherId(Integer teacherId) {
        return classSectionRepository.findByTeacherIdFetchAll(teacherId);
    }

    public ClassSection save(ClassSection classSection) {
        return classSectionRepository.save(classSection);
    }

    public ClassSection createFromRequest(Map<String, Object> data) {
        Integer classId = toInt(data.get("classId"));
        Integer subjectId = toInt(data.get("subjectId"));
        Integer teacherId = toInt(data.get("teacherId"));
        String semester = toStr(data.get("semester"));
        String schoolYear = toStr(data.get("schoolYear"));
        String status = toStr(data.get("status"));

        if (classId == null) throw new BadRequestException("Thiếu classId");
        if (subjectId == null) throw new BadRequestException("Thiếu subjectId");
        if (teacherId == null) throw new BadRequestException("Thiếu teacherId");
        if (semester == null || semester.isBlank()) throw new BadRequestException("Thiếu semester");
        if (schoolYear == null || schoolYear.isBlank()) throw new BadRequestException("Thiếu schoolYear");
        if (status == null || status.isBlank()) status = "ACTIVE";

        ClassEntity cls = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));
        ClassStatusPolicy.assertTeachActionAllowed(cls, "gán môn vào lớp");
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + teacherId));

        // Optional guard: subject and teacher should belong to same school as the class (if present).
        Integer schoolId = (cls.getSchool() != null ? cls.getSchool().getId() : null);
        if (schoolId != null) {
            if (subject.getSchool() != null && subject.getSchool().getId() != null && !schoolId.equals(subject.getSchool().getId())) {
                throw new BadRequestException("Môn học không thuộc cùng trường với lớp");
            }
            if (teacher.getSchool() != null && teacher.getSchool().getId() != null && !schoolId.equals(teacher.getSchool().getId())) {
                throw new BadRequestException("Giáo viên không thuộc cùng trường với lớp");
            }
        }

        ClassSection cs = new ClassSection();
        cs.setClassRoom(cls);
        cs.setSubject(subject);
        cs.setTeacher(teacher);
        cs.setSemester(semester.trim());
        cs.setSchoolYear(schoolYear.trim());
        cs.setStatus(status.trim());

        try {
            return classSectionRepository.save(cs);
        } catch (DataIntegrityViolationException e) {
            // Unique constraint: class_room_id + subject_id + semester + school_year
            throw new BadRequestException("Lớp học phần đã tồn tại (trùng lớp/môn/học kỳ/năm học)");
        }
    }

    public void deleteById(Integer id) {
        if (id == null) throw new BadRequestException("Thiếu id lớp học phần");
        // Check tồn tại để trả lỗi 404 thay vì silent fail
        ClassSection cs = getById(id);
        ClassStatusPolicy.assertTeachActionAllowed(cs.getClassRoom(), "xóa gán môn vào lớp");
        try {
            classSectionRepository.deleteById(id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Thường do FK (ví dụ lịch học / quan hệ khác) đang trỏ tới class_section này
            throw new BadRequestException("Không thể xóa lớp học phần này vì dữ liệu đang được sử dụng ở nơi khác.");
        }
    }

    private Integer toInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number) return ((Number) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return null; }
    }

    private String toStr(Object v) {
        return v == null ? null : v.toString();
    }
}
