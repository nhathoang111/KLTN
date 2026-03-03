package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.service.ClassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
@CrossOrigin(origins = "*")
public class ClassController {

    @Autowired
    private ClassService classService;

    @GetMapping
    public ResponseEntity<?> getClasses() {
        List<ClassEntity> classes = classService.getAllClasses();
        return ResponseEntity.ok(Map.of("classes", classes));
    }

    @GetMapping("/check-students/{classId}")
    public ResponseEntity<?> checkStudentsInClass(@PathVariable Integer classId) {
        Map<String, Object> result = classService.checkStudentsInClass(classId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getClassesBySchool(@PathVariable Integer schoolId) {
        List<ClassEntity> classes = classService.getClassesBySchool(schoolId);
        return ResponseEntity.ok(Map.of("classes", classes));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<?> getClassesByTeacher(@PathVariable Integer teacherId) {
        List<ClassEntity> classes = classService.getClassesByHomeroomTeacher(teacherId);
        return ResponseEntity.ok(Map.of("classes", classes));
    }

    @GetMapping(value = "/{id}/students", produces = "application/json")
    public ResponseEntity<?> getStudentsByClass(@PathVariable Integer id) {
        Map<String, Object> result = classService.getStudentsByClass(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<?> getClass(@PathVariable Integer id) {
        ClassEntity classEntity = classService.getClassById(id);
        return ResponseEntity.ok(classEntity);
    }

    @PostMapping
    public ResponseEntity<?> createClass(@RequestBody Map<String, Object> classData,
                                         @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (userRole != null) {
            String roleUpper = userRole.toUpperCase();
            if ("TEACHER".equals(roleUpper) || roleUpper.startsWith("TEACHER")) {
                return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền tạo lớp học"));
            }
        }
        ClassEntity savedClass = classService.createClass(classData);
        return ResponseEntity.ok(Map.of(
                "message", "Class created successfully",
                "class", savedClass
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClass(@PathVariable Integer id,
                                         @RequestBody Map<String, Object> classData,
                                         @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (userRole != null) {
            String roleUpper = userRole.toUpperCase();
            if ("TEACHER".equals(roleUpper) || roleUpper.startsWith("TEACHER")) {
                return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền sửa lớp học"));
            }
        }
        ClassEntity updatedClass = classService.updateClass(id, classData);
        return ResponseEntity.ok(Map.of(
                "message", "Class updated successfully",
                "class", updatedClass
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable Integer id,
                                         @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (userRole != null) {
            String roleUpper = userRole.toUpperCase();
            if ("TEACHER".equals(roleUpper) || roleUpper.startsWith("TEACHER")) {
                return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền xóa lớp học"));
            }
        }
        classService.deleteClass(id);
        return ResponseEntity.ok(Map.of("message", "Class deleted successfully"));
    }
}
