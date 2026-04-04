/** Tiết cố định TKB (khớp backend fixedActivityCode). */
export const FIXED_ACTIVITY_LABELS = {
  CHAOCO: 'Chào cờ',
  SHL: 'Sinh hoạt lớp',
};

/** @returns {string|null} */
export function scheduleActivityLabel(schedule) {
  const code = schedule?.fixedActivityCode || schedule?.fixed_activity_code;
  if (code && FIXED_ACTIVITY_LABELS[code]) {
    return FIXED_ACTIVITY_LABELS[code];
  }
  return null;
}

/** Tên hiển thị: tiết cố định trước, sau đó môn. */
export function scheduleSubjectDisplayName(schedule, fallback = '—') {
  const fixed = scheduleActivityLabel(schedule);
  if (fixed) return fixed;
  return schedule?.subject?.name ?? fallback;
}
