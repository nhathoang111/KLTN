/**
 * Khung giờ trường học (FE hiển thị + đồng bộ với API schedules.period).
 * Buổi sáng: period 1–5.
 * Buổi chiều: period 6–10.
 */

export const MAX_PERIOD = 10;

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

/** Buổi chiều: period 6–10 (không xen giải lao — khớp lưới 10 tiết/ngày) */
export const TIMELINE_AFTERNOON = [
  { id: 'pm-p6', type: 'lesson', label: 'Tiết 6', period: 6, startMin: 13 * 60, endMin: 13 * 60 + 45 },
  { id: 'pm-p7', type: 'lesson', label: 'Tiết 7', period: 7, startMin: 13 * 60 + 50, endMin: 14 * 60 + 35 },
  { id: 'pm-p8', type: 'lesson', label: 'Tiết 8', period: 8, startMin: 14 * 60 + 40, endMin: 15 * 60 + 25 },
  { id: 'pm-p9', type: 'lesson', label: 'Tiết 9', period: 9, startMin: 15 * 60 + 30, endMin: 16 * 60 + 15 },
  { id: 'pm-p10', type: 'lesson', label: 'Tiết 10', period: 10, startMin: 16 * 60 + 20, endMin: 17 * 60 + 5 },
];

export function formatTimeRange(startMin, endMin) {
  const fmt = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}
