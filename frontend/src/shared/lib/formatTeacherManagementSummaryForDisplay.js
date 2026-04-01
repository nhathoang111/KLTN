/**
 * TeacherManagementSummaryResponse — hiển thị tổng quan quản lý (không dùng nhãn học lực gộp sai ngữ cảnh).
 */
export function formatTeacherManagementSummaryForDisplay(data) {
  if (!data || typeof data !== 'object') return '';

  const source = data.source;
  const aiSuccess = data.aiSuccess;
  const aiError = data.aiError;

  const summary = data.summary;
  const managementLevel = data.managementLevel;
  const classesAnalyzedCount = data.classesAnalyzedCount;
  const studentsAnalyzedCount = data.studentsAnalyzedCount;
  const studentsNeedAttentionCount = data.studentsNeedAttentionCount;
  const keyRiskSubjects = data.keyRiskSubjects;
  const keyConcernClasses = data.keyConcernClasses;
  const topConcerns = data.topConcerns;
  const recs = data.recommendations;

  const levelLabel = (() => {
    if (!managementLevel) return null;
    const u = String(managementLevel).toUpperCase();
    if (u === 'HIGH') return 'Cao (ưu tiên điều phối / theo dõi)';
    if (u === 'MEDIUM') return 'Trung bình (duy trì nhịp kiểm tra)';
    if (u === 'LOW') return 'Thấp (tương đối ổn định trong phạm vi dữ liệu)';
    return String(managementLevel);
  })();

  const lines = [];
  if (source) {
    const label = source === 'GEMINI' ? 'Gemini' : 'Hệ thống / dự phòng';
    const reason = aiSuccess === false && aiError ? ` (${aiError})` : '';
    lines.push(`Nguồn phần mềm: ${label}${reason}`);
  }

  const statsBits = [];
  if (classesAnalyzedCount != null) statsBits.push(`${classesAnalyzedCount} lớp trong phạm vi`);
  if (studentsAnalyzedCount != null) statsBits.push(`${studentsAnalyzedCount} học sinh`);
  if (studentsNeedAttentionCount != null) {
    statsBits.push(`${studentsNeedAttentionCount} HS cần theo dõi thêm (điểm TP < 5 ở môn bạn phụ trách)`);
  }
  if (statsBits.length) lines.push(`Phạm vi dữ liệu: ${statsBits.join(' · ')}`);

  if (levelLabel) {
    lines.push(`Mức độ cần chú ý (quản lý): ${levelLabel}`);
  }

  if (summary != null && String(summary).trim() !== '') {
    lines.push(`Tóm tắt:\n${String(summary).trim()}`);
  }

  if (Array.isArray(keyRiskSubjects) && keyRiskSubjects.length) {
    lines.push(`Môn cần chú ý (theo số HS cần theo dõi):\n${keyRiskSubjects.map((s) => `- ${s}`).join('\n')}`);
  }
  if (Array.isArray(keyConcernClasses) && keyConcernClasses.length) {
    lines.push(`Lớp cần chú ý:\n${keyConcernClasses.map((s) => `- ${s}`).join('\n')}`);
  }
  if (Array.isArray(topConcerns) && topConcerns.length) {
    lines.push(`Trọng tâm theo dõi:\n${topConcerns.map((s) => `- ${s}`).join('\n')}`);
  }
  if (Array.isArray(recs) && recs.length) {
    lines.push(`Gợi ý hành động:\n${recs.map((s) => `- ${s}`).join('\n')}`);
  }

  return lines.filter(Boolean).join('\n\n');
}
