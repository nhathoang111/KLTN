package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.service.ClassSectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/class-sections")
@CrossOrigin(origins = "*")
public class ClassSectionController {

    @Autowired
    private ClassSectionService classSectionService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        List<ClassSection> list = classSectionService.getAll();
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Integer id) {
        ClassSection cs = classSectionService.getById(id);
        return ResponseEntity.ok(cs);
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getBySchool(@PathVariable Integer schoolId) {
        List<ClassSection> list = classSectionService.getBySchoolId(schoolId);
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @GetMapping("/class/{classRoomId}")
    public ResponseEntity<?> getByClassRoom(@PathVariable Integer classRoomId) {
        List<ClassSection> list = classSectionService.getByClassRoomIdForApi(classRoomId);

        // DTO đơn giản (Map.of không cho null → dùng HashMap tránh 500)
        List<Map<String, Object>> dtoList = list.stream().map(cs -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", cs.getId());
            row.put("semester", cs.getSemester());
            row.put("schoolYear", cs.getSchoolYear());
            row.put("status", cs.getStatus());
            if (cs.getSubject() != null) {
                Map<String, Object> subjectDto = new HashMap<>();
                subjectDto.put("id", cs.getSubject().getId());
                subjectDto.put("name", cs.getSubject().getName());
                row.put("subject", subjectDto);
            } else {
                row.put("subject", null);
            }
            if (cs.getTeacher() != null) {
                Map<String, Object> teacherDto = new HashMap<>();
                teacherDto.put("id", cs.getTeacher().getId());
                teacherDto.put("fullName", cs.getTeacher().getFullName());
                row.put("teacher", teacherDto);
            } else {
                row.put("teacher", null);
            }
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("classSections", dtoList));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<?> getByTeacher(@PathVariable Integer teacherId) {
        List<ClassSection> list = classSectionService.getByTeacherId(teacherId);
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> data,
                                    @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (userRole != null) {
            String roleUpper = userRole.toUpperCase();
            if ("TEACHER".equals(roleUpper) || roleUpper.startsWith("TEACHER")) {
                return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền tạo lớp học phần"));
            }
        }
        ClassSection saved = classSectionService.createFromRequest(data);
        return ResponseEntity.ok(Map.of(
                "message", "Class section created successfully",
                "classSection", saved
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (userRole != null) {
            String roleUpper = userRole.toUpperCase();
            if ("TEACHER".equals(roleUpper) || roleUpper.startsWith("TEACHER")) {
                return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền xóa lớp học phần"));
            }
        }

        classSectionService.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Class section deleted successfully"));
    }
}
