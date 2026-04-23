/**
 * Khớp logic kiểm tra ở {@code com.example.schoolmanagement.util.EmailFormat} (Java).
 * Giữ đồng bộ khi sửa một trong hai nơi.
 */
const MAX_LENGTH = 254;
const EMAIL_PATTERN =
  /^[\w.+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email) {
  if (email == null || typeof email !== 'string') return false;
  const s = email.trim();
  if (!s || s.length > MAX_LENGTH) return false;
  return EMAIL_PATTERN.test(s);
}
