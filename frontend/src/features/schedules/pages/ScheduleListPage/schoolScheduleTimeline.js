/**
 * Khung giờ trường học (chỉ dùng FE hiển thị — không đổi logic BE).
 * Tiết 1–5 map với period 1–5 trong API (buổi sáng).
 * Buổi chiều: hiển thị khung giờ chuẩn; hệ thống hiện chưa có period 6–9 trên BE.
 */

export const DAY_COLUMNS = [1, 2, 3, 4, 5, 6]; // Thứ 2 → Thứ 7

/** Một dòng trên lưới thời gian */
export const TIMELINE_MORNING = [
  { id: 'am-homeroom', type: 'homeroom', label: 'Sinh hoạt', startMin: 7 * 60, endMin: 7 * 60 + 10 },
  { id: 'am-p1', type: 'lesson', label: 'Tiết 1', period: 1, startMin: 7 * 60 + 10, endMin: 7 * 60 + 55 },
  { id: 'am-p2', type: 'lesson', label: 'Tiết 2', period: 2, startMin: 8 * 60, endMin: 8 * 60 + 45 },
  { id: 'am-long1', type: 'long_break', label: 'Giải lao', startMin: 8 * 60 + 45, endMin: 9 * 60 },
  { id: 'am-p3', type: 'lesson', label: 'Tiết 3', period: 3, startMin: 9 * 60, endMin: 9 * 60 + 45 },
  { id: 'am-p4', type: 'lesson', label: 'Tiết 4', period: 4, startMin: 9 * 60 + 50, endMin: 10 * 60 + 35 },
  { id: 'am-p5', type: 'lesson', label: 'Tiết 5', period: 5, startMin: 10 * 60 + 40, endMin: 11 * 60 + 25 },
];

/** Buổi chiều: không có field period (BE chưa có tiết 6–9) — chỉ hiển thị */
export const TIMELINE_AFTERNOON = [
  { id: 'pm-p1', type: 'lesson', label: 'Tiết 1 (chiều)', startMin: 13 * 60 + 30, endMin: 14 * 60 + 15, period: null },
  { id: 'pm-p2', type: 'lesson', label: 'Tiết 2 (chiều)', startMin: 14 * 60 + 15, endMin: 15 * 60, period: null },
  { id: 'pm-long', type: 'long_break', label: 'Giải lao', startMin: 15 * 60, endMin: 15 * 60 + 15 },
  { id: 'pm-p3', type: 'lesson', label: 'Tiết 3 (chiều)', startMin: 15 * 60 + 15, endMin: 16 * 60, period: null },
  { id: 'pm-p4', type: 'lesson', label: 'Tiết 4 (chiều)', startMin: 16 * 60, endMin: 16 * 60 + 45, period: null },
];

export function formatTimeRange(startMin, endMin) {
  const fmt = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}
