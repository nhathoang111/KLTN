package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.dto.ai.GradeAnalysisRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisResponse;
import com.example.schoolmanagement.dto.ai.TeacherManagementSummaryResponse;
import com.example.schoolmanagement.service.GeminiGradeAnalysisService;
import com.example.schoolmanagement.service.TeacherDashboardManagementAiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class GradeAnalysisController {

    @Autowired
    private GeminiGradeAnalysisService geminiGradeAnalysisService;
    @Autowired
    private TeacherDashboardManagementAiService teacherDashboardManagementAiService;

    @PostMapping("/grade-analysis")
    public ResponseEntity<?> analyze(@RequestBody GradeAnalysisRequest request) {
        GradeAnalysisResponse resp = geminiGradeAnalysisService.analyzeGrade(request);
        return ResponseEntity.ok(resp);
    }

    /**
     * Dashboard giáo viên: tổng quan quản lý (phạm vi lớp/môn phụ trách). Số liệu do backend tính; Gemini chỉ viết summary/concerns/recommendations.
     */
    @PostMapping("/teacher-management-summary")
    public ResponseEntity<TeacherManagementSummaryResponse> teacherManagementSummary(
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole
    ) {
        TeacherManagementSummaryResponse resp = teacherDashboardManagementAiService.buildManagementSummary(
                currentUserId,
                currentUserRole
        );
        return ResponseEntity.ok(resp);
    }
}

