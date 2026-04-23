package com.example.schoolmanagement.util;

import java.util.regex.Pattern;

/**
 * SĐT di động VN: 10 chữ số, đầu số 03 / 05 / 07 / 08 / 09.
 * Đồng bộ quy tắc với {@code frontend/src/shared/lib/phoneFormat.js}.
 */
public final class PhoneFormat {

    private static final Pattern VIETNAM_MOBILE = Pattern.compile("^0[35789]\\d{8}$");

    private PhoneFormat() {
    }

    /**
     * @param raw giá trị từ client; null hoặc chỉ khoảng trắng → null (được để trống)
     * @return chuỗi 10 số dạng quốc nội (0…), hoặc null nếu để trống
     * @throws IllegalArgumentException nếu có nhập nhưng không hợp lệ
     */
    public static String parseNationalMobileOrNull(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String digits = stripToNationalDigits(trimmed);
        if (!VIETNAM_MOBILE.matcher(digits).matches()) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ");
        }
        return digits;
    }

    private static String stripToNationalDigits(String t) {
        String s = t.replaceAll("[\\s.\\-()]", "");
        if (s.startsWith("+84")) {
            s = "0" + s.substring(3);
        } else if (s.startsWith("84") && s.length() >= 10) {
            s = "0" + s.substring(2);
        }
        if (s.isEmpty() || s.chars().anyMatch(ch -> !Character.isDigit(ch))) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ");
        }
        return s;
    }
}
