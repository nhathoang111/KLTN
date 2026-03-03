package com.example.schoolmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
@RestController
public class SchoolManagementApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(SchoolManagementApplication.class, args);
    }
    
    @GetMapping("/")
    public Map<String, String> home() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "School Management System is running!");
        response.put("status", "success");
        response.put("database", "H2 in-memory");
        return response;
    }
    
    @GetMapping("/api/test")
    public Map<String, Object> test() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "API is working!");
        response.put("timestamp", System.currentTimeMillis());
        response.put("status", "success");
        response.put("version", "1.0.0");
        return response;
    }
    
    @GetMapping("/api/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "School Management API");
        response.put("database", "H2");
        return response;
    }
}