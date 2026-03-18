package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Attendance;
import com.example.schoolmanagement.dto.attendance.AttendanceBulkRequest;
import com.example.schoolmanagement.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<?> getAttendance(
            @RequestParam(required = false) Integer studentId,
            @RequestParam(required = false) Integer classId,
            @RequestParam(required = false) Integer classSectionId,
            @RequestParam(required = false) String date) {
        // New flow: admin fetch by classSection + date
        if (classSectionId != null && date != null && !date.isBlank()) {
            return ResponseEntity.ok(attendanceService.getAttendanceByClassSectionAndDate(classSectionId, date));
        }
        List<Attendance> attendance = attendanceService.getAttendance(studentId, classId, date);
        return ResponseEntity.ok(Map.of("attendance", attendance));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAttendanceRecord(@PathVariable Integer id) {
        Attendance attendance = attendanceService.getAttendanceRecord(id);
        return ResponseEntity.ok(attendance);
    }

    @PostMapping
    public ResponseEntity<?> createAttendance(@RequestBody Map<String, Object> attendanceData,
                                              @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (!isTeacher(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ giáo viên mới được điểm danh."));
        }
        Attendance savedAttendance = attendanceService.createAttendance(attendanceData);

        return ResponseEntity.ok(Map.of(
            "message", "Attendance recorded successfully",
            "attendance", savedAttendance
        ));
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkSave(@RequestBody AttendanceBulkRequest request,
                                      @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (!isTeacher(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ giáo viên mới được điểm danh."));
        }
        return ResponseEntity.ok(attendanceService.saveBulk(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(@PathVariable Integer id,
                                              @RequestBody Map<String, Object> attendanceData,
                                              @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (!isTeacher(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ giáo viên mới được điểm danh."));
        }
        Attendance updatedAttendance = attendanceService.updateAttendance(id, attendanceData);

        return ResponseEntity.ok(Map.of(
            "message", "Attendance updated successfully",
            "attendance", updatedAttendance
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Integer id,
                                              @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (!isTeacher(userRole)) {
            return ResponseEntity.status(403).body(Map.of("error", "Chỉ giáo viên mới được điểm danh."));
        }
        attendanceService.deleteAttendance(id);
        return ResponseEntity.ok(Map.of("message", "Attendance deleted successfully"));
    }

    private boolean isTeacher(String userRole) {
        if (userRole == null) return false;
        String r = userRole.toUpperCase();
        return "TEACHER".equals(r) || r.startsWith("TEACHER") || "GIÁO VIÊN".equals(r);
    }
}
