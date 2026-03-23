/**
 * Chuẩn về '1' | '2' theo giá trị semester lưu trong DB (class_sections.semester).
 */
export function normalizeSemesterCode(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s === '1' || s.includes('học kỳ 1') || s.includes('hoc ky 1') || s === 'hk1' || s === 'i') return '1';
  if (s === '2' || s.includes('học kỳ 2') || s.includes('hoc ky 2') || s === 'hk2' || s === 'ii') return '2';
  return null;
}
