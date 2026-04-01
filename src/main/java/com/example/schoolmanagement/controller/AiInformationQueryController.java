package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.dto.ai.query.AiInformationQueryRequest;
import com.example.schoolmanagement.dto.ai.query.AiInformationQueryResponse;
import com.example.schoolmanagement.service.aiquery.AiInformationQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiInformationQueryController {

    @Autowired
    private AiInformationQueryService aiInformationQueryService;

    @PostMapping("/information-query")
    public ResponseEntity<AiInformationQueryResponse> query(
            @RequestBody AiInformationQueryRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String currentUserRole
    ) {
        return ResponseEntity.ok(aiInformationQueryService.handle(request, currentUserId, currentUserRole));
    }
}

