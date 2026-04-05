/**
 * Dữ liệu mẫu & danh sách phần chưa có API backend.
 * Dùng khi BE chưa cung cấp endpoint tương ứng.
 */

/** Biểu đồ tiến độ: dùng khi không đủ điểm theo tháng từ exam-scores */
export const MOCK_PROGRESS_CHART = [
  { label: 'Tháng 1', score: 6.5 },
  { label: 'Tháng 2', score: 7.0 },
  { label: 'Tháng 3', score: 7.4 },
  { label: 'Tháng 4', score: 7.8 },
];

/** Thành tích — chưa có bảng/API khen thưởng */
export const MOCK_ACHIEVEMENTS = [
  { id: 'a1', title: 'Học sinh Giỏi', subtitle: 'Học kỳ 1', icon: 'trophy' },
  { id: 'a2', title: 'Giải Ba Olympic Toán cấp trường', subtitle: '2025', icon: 'medal' },
];

/** Hạnh kiểm — chưa có bảng/API backend */
export const MOCK_CONDUCT_LABEL = 'Tốt';

/**
 * Các hạng mục hiện chỉ mock / thiếu API (hiển thị ở footer ghi chú).
 */
export const BE_DATA_GAP_ITEMS = [
  'Điểm danh theo tiết (trạng thái từng tiết, tỉ lệ chuyên cần, tiết chưa điểm danh)',
  'Học kỳ & năm học chính thức trên hồ sơ (đang hiển thị theo mẫu); dropdown học kỳ trên biểu đồ chưa lọc dữ liệu',
  'So sánh điểm TB với học kỳ trước (↑ 0.6) và xếp hạng lớp (Top %)',
  'Thành tích & khen thưởng (danh sách giải, danh hiệu)',
  'Điều hướng tuần (← →) trên TKB hôm nay: chưa có API theo tuần (hiện chuyển sang trang Thời khóa biểu)',
  'Chuông thông báo: chưa có API đếm/ghi nhận đã đọc (badge đang dựa trên số thông báo lớp/trường)',
  'Thông tin phụ huynh (tên, SĐT liên hệ): chưa có API cho học sinh xem danh sách phụ huynh liên kết — hiển thị "Chưa cập nhật"',
  'Hạnh kiểm: chưa có API — đang hiển thị nhãn mẫu (Tốt)',
  'Năm học trên dòng "Lớp … - …": nếu thiếu schoolYear từ lớp (enrollment) thì fallback mẫu',
];
