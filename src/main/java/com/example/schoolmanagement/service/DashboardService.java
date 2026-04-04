package com.example.schoolmanagement.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class DashboardService {

    public Map<String, Object> getDashboardData() {
        return Map.of(
                "message", "Dashboard data retrieved successfully",
                "stats", Map.of(
                        "totalSchools", 5,
                        "totalUsers", 18,
                        "totalClasses", 6,
                        "totalSubjects", 10
                ),
                "recentActivities", Map.of(
                        "newEnrollments", 3,
                        "recentAssignments", 2,
                        "pendingApprovals", 1
                )
        );
    }
}
