package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.service.UserImportService;
import com.example.schoolmanagement.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserImportService userImportService;

    @GetMapping
    public ResponseEntity<?> getUsers(@RequestParam(required = false) String userRole,
                                      @RequestParam(required = false) Integer schoolId,
                                      @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        List<Map<String, Object>> users = userService.getUsersFilteredAndEnriched(userRole, schoolId, currentUserRole);
        return ResponseEntity.ok(Map.of("users", users));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getUsersBySchool(@PathVariable Integer schoolId) {
        List<User> users = userService.getUsersBySchool(schoolId);
        return ResponseEntity.ok(Map.of("users", users));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importFromExcel(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole,
            @RequestHeader(value = "X-User-School-Id", required = false) Integer currentUserSchoolId) {
        if (currentUserRole == null || currentUserRole.isBlank()) {
            return ResponseEntity.status(403).body(Map.of("error", "Thiếu thông tin quyền (X-User-Role). Vui lòng đăng nhập lại."));
        }
        UserImportService.ImportResult result = userImportService.importFromExcel(file, currentUserRole.trim(), currentUserSchoolId);
        return ResponseEntity.ok(Map.of(
                "message", "Import xong",
                "successCount", result.getSuccessCount(),
                "failCount", result.getFailCount(),
                "errors", result.getErrors()
        ));
    }

    @GetMapping(value = "/import-template", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] body = userImportService.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mau_nhap_nguoi_dung.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Integer id,
                                    @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
                                    @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        if (currentUserRole != null && currentUserRole.toUpperCase().contains("STUDENT") && currentUserId != null && !id.equals(currentUserId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Học sinh chỉ được xem thông tin cá nhân của chính mình."));
        }
        Map<String, Object> user = userService.getUserForEdit(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userData,
                                        @RequestParam(required = false) String currentUserRole,
                                        @RequestParam(required = false) Integer currentUserSchoolId) {
        User savedUser = userService.createUser(userData, currentUserRole, currentUserSchoolId);
        return ResponseEntity.ok(Map.of(
                "message", "User created successfully",
                "user", savedUser
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody Map<String, Object> userData) {
        userService.updateUser(id, userData);
        Map<String, Object> user = userService.getUserForEdit(id);
        return ResponseEntity.ok(Map.of(
                "message", "User updated successfully",
                "user", user
        ));
    }

    @GetMapping("/test-class-enrichment")
    public ResponseEntity<?> testClassEnrichment(@RequestParam(defaultValue = "62") Integer studentId) {
        return ResponseEntity.ok(userService.testClassEnrichment(studentId));
    }

    @GetMapping("/{id}/enrollment")
    public ResponseEntity<?> getStudentEnrollment(@PathVariable Integer id,
                                                  @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
                                                  @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        if (currentUserRole != null && currentUserRole.toUpperCase().contains("STUDENT") && currentUserId != null && !id.equals(currentUserId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Học sinh chỉ được xem thông tin của chính mình."));
        }
        return ResponseEntity.ok(userService.getStudentEnrollment(id));
    }

    @GetMapping("/{id}/parent-students")
    public ResponseEntity<?> getParentStudentIds(@PathVariable Integer id) {
        List<Integer> studentIds = userService.getStudentIdsForParent(id);
        return ResponseEntity.ok(Map.of("studentIds", studentIds));
    }

    @GetMapping("/{id}/teacher-subjects")
    public ResponseEntity<?> getTeacherSubjectIds(@PathVariable Integer id) {
        List<Integer> subjectIds = userService.getSubjectIdsForTeacher(id);
        return ResponseEntity.ok(Map.of("subjectIds", subjectIds));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
