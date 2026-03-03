package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<?> getDashboardData() {
        return ResponseEntity.ok(dashboardService.getDashboardData());
    }
}
