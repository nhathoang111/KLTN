package com.example.schoolmanagement.service;

import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final JdbcTemplate jdbcTemplate;

    public DashboardService(
            SchoolRepository schoolRepository,
            UserRepository userRepository,
            SubjectRepository subjectRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.schoolRepository = schoolRepository;
        this.userRepository = userRepository;
        this.subjectRepository = subjectRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getDashboardData() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSchools", schoolRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalClasses", countNonDeletedRecords("classes"));
        stats.put("totalStudents", countNonDeletedStudents());
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

    private long countNonDeletedStudents() {
        StringBuilder sql = new StringBuilder(
                "SELECT COUNT(*) FROM users u " +
                "JOIN roles r ON r.id = u.role_id " +
                "WHERE UPPER(r.name) LIKE 'STUDENT%'"
        );
        String userDeleteFilter = buildNonDeletedPredicate("users");
        if (!userDeleteFilter.isBlank()) {
            sql.append(" AND ").append(userDeleteFilter);
        }
        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class);
        return count == null ? 0L : count;
    }

    private long countNonDeletedRecords(String tableName) {
        String sql = "SELECT COUNT(*) FROM " + tableName;
        String predicate = buildNonDeletedPredicate(tableName);
        if (!predicate.isBlank()) {
            sql += " WHERE " + predicate;
        }
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count == null ? 0L : count;
    }

    private String buildNonDeletedPredicate(String tableName) {
        StringBuilder predicate = new StringBuilder();
        if (hasColumn(tableName, "deleted_at")) {
            predicate.append("deleted_at IS NULL");
        }
        if (hasColumn(tableName, "is_deleted")) {
            if (predicate.length() > 0) {
                predicate.append(" AND ");
            }
            predicate.append("(is_deleted = FALSE OR is_deleted = 0 OR is_deleted IS NULL)");
        }
        return predicate.toString();
    }

    private boolean hasColumn(String tableName, String columnName) {
        String sql =
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }
}
