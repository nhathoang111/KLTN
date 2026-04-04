/**
 * Hiển thị điểm thành phần / TBM (TBM do backend trả về, ví dụ GET /api/exam-scores/tbm-summary).
 */
export function scoreCellClass(score) {
  if (score == null || Number.isNaN(score)) return 'es-cell-empty';
  if (score < 5) return 'es-cell-low';
  if (score < 6.5) return 'es-cell-mid-low';
  if (score < 8) return 'es-cell-mid';
  return 'es-cell-high';
}
