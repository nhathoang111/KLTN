package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.service.ClassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
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

    @GetMapping("/counts/students")
    public ResponseEntity<?> getStudentCounts() {
        Map<Integer, Integer> counts = classService.getStudentCountByClassId();
        Map<String, Integer> json = new java.util.HashMap<>();
        counts.forEach((id, count) -> json.put(String.valueOf(id), count));
        return ResponseEntity.ok(json);
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

    /** Lưu trữ toàn bộ lớp thuộc một niên khóa (theo tên) của trường. */
    @PostMapping("/actions/archive-school-year")
    public ResponseEntity<?> archiveSchoolYear(@RequestBody Map<String, Object> body,
                                               @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (isTeacherRole(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền thao tác này"));
        }
        if (isAdminRole(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin không sử dụng thao tác này"));
        }
        Integer schoolId = parseInteger(body.get("schoolId"));
        String sy = body.get("schoolYear") != null ? body.get("schoolYear").toString().trim() : null;
        int n = classService.archiveClassesForSchoolYear(schoolId, sy);
        return ResponseEntity.ok(Map.of(
                "message", "Đã lưu trữ " + n + " lớp.",
                "archivedCount", n
        ));
    }

    /**
     * Body: schoolId (tuỳ chọn, kiểm tra lớp đích), moves: [{studentId, toClassId}], graduateStudentIds: [..] (tốt nghiệp / không chuyển tiếp).
     */
    @PostMapping("/actions/promote-students")
    public ResponseEntity<?> promoteStudents(@RequestBody Map<String, Object> body,
                                             @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (isTeacherRole(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền thao tác này"));
        }
        Integer schoolId = body.containsKey("schoolId") ? parseInteger(body.get("schoolId")) : null;
        Object movesObj = body.get("moves");
        List<?> moves = (movesObj instanceof List<?>) ? (List<?>) movesObj : Collections.emptyList();
        Object gradsObj = body.get("graduateStudentIds");
        List<?> grads = (gradsObj instanceof List<?>) ? (List<?>) gradsObj : Collections.emptyList();
        Map<String, Object> result = classService.promoteStudents(schoolId, moves, grads);
        return ResponseEntity.ok(result);
    }

    /**
     * Body: schoolId, fromSchoolYear, toSchoolYear — chuyển toàn bộ lớp niên khóa nguồn sang đích (lên khối);
     * khối 12 nguồn chỉ lưu trữ (kết thúc cấp cho niên khóa đó).
     */
    @PostMapping("/actions/rollover-school-year")
    public ResponseEntity<?> rolloverSchoolYear(@RequestBody Map<String, Object> body,
                                                @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (isTeacherRole(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Giáo viên không có quyền thao tác này"));
        }
        Integer schoolId = parseInteger(body.get("schoolId"));
        String fromSy = body.get("fromSchoolYear") != null ? body.get("fromSchoolYear").toString().trim() : null;
        String toSy = body.get("toSchoolYear") != null ? body.get("toSchoolYear").toString().trim() : null;
        Map<String, Object> result = classService.rolloverSchoolYear(schoolId, fromSy, toSy);
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
        return ResponseEntity.ok(Map.of("message", "Đã lưu trữ lớp (dữ liệu được giữ lại)."));
    }

    private static boolean isTeacherRole(String userRole) {
        if (userRole == null) return false;
        String u = userRole.toUpperCase();
        return "TEACHER".equals(u) || u.startsWith("TEACHER");
    }

    private static boolean isAdminRole(String userRole) {
        if (userRole == null) return false;
        String u = userRole.toUpperCase();
        return "ADMIN".equals(u) || u.startsWith("ADMIN_");
    }

    private static Integer parseInteger(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        return Integer.parseInt(o.toString().trim());
    }
}
