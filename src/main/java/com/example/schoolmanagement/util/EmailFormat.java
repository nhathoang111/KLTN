package com.example.schoolmanagement.util;

import java.util.regex.Pattern;

/**
 * Kiểm tra định dạng email cơ bản (local@domain), dùng chung cho create/update user.
 */
public final class EmailFormat {

    private static final int MAX_LENGTH = 254;
    /**
     * Mẫu gần với HTML5 / thực tế sử dụng phổ biến; không hỗ trợ đầy đủ RFC 5322.
     */
    private static final Pattern PATTERN = Pattern.compile(
            "^[\\w.+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
    );

    private EmailFormat() {
    }

    public static boolean isValid(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        if (email.length() > MAX_LENGTH) {
            return false;
        }
        return PATTERN.matcher(email).matches();
    }
}
