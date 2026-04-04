/**
 * Màu theo môn học (từ tên) — nền nhạt, viền + chữ đậm cùng tông.
 * Fallback: hash theo id nếu không khớp từ khóa.
 */
const FALLBACK = [
  { bg: '#dbeafe', accent: '#2563eb', title: '#1e3a8a' },
  { bg: '#d1fae5', accent: '#059669', title: '#064e3b' },
  { bg: '#fce7f3', accent: '#db2777', title: '#831843' },
  { bg: '#fef3c7', accent: '#d97706', title: '#78350f' },
  { bg: '#e9d5ff', accent: '#7c3aed', title: '#4c1d95' },
];

const RULES = [
  { test: (s) => /chào cờ/i.test(s), colors: { bg: '#fef2f2', accent: '#dc2626', title: '#991b1b' } },
  { test: (s) => /sinh hoạt/i.test(s), colors: { bg: '#eef2ff', accent: '#4f46e5', title: '#312e81' } },
  { test: (s) => /toán|math/i.test(s), colors: { bg: '#dbeafe', accent: '#2563eb', title: '#1e3a8a' } },
  { test: (s) => /ngữ văn|^văn\b|văn học|literature/i.test(s), colors: { bg: '#ffedd5', accent: '#ea580c', title: '#9a3412' } },
  { test: (s) => /anh|english|tiếng anh/i.test(s), colors: { bg: '#ede9fe', accent: '#7c3aed', title: '#4c1d95' } },
  { test: (s) => /thể dục|td\b|thể chất|pe\b/i.test(s), colors: { bg: '#d1fae5', accent: '#059669', title: '#064e3b' } },
  { test: (s) => /vật lý|lý\b|physics/i.test(s), colors: { bg: '#e0f2fe', accent: '#0284c7', title: '#0c4a6e' } },
  { test: (s) => /hóa|hóa học|chemistry/i.test(s), colors: { bg: '#ccfbf1', accent: '#0d9488', title: '#134e4a' } },
  { test: (s) => /sinh|sinh học|biology/i.test(s), colors: { bg: '#ecfccb', accent: '#65a30d', title: '#365314' } },
  { test: (s) => /sử|lịch sử|history/i.test(s), colors: { bg: '#ffe4e6', accent: '#e11d48', title: '#881337' } },
  { test: (s) => /địa|địa lý|geography/i.test(s), colors: { bg: '#fef9c3', accent: '#ca8a04', title: '#713f12' } },
  { test: (s) => /tin|cntt|tin học|informatics|computer/i.test(s), colors: { bg: '#cffafe', accent: '#0891b2', title: '#164e63' } },
  { test: (s) => /công nghệ|technology/i.test(s), colors: { bg: '#f3e8ff', accent: '#9333ea', title: '#581c87' } },
  { test: (s) => /gdcd|đạo đức|công dân/i.test(s), colors: { bg: '#fae8ff', accent: '#c026d3', title: '#86198f' } },
  { test: (s) => /âm nhạc|nhạc|music/i.test(s), colors: { bg: '#fce7f3', accent: '#db2777', title: '#831843' } },
  { test: (s) => /mĩ thuật|vẽ|art/i.test(s), colors: { bg: '#fef3c7', accent: '#d97706', title: '#78350f' } },
];

export function colorsForSubject(subjectId, subjectName) {
  const name = (subjectName || '').trim();
  if (name) {
    for (const { test, colors } of RULES) {
      if (test(name)) return { ...colors };
    }
  }
  if (subjectId == null || subjectId === '') {
    return { bg: '#f1f5f9', accent: '#94a3b8', title: '#475569' };
  }
  const n = Number(subjectId);
  const i = Number.isFinite(n) ? Math.abs(n) % FALLBACK.length : 0;
  return { ...FALLBACK[i] };
}
