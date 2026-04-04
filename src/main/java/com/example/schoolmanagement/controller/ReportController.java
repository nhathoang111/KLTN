package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Record;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.service.RecordService;
import com.example.schoolmanagement.service.SchoolService;
import com.example.schoolmanagement.service.ClassService;
import com.example.schoolmanagement.repository.RecordRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private RecordService recordService;

    @Autowired
    private SchoolService schoolService;

    @Autowired
    private ClassService classService;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private ClassRepository classRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> getSystemStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            
            // Get basic counts
            long totalSchools = schoolRepository.count();
            long totalClasses = classRepository.count();
            long totalUsers = recordRepository.count();
            
            // Get record counts by type
            long examRecords = recordRepository.countByType("EXAM");
            long attendanceRecords = recordRepository.countByType("ATTENDANCE");
            long behaviorRecords = recordRepository.countByType("BEHAVIOR");
            
            stats.put("totalSchools", totalSchools);
            stats.put("totalClasses", totalClasses);
            stats.put("totalUsers", totalUsers);
            stats.put("examRecords", examRecords);
            stats.put("attendanceRecords", attendanceRecords);
            stats.put("behaviorRecords", behaviorRecords);
            
            // Get recent activity (last 30 days)
            LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
            long recentRecords = recordRepository.countByDateAfter(thirtyDaysAgo);
            stats.put("recentRecords", recentRecords);
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch system stats"));
        }
    }

    @GetMapping("/school/{schoolId}/stats")
    public ResponseEntity<?> getSchoolStats(@PathVariable Integer schoolId) {
        try {
            Map<String, Object> stats = new HashMap<>();
            
            // Get school info
            School school = schoolService.getSchoolById(schoolId);
            if (school == null) {
                return ResponseEntity.notFound().build();
            }
            
            stats.put("school", school);
            
            // Get class count for this school
            long classCount = classRepository.countBySchoolId(schoolId);
            stats.put("classCount", classCount);
            
            // Get record counts by type for this school
            long examRecords = recordRepository.countBySchoolIdAndType(schoolId, "EXAM");
            long attendanceRecords = recordRepository.countBySchoolIdAndType(schoolId, "ATTENDANCE");
            long behaviorRecords = recordRepository.countBySchoolIdAndType(schoolId, "BEHAVIOR");
            
            stats.put("examRecords", examRecords);
            stats.put("attendanceRecords", attendanceRecords);
            stats.put("behaviorRecords", behaviorRecords);
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch school stats"));
        }
    }

    @GetMapping("/class/{classId}/stats")
    public ResponseEntity<?> getClassStats(@PathVariable Integer classId) {
        try {
            Map<String, Object> stats = new HashMap<>();
            
            // Get class info
            ClassEntity classEntity = classService.getClassById(classId);
            if (classEntity == null) {
                return ResponseEntity.notFound().build();
            }
            
            stats.put("class", classEntity);
            
            // Get record counts by type for this class
            long examRecords = recordRepository.countByClassEntityIdAndType(classId, "EXAM");
            long attendanceRecords = recordRepository.countByClassEntityIdAndType(classId, "ATTENDANCE");
            long behaviorRecords = recordRepository.countByClassEntityIdAndType(classId, "BEHAVIOR");
            
            stats.put("examRecords", examRecords);
            stats.put("attendanceRecords", attendanceRecords);
            stats.put("behaviorRecords", behaviorRecords);
            
            // Get average scores
            List<Record> examRecordsList = recordRepository.findByClassEntityIdAndType(classId, "EXAM");
            if (!examRecordsList.isEmpty()) {
                double avgScore = examRecordsList.stream()
                    .filter(r -> r.getValue() != null)
                    .mapToDouble(Record::getValue)
                    .average()
                    .orElse(0.0);
                stats.put("averageScore", avgScore);
            }
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch class stats"));
        }
    }

    @GetMapping("/exam-scores")
    public ResponseEntity<?> getExamScoreReport(@RequestParam(required = false) Integer schoolId,
                                               @RequestParam(required = false) Integer classId,
                                               @RequestParam(required = false) Integer subjectId,
                                               @RequestParam(required = false) String startDate,
                                               @RequestParam(required = false) String endDate) {
        try {
            List<Record> records = recordService.getExamScores(schoolId, classId, subjectId);
            
            // Filter by date range if provided
            if (startDate != null && endDate != null) {
                LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
                LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");
                records = records.stream()
                    .filter(r -> r.getDate() != null && 
                               r.getDate().isAfter(start) && 
                               r.getDate().isBefore(end))
                    .collect(Collectors.toList());
            }
            
            // Calculate statistics
            Map<String, Object> report = new HashMap<>();
            report.put("records", records);
            report.put("totalRecords", records.size());
            
            if (!records.isEmpty()) {
                double avgScore = records.stream()
                    .filter(r -> r.getValue() != null)
                    .mapToDouble(Record::getValue)
                    .average()
                    .orElse(0.0);
                
                double maxScore = records.stream()
                    .filter(r -> r.getValue() != null)
                    .mapToDouble(Record::getValue)
                    .max()
                    .orElse(0.0);
                
                double minScore = records.stream()
                    .filter(r -> r.getValue() != null)
                    .mapToDouble(Record::getValue)
                    .min()
                    .orElse(0.0);
                
                report.put("averageScore", avgScore);
                report.put("maxScore", maxScore);
                report.put("minScore", minScore);
            }
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to generate exam score report"));
        }
    }

    @GetMapping("/attendance")
    public ResponseEntity<?> getAttendanceReport(@RequestParam(required = false) Integer schoolId,
                                                @RequestParam(required = false) Integer classId,
                                                @RequestParam(required = false) String startDate,
                                                @RequestParam(required = false) String endDate) {
        try {
            List<Record> records = recordService.getAttendanceRecords(schoolId, classId);
            
            // Filter by date range if provided
            if (startDate != null && endDate != null) {
                LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
                LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");
                records = records.stream()
                    .filter(r -> r.getDate() != null && 
                               r.getDate().isAfter(start) && 
                               r.getDate().isBefore(end))
                    .collect(Collectors.toList());
            }
            
            // Calculate attendance statistics
            Map<String, Object> report = new HashMap<>();
            report.put("records", records);
            report.put("totalRecords", records.size());
            
            if (!records.isEmpty()) {
                long presentCount = records.stream()
                    .filter(r -> "PRESENT".equals(r.getStatus()))
                    .count();
                
                long absentCount = records.stream()
                    .filter(r -> "ABSENT".equals(r.getStatus()))
                    .count();
                
                long lateCount = records.stream()
                    .filter(r -> "LATE".equals(r.getStatus()))
                    .count();
                
                double attendanceRate = (double) presentCount / records.size() * 100;
                
                report.put("presentCount", presentCount);
                report.put("absentCount", absentCount);
                report.put("lateCount", lateCount);
                report.put("attendanceRate", attendanceRate);
            }
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to generate attendance report"));
        }
    }

    @GetMapping("/behavior")
    public ResponseEntity<?> getBehaviorReport(@RequestParam(required = false) Integer schoolId,
                                              @RequestParam(required = false) Integer classId,
                                              @RequestParam(required = false) String startDate,
                                              @RequestParam(required = false) String endDate) {
        try {
            List<Record> records = recordService.getBehaviorRecords(schoolId, classId);
            
            // Filter by date range if provided
            if (startDate != null && endDate != null) {
                LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
                LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");
                records = records.stream()
                    .filter(r -> r.getDate() != null && 
                               r.getDate().isAfter(start) && 
                               r.getDate().isBefore(end))
                    .collect(Collectors.toList());
            }
            
            // Calculate behavior statistics
            Map<String, Object> report = new HashMap<>();
            report.put("records", records);
            report.put("totalRecords", records.size());
            
            if (!records.isEmpty()) {
                Map<String, Long> behaviorCounts = records.stream()
                    .filter(r -> r.getStatus() != null)
                    .collect(Collectors.groupingBy(Record::getStatus, Collectors.counting()));
                
                report.put("behaviorCounts", behaviorCounts);
            }
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to generate behavior report"));
        }
    }

    @GetMapping("/export/excel")
    public ResponseEntity<?> exportToExcel(@RequestParam String reportType,
                                          @RequestParam(required = false) Integer schoolId,
                                          @RequestParam(required = false) Integer classId,
                                          @RequestParam(required = false) String startDate,
                                          @RequestParam(required = false) String endDate) {
        try {
            // This would typically generate an Excel file
            // For now, we'll return a mock response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Excel export functionality would be implemented here");
            response.put("reportType", reportType);
            response.put("schoolId", schoolId);
            response.put("classId", classId);
            response.put("startDate", startDate);
            response.put("endDate", endDate);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to export to Excel"));
        }
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<?> exportToPdf(@RequestParam String reportType,
                                       @RequestParam(required = false) Integer schoolId,
                                       @RequestParam(required = false) Integer classId,
                                       @RequestParam(required = false) String startDate,
                                       @RequestParam(required = false) String endDate) {
        try {
            // This would typically generate a PDF file
            // For now, we'll return a mock response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "PDF export functionality would be implemented here");
            response.put("reportType", reportType);
            response.put("schoolId", schoolId);
            response.put("classId", classId);
            response.put("startDate", startDate);
            response.put("endDate", endDate);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to export to PDF"));
        }
    }
}
