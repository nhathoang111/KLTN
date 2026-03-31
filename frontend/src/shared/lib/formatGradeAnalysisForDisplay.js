/**
 * GradeAnalysisResponse từ GET/POST phân tích điểm: field legacy `analysis` thường null;
 * ghép nội dung hiển thị từ summary / lists.
 */
export function formatGradeAnalysisForDisplay(data) {
  if (!data || typeof data !== 'object') return '';
  const legacy = data.analysis;
  if (legacy != null && String(legacy).trim() !== '') return String(legacy).trim();

  const source = data.source;
  const aiSuccess = data.aiSuccess;
  const aiError = data.aiError;

  const summary = data.summary;
  const trend = data.trend;
  const severity = data.severity;
  const under = data.underAverageSubjects;
  const topConcerns = data.topConcerns;
  const priority = data.prioritySubjects;
  const recs = data.recommendations;
  const risk = data.riskLevel;

  const lines = [];
  if (source) {
    const label = source === 'GEMINI' ? 'Gemini' : 'Local';
    const reason = aiSuccess === false && aiError ? ` (${aiError})` : '';
    lines.push(`Nguồn: ${label}${reason}`);
  }
  if (summary != null && String(summary).trim() !== '') {
    lines.push(`Tóm tắt:\n${String(summary).trim()}`);
  }
  if (risk || severity) {
    const bits = [];
    if (risk) bits.push(`Mức rủi ro: ${risk}`);
    if (severity) bits.push(`Mức độ: ${severity}`);
    if (bits.length) lines.push(bits.join(' · '));
  }
  if (trend != null && String(trend).trim() !== '') {
    lines.push(`Xu hướng: ${String(trend).trim()}`);
  }
  if (Array.isArray(under) && under.length) {
    lines.push(`Môn dưới trung bình:\n${under.map((s) => `- ${s}`).join('\n')}`);
  }
  if (Array.isArray(topConcerns) && topConcerns.length) {
    lines.push(`Trọng tâm:\n${topConcerns.map((s) => `- ${s}`).join('\n')}`);
  }
  if (Array.isArray(priority) && priority.length) {
    lines.push(`Ưu tiên môn: ${priority.join(', ')}`);
  }
  if (Array.isArray(recs) && recs.length) {
    lines.push(`Khuyến nghị:\n${recs.map((s) => `- ${s}`).join('\n')}`);
  }
  return lines.filter(Boolean).join('\n\n');
}
