package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");
        Map<String, Object> response = authService.login(email, password);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> userData) {
        authService.register(userData);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/hash/{password}")
    public ResponseEntity<?> generateHash(@PathVariable String password) {
        Map<String, Object> result = authService.generateHash(password);
        return ResponseEntity.ok(result);
    }
}
