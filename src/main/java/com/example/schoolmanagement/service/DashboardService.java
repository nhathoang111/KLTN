package com.example.schoolmanagement.service;

import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final ClassRepository classRepository;
    private final SubjectRepository subjectRepository;

    public DashboardService(
            SchoolRepository schoolRepository,
            UserRepository userRepository,
            ClassRepository classRepository,
            SubjectRepository subjectRepository
    ) {
        this.schoolRepository = schoolRepository;
        this.userRepository = userRepository;
        this.classRepository = classRepository;
        this.subjectRepository = subjectRepository;
    }

    public Map<String, Object> getDashboardData() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSchools", schoolRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalClasses", classRepository.count());
        stats.put("totalSubjects", subjectRepository.count());

        Map<String, Object> recentActivities = new HashMap<>();
        recentActivities.put("newEnrollments", 0);
        recentActivities.put("recentAssignments", 0);
        recentActivities.put("pendingApprovals", 0);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Dashboard data retrieved successfully");
        response.put("generatedAt", OffsetDateTime.now().toString());
        response.put("stats", stats);
        response.put("recentActivities", recentActivities);
        return response;
    }
}
