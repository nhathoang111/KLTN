package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "*")
public class ScheduleController {

    @Autowired
    private ScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<?> getAllSchedules(
            @RequestParam(required = false) Integer classId,
            @RequestParam(required = false) Integer schoolId,
            @RequestParam(required = false) Integer teacherId) {
        List<Schedule> schedules;
        if (classId != null) {
            schedules = scheduleService.getSchedulesByClass(classId);
        } else if (schoolId != null) {
            schedules = scheduleService.getSchedulesBySchool(schoolId);
        } else if (teacherId != null) {
            schedules = scheduleService.getSchedulesByTeacher(teacherId);
        } else {
            schedules = scheduleService.getAllSchedules();
        }
        return ResponseEntity.ok(Map.of("schedules", schedules));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getScheduleById(@PathVariable Integer id) {
        Schedule schedule = scheduleService.getScheduleById(id);
        return ResponseEntity.ok(schedule);
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getSchedulesByClass(@PathVariable Integer classId) {
        List<Schedule> schedules = scheduleService.getSchedulesByClass(classId);
        return ResponseEntity.ok(Map.of("schedules", schedules));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getSchedulesBySchool(@PathVariable Integer schoolId) {
        List<Schedule> schedules = scheduleService.getSchedulesBySchool(schoolId);
        return ResponseEntity.ok(Map.of("schedules", schedules));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<?> getSchedulesByTeacher(@PathVariable Integer teacherId) {
        List<Schedule> schedules = scheduleService.getSchedulesByTeacher(teacherId);
        return ResponseEntity.ok(Map.of("schedules", schedules));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getSchedulesByStudent(@PathVariable Integer studentId) {
        List<Schedule> schedules = scheduleService.getSchedulesByStudent(studentId);
        return ResponseEntity.ok(Map.of("schedules", schedules));
    }

    @PostMapping
    public ResponseEntity<?> createSchedule(@RequestBody Map<String, Object> scheduleData) {
        Schedule savedSchedule = scheduleService.createSchedule(scheduleData);
        String warning = (savedSchedule.getClassSection() == null)
                ? "Chưa có phân công chính thức cho lớp–môn–giáo viên này (class_section)."
                : null;
        return ResponseEntity.ok(Map.of(
                "schedule", savedSchedule,
                "warning", warning
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchedule(@PathVariable Integer id, @RequestBody Map<String, Object> scheduleData) {
        Schedule updatedSchedule = scheduleService.updateSchedule(id, scheduleData);
        String warning = (updatedSchedule.getClassSection() == null)
                ? "Chưa có phân công chính thức cho lớp–môn–giáo viên này (class_section)."
                : null;
        return ResponseEntity.ok(Map.of(
                "schedule", updatedSchedule,
                "warning", warning
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable Integer id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(Map.of("message", "Schedule deleted successfully"));
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateSchedules(@RequestBody Map<String, Object> request) {
        Object classIdObj = request.get("classId");
        Integer classId = classIdObj instanceof Integer ? (Integer) classIdObj : null;
        if (classId == null && classIdObj instanceof Number) {
            classId = ((Number) classIdObj).intValue();
        }
        Integer schoolId = request.get("schoolId") instanceof Integer ? (Integer) request.get("schoolId") : null;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> subjectAssignments = (List<Map<String, Object>>) request.get("subjectAssignments");
        Integer numberOfWeeks = request.get("numberOfWeeks") instanceof Integer
                ? (Integer) request.get("numberOfWeeks") : 1;

        if (classId == null || subjectAssignments == null || subjectAssignments.isEmpty()) {
            throw new BadRequestException("classId and subjectAssignments are required");
        }

        int createdCount = scheduleService.generateSchedules(classId, schoolId, subjectAssignments, numberOfWeeks);
        return ResponseEntity.ok(Map.of(
                "message", "Schedules generated successfully",
                "count", createdCount));
    }

    @DeleteMapping("/class/{classId}")
    public ResponseEntity<?> deleteSchedulesByClass(@PathVariable Integer classId) {
        int deletedCount = scheduleService.deleteAllSchedulesByClass(classId);
        return ResponseEntity.ok(Map.of(
                "message", "Schedules deleted successfully",
                "count", deletedCount));
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllSchedules() {
        int deletedCount = scheduleService.deleteAllSchedules();
        return ResponseEntity.ok(Map.of(
                "message", "All schedules deleted successfully",
                "count", deletedCount));
    }
}
