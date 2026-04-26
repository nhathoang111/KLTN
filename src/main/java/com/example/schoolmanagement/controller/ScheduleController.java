package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.dto.schedule.ScheduleTemplateSaveRequest;
import com.example.schoolmanagement.dto.schedule.GenerateFromTemplateRequest;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.ScheduleTemplate;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.service.ScheduleService;
import com.example.schoolmanagement.service.ScheduleTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "*")
public class ScheduleController {

    @Autowired
    private ScheduleService scheduleService;
    @Autowired
    private ScheduleTemplateService scheduleTemplateService;

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
        // Map.of không cho phép value null — warning=null khi đã có class_section sẽ gây NPE → 500
        Map<String, Object> body = new HashMap<>();
        body.put("schedule", savedSchedule);
        body.put("warning", warning);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchedule(@PathVariable Integer id, @RequestBody Map<String, Object> scheduleData) {
        Schedule updatedSchedule = scheduleService.updateSchedule(id, scheduleData);
        String warning = (updatedSchedule.getClassSection() == null)
                ? "Chưa có phân công chính thức cho lớp–môn–giáo viên này (class_section)."
                : null;
        Map<String, Object> body = new HashMap<>();
        body.put("schedule", updatedSchedule);
        body.put("warning", warning);
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable Integer id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(Map.of("message", "Schedule deleted successfully"));
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateSchedules(@RequestBody Map<String, Object> request) {
        throw new BadRequestException("Chức năng tạo thời khóa biểu tự động đã tắt. Vui lòng sinh từ thời khóa biểu mẫu.");
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

    @PostMapping("/template")
    public ResponseEntity<?> saveScheduleTemplate(@RequestBody ScheduleTemplateSaveRequest request) {
        List<ScheduleTemplate> templates = scheduleTemplateService.saveTemplate(request);
        return ResponseEntity.ok(Map.of(
                "message", "Đã lưu thời khóa biểu mẫu thành công.",
                "templates", templates,
                "count", templates.size()));
    }

    @GetMapping("/template/class/{classId}")
    public ResponseEntity<?> getScheduleTemplate(@PathVariable Integer classId,
                                                 @RequestParam String weekStart) {
        if (weekStart == null || weekStart.trim().isEmpty()) {
            throw new BadRequestException("weekStart is required");
        }
        List<ScheduleTemplate> templates = scheduleTemplateService.getTemplateByClassAndWeekStart(
                classId, java.time.LocalDate.parse(weekStart.trim()));
        return ResponseEntity.ok(Map.of(
                "templates", templates,
                "count", templates.size()));
    }

    @DeleteMapping("/template/class/{classId}")
    public ResponseEntity<?> deleteScheduleTemplate(@PathVariable Integer classId,
                                                    @RequestParam String weekStart) {
        if (weekStart == null || weekStart.trim().isEmpty()) {
            throw new BadRequestException("weekStart is required");
        }
        int deletedCount = scheduleTemplateService.deleteTemplate(classId, java.time.LocalDate.parse(weekStart.trim()));
        return ResponseEntity.ok(Map.of(
                "message", "Đã xóa thời khóa biểu mẫu thành công.",
                "count", deletedCount));
    }

    @PostMapping("/generate-from-template")
    public ResponseEntity<?> generateFromTemplate(@RequestBody GenerateFromTemplateRequest request) {
        return ResponseEntity.ok(scheduleTemplateService.generateFromTemplate(request));
    }
}
