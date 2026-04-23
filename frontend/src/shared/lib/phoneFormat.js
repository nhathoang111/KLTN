/**
 * Khớp logic kiểm tra ở {@code com.example.schoolmanagement.util.PhoneFormat} (Java).
 * Giữ đồng bộ khi sửa một trong hai nơi.
 */

const VIETNAM_MOBILE = /^0[35789]\d{8}$/;

function stripToNationalDigits(t) {
  let s = String(t).replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) {
    s = `0${s.slice(3)}`;
  } else if (s.startsWith('84') && s.length >= 10) {
    s = `0${s.slice(2)}`;
  }
  if (!s || !/^\d+$/.test(s)) {
    return null;
  }
  return s;
}

/** true nếu để trống hoặc là mobile VN hợp lệ (sau chuẩn hóa). */
export function isValidOptionalVietnamMobile(raw) {
  if (raw == null || typeof raw !== 'string') return true;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const digits = stripToNationalDigits(trimmed);
  return digits != null && VIETNAM_MOBILE.test(digits);
}
