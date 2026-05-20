export function normalizeSemesterCode(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === '1' || s.includes('hoc ky 1') || s === 'hk1' || s === 'hki' || s === 'i') return '1';
  if (s === '2' || s.includes('hoc ky 2') || s === 'hk2' || s === 'hkii' || s === 'ii') return '2';
  return null;
}
