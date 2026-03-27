package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.dto.ai.GradeAnalysisRequest;
import com.example.schoolmanagement.dto.ai.GradeAnalysisResponse;
import com.example.schoolmanagement.service.GeminiGradeAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class GradeAnalysisController {

    @Autowired
    private GeminiGradeAnalysisService geminiGradeAnalysisService;

    @PostMapping("/grade-analysis")
    public ResponseEntity<?> analyze(@RequestBody GradeAnalysisRequest request) {
        GradeAnalysisResponse resp = geminiGradeAnalysisService.analyzeGrade(request);
        return ResponseEntity.ok(resp);
    }
}

