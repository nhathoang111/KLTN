package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Attendance;
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
            @RequestParam(required = false) String date) {
        List<Attendance> attendance = attendanceService.getAttendance(studentId, classId, date);
        return ResponseEntity.ok(Map.of("attendance", attendance));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAttendanceRecord(@PathVariable Integer id) {
        Attendance attendance = attendanceService.getAttendanceRecord(id);
        return ResponseEntity.ok(attendance);
    }

    @PostMapping
    public ResponseEntity<?> createAttendance(@RequestBody Map<String, Object> attendanceData) {
        Attendance savedAttendance = attendanceService.createAttendance(attendanceData);

        return ResponseEntity.ok(Map.of(
            "message", "Attendance recorded successfully",
            "attendance", savedAttendance
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(@PathVariable Integer id, @RequestBody Map<String, Object> attendanceData) {
        Attendance updatedAttendance = attendanceService.updateAttendance(id, attendanceData);

        return ResponseEntity.ok(Map.of(
            "message", "Attendance updated successfully",
            "attendance", updatedAttendance
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Integer id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.ok(Map.of("message", "Attendance deleted successfully"));
    }
}
