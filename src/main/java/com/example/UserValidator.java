package com.example;

/**
 * User Validator - Validates user input and credentials
 * Implemented validation rules for email format and password strength
 * Date: 31/3/2026
 */
public class UserValidator {
    
    // Check email format using regex pattern
    public static boolean isValidEmail(String email) {
        String emailPattern = "^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$";
        return email != null && email.matches(emailPattern);
    }
    
    // Validate password: minimum 8 chars, uppercase, number, special char
    public static boolean isStrongPassword(String password) {
        if (password == null || password.length() < 8) return false;
        return password.matches(".*[A-Z].*") &&      // Has uppercase
               password.matches(".*[0-9].*") &&      // Has digit
               password.matches(".*[!@#$%^&*].*");   // Has special char
    }
}
