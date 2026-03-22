/** Chuẩn hóa loại điểm từ API */
export function normScoreType(s) {
  return (s || '15P').toUpperCase();
}

/**
 * Tìm một bản ghi điểm theo học sinh, lớp, môn, loại, lần.
 */
export function findScoreRecord(scores, studentId, classId, subjectId, type, attempt = 1) {
  if (!scores || !studentId || !classId || !subjectId) return null;
  return scores.find((sc) => {
    const sid = sc.student?.id;
    const cid = sc.classEntity?.id ?? sc.class_id;
    const subid = sc.subject?.id ?? sc.subject_id;
    const st = normScoreType(sc.scoreType || sc.score_type);
    const att = sc.attempt != null ? Number(sc.attempt) : 1;
    return (
      sid === studentId &&
      cid === classId &&
      subid === subjectId &&
      st === type &&
      att === attempt
    );
  });
}

export function getScoreValue(scores, studentId, classId, subjectId, type, attempt = 1) {
  const r = findScoreRecord(scores, studentId, classId, subjectId, type, attempt);
  return r != null && r.score != null ? Number(r.score) : null;
}

/** Trung bình các điểm (0–10) không null */
export function averageScores(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

/** Màu nền + chữ theo điểm (mockup: thấp đỏ, cao xanh) */
export function scoreCellClass(score) {
  if (score == null || Number.isNaN(score)) return 'es-cell-empty';
  if (score < 5) return 'es-cell-low';
  if (score < 6.5) return 'es-cell-mid-low';
  if (score < 8) return 'es-cell-mid';
  return 'es-cell-high';
}
