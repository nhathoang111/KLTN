package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.dto.ai.ClassAiInsightRequest;
import com.example.schoolmanagement.dto.ai.StudentAiInsightRequest;
import com.example.schoolmanagement.service.AiInsightService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/insights")
@CrossOrigin(origins = "*")
public class AiInsightController {

    @Autowired
    private AiInsightService aiInsightService;

    /**
     * Admin: phân tích điểm theo lớp, tìm môn yếu và gửi thông báo cho giáo viên phụ trách (class_sections.teacher).
     */
    @PostMapping("/class")
    public ResponseEntity<?> analyzeClass(
            @RequestBody ClassAiInsightRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole
    ) {
        Map<String, Object> result = aiInsightService.analyzeClassAndNotifyTeachers(request, currentUserId, currentUserRole);
        return ResponseEntity.ok(result);
    }

    /**
     * GVCN/GV: phân tích điểm theo học sinh; nếu có môn < 5.0 thì gửi thông báo cho phụ huynh liên kết.
     */
    @PostMapping("/student")
    public ResponseEntity<?> analyzeStudent(
            @RequestBody StudentAiInsightRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole
    ) {
        Map<String, Object> result = aiInsightService.analyzeStudentAndNotifyParents(request, currentUserId, currentUserRole);
        return ResponseEntity.ok(result);
    }
}

