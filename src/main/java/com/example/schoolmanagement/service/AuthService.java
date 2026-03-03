package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Validates credentials, checks school lock, returns response payload for login.
     * @throws BadRequestException if credentials invalid or school locked
     */
    public Map<String, Object> login(String email, String password) {
        if (email == null || password == null) {
            throw new BadRequestException("Email and password are required");
        }

        User user;
        try {
            user = userService.findByEmail(email);
        } catch (ResourceNotFoundException ex) {
            throw new BadRequestException("Invalid credentials");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash()) &&
                !password.equals(user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }

        String roleName = user.getRole().getName().toUpperCase();
        String roleType = "GUEST";
        boolean isSuperAdmin = false;

        if (roleName.equals("SUPER_ADMIN")) {
            roleType = "SUPER_ADMIN";
            isSuperAdmin = true;
        } else if (roleName.equals("ADMIN")) {
            roleType = "ADMIN";
        } else if (roleName.equals("TEACHER")) {
            roleType = "TEACHER";
        } else if (roleName.equals("STUDENT")) {
            roleType = "STUDENT";
        } else if (roleName.startsWith("ADMIN")) {
            roleType = "ADMIN";
        } else if (roleName.startsWith("TEACHER")) {
            roleType = "TEACHER";
        } else if (roleName.startsWith("STUDENT")) {
            roleType = "STUDENT";
        }

        if (!isSuperAdmin && user.getSchool() != null) {
            String schoolStatus = user.getSchool().getStatus();
            if (schoolStatus != null &&
                    (schoolStatus.equals("LOCKED") || schoolStatus.equals("INACTIVE"))) {
                throw new BadRequestException("Tài khoản của bạn không thể đăng nhập vì trường học đã bị khóa. Vui lòng liên hệ quản trị viên.");
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail());
        userInfo.put("fullName", user.getFullName());
        userInfo.put("role", Map.of(
                "id", user.getRole().getId(),
                "name", roleType,
                "description", user.getRole().getDescription()
        ));
        if (user.getSchool() != null) {
            userInfo.put("school", Map.of(
                    "id", user.getSchool().getId(),
                    "name", user.getSchool().getName(),
                    "code", user.getSchool().getCode()
            ));
        }
        response.put("user", userInfo);
        return response;
    }

    public void register(Map<String, Object> userData) {
        throw new BadRequestException("Registration not implemented yet");
    }

    public Map<String, Object> generateHash(String password) {
        String hash = passwordEncoder.encode(password);
        return Map.of(
                "password", password,
                "hash", hash,
                "verified", passwordEncoder.matches(password, hash)
        );
    }
}
