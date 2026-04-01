package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.service.ExamScoreImportService;
import com.example.schoolmanagement.service.ExamScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-scores")
@CrossOrigin(origins = "*")
public class ExamScoreController {

    @Autowired
    private ExamScoreService examScoreService;
    
    @Autowired
    private ExamScoreImportService importService;

    @GetMapping
    public ResponseEntity<?> getExamScores(
            @RequestParam(required = false) Integer studentId,
            @RequestParam(required = false) Integer subjectId,
            @RequestParam(required = false) Integer classId,
            @RequestParam(required = false) Integer schoolId) {
        List<ExamScore> scores = examScoreService.getExamScores(studentId, subjectId, classId, schoolId);
        return ResponseEntity.ok(Map.of("examScores", scores));
    }

    /** Phải đặt trước GET /{id} để không bị coi là id. */
    @GetMapping("/tbm-summary")
    public ResponseEntity<?> getTbmSummary(
            @RequestParam Integer classId,
            @RequestParam Integer subjectId) {
        return ResponseEntity.ok(examScoreService.getTbmSummary(classId, subjectId));
    }

    /** Chỉ số — tránh trùng path chữ (vd. /tbm-summary) với /{id}. */
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<?> getExamScore(@PathVariable Integer id) {
        ExamScore score = examScoreService.getExamScore(id);
        return ResponseEntity.ok(score);
    }

    @PostMapping
    public ResponseEntity<?> createExamScore(
            @RequestBody Map<String, Object> scoreData,
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        ExamScore savedScore = examScoreService.createExamScore(scoreData, currentUserId, currentUserRole);
        return ResponseEntity.ok(Map.of(
                "message", "Exam score created successfully",
                "examScore", savedScore
        ));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<?> updateExamScore(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> scoreData,
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        ExamScore updatedScore = examScoreService.updateExamScore(id, scoreData, currentUserId, currentUserRole);
        return ResponseEntity.ok(Map.of(
                "message", "Exam score updated successfully",
                "examScore", updatedScore
        ));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<?> deleteExamScore(@PathVariable Integer id) {
        examScoreService.deleteExamScore(id);
        return ResponseEntity.ok(Map.of("message", "Exam score deleted successfully"));
    }

    @GetMapping("/lock-status/{schoolId}")
    public ResponseEntity<?> getScoreLockStatus(@PathVariable Integer schoolId) {
        return ResponseEntity.ok(examScoreService.getScoreLockStatus(schoolId));
    }

    @PutMapping("/lock-status/{schoolId}")
    public ResponseEntity<?> updateScoreLockStatus(@PathVariable Integer schoolId, @RequestBody Map<String, Object> lockData) {
        return ResponseEntity.ok(examScoreService.updateScoreLockStatus(schoolId, lockData));
    }
    
     @PostMapping("/import")
    public ResponseEntity<?> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-School-Id", required = false) Integer schoolId
    ) {
        String roleUpper = role == null ? "" : role.trim().toUpperCase();

        if (schoolId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu X-School-Id"));
        }

        if (!roleUpper.contains("ADMIN") && !roleUpper.contains("TEACHER")) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        return ResponseEntity.ok(importService.importExcel(file, schoolId));
    }
}
