# Danh sách API cơ bản trong project

Base URL: `http://localhost:8080/api` (hoặc theo biến môi trường `VITE_API_URL`)

Tất cả request (trừ `/auth/login`) cần header: `Authorization: Bearer <token>`

---

## 1. Auth (`/auth`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/auth/login` | Đăng nhập (body: `{ email, password }`) |
| POST | `/auth/register` | Đăng ký tài khoản |
| GET | `/auth/hash/{password}` | Lấy hash mật khẩu (dùng cho dev/test) |

---

## 2. Users (`/users`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/users` | Danh sách user (params: `userRole`, `schoolId`) |
| GET | `/users/{id}` | Chi tiết user theo ID |
| GET | `/users/school/{schoolId}` | User theo trường |
| GET | `/users/{id}/enrollment` | Thông tin ghi danh (lớp, rollno) của user |
| GET | `/users/{id}/parent-students` | Danh sách con (phụ huynh) |
| GET | `/users/{id}/teacher-subjects` | Môn dạy của giáo viên |
| POST | `/users` | Tạo user mới |
| POST | `/users/import` | Import user từ file Excel (multipart/form-data) |
| GET | `/users/import-template` | Tải file mẫu Excel import |
| PUT | `/users/{id}` | Cập nhật user (có thể gửi `status`, `classId`) |
| DELETE | `/users/{id}` | Xóa user |

---

## 3. Schools (`/schools`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/schools` | Danh sách trường |
| GET | `/schools/{id}` | Chi tiết trường |
| GET | `/schools/{id}/related-data` | Dữ liệu liên quan (user, class, role...) |
| POST | `/schools` | Tạo trường mới |
| PUT | `/schools/{id}` | Cập nhật trường |
| DELETE | `/schools/{id}` | Xóa trường |

---

## 4. Classes (`/classes`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/classes` | Danh sách lớp |
| GET | `/classes/{id}` | Chi tiết lớp |
| GET | `/classes/school/{schoolId}` | Lớp theo trường |
| GET | `/classes/teacher/{teacherId}` | Lớp do giáo viên dạy |
| GET | `/classes/check-students/{classId}` | Kiểm tra học sinh trong lớp |
| GET | `/classes/{id}/students` | Danh sách học sinh trong lớp |
| POST | `/classes` | Tạo lớp mới |
| PUT | `/classes/{id}` | Cập nhật lớp |
| DELETE | `/classes/{id}` | Xóa lớp |

---

## 5. Roles (`/roles`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/roles` | Danh sách vai trò (có thể filter theo school) |
| GET | `/roles/school/{schoolId}` | Vai trò theo trường |
| GET | `/roles/{id}` | Chi tiết vai trò |
| POST | `/roles` | Tạo vai trò mới |
| PUT | `/roles/{id}` | Cập nhật vai trò |
| DELETE | `/roles/{id}` | Xóa vai trò |

---

## 6. Subjects (`/subjects`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/subjects` | Danh sách môn học |
| GET | `/subjects/school/{schoolId}` | Môn học theo trường |
| GET | `/subjects/{id}` | Chi tiết môn học |
| POST | `/subjects` | Tạo môn học |
| PUT | `/subjects/{id}` | Cập nhật môn học |
| DELETE | `/subjects/{id}` | Xóa môn học |

---

## 7. Schedules (`/schedules`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/schedules` | Danh sách TKB |
| GET | `/schedules/{id}` | Chi tiết TKB |
| GET | `/schedules/class/{classId}` | TKB theo lớp |
| GET | `/schedules/school/{schoolId}` | TKB theo trường |
| GET | `/schedules/teacher/{teacherId}` | TKB theo giáo viên |
| GET | `/schedules/student/{studentId}` | TKB theo học sinh |
| POST | `/schedules` | Tạo TKB |
| POST | `/schedules/generate` | Sinh TKB tự động (body: schoolId, classId...) |
| PUT | `/schedules/{id}` | Cập nhật TKB |
| DELETE | `/schedules/{id}` | Xóa một TKB |
| DELETE | `/schedules/class/{classId}` | Xóa TKB theo lớp |
| DELETE | `/schedules/all` | Xóa toàn bộ TKB |

---

## 8. Documents (`/documents`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/documents` | Danh sách tài liệu |
| GET | `/documents/school/{schoolId}` | Tài liệu theo trường |
| GET | `/documents/class/{classId}` | Tài liệu theo lớp |
| GET | `/documents/{id}` | Chi tiết tài liệu |
| POST | `/documents` | Tạo tài liệu (JSON) |
| POST | `/documents/upload` | Upload tài liệu (file) |
| PUT | `/documents/{id}` | Cập nhật tài liệu |
| DELETE | `/documents/{id}` | Xóa tài liệu |

---

## 9. Announcements (`/announcements`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/announcements` | Danh sách thông báo |
| GET | `/announcements/school/{schoolId}` | Thông báo theo trường |
| GET | `/announcements/class/{classId}` | Thông báo theo lớp |
| GET | `/announcements/{id}` | Chi tiết thông báo |
| POST | `/announcements` | Tạo thông báo |
| PUT | `/announcements/{id}` | Cập nhật thông báo |
| DELETE | `/announcements/{id}` | Xóa thông báo |

---

## 10. Assignments (`/assignments`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/assignments` | Danh sách bài tập |
| GET | `/assignments/{id}` | Chi tiết bài tập |
| GET | `/assignments/class/{classId}` | Bài tập theo lớp |
| GET | `/assignments/teacher/{teacherId}` | Bài tập theo giáo viên |
| GET | `/assignments/{id}/download` | Tải file bài tập |
| GET | `/assignments/{id}/submissions` | Danh sách bài nộp |
| GET | `/assignments/submissions/{submissionId}/download` | Tải file bài nộp |
| POST | `/assignments` | Tạo bài tập |
| POST | `/assignments/upload` | Upload file bài tập (multipart) |
| POST | `/assignments/{id}/submit` | Nộp bài (text) |
| POST | `/assignments/{id}/submit-with-file` | Nộp bài kèm file (multipart) |
| PUT | `/assignments/{id}` | Cập nhật bài tập |
| PUT | `/assignments/submissions/{submissionId}/grade` | Chấm điểm bài nộp |
| DELETE | `/assignments/{id}` | Xóa bài tập |

---

## 11. Exam Scores (`/exam-scores`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/exam-scores` | Danh sách điểm (có params filter) |
| GET | `/exam-scores/{id}` | Chi tiết điểm |
| GET | `/exam-scores/lock-status/{schoolId}` | Trạng thái khóa nhập điểm theo trường |
| POST | `/exam-scores` | Tạo/ghi điểm |
| PUT | `/exam-scores/{id}` | Cập nhật điểm |
| PUT | `/exam-scores/lock-status/{schoolId}` | Bật/tắt khóa nhập điểm |
| DELETE | `/exam-scores/{id}` | Xóa điểm |

---

## 12. Attendance (`/attendance`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/attendance` | Danh sách điểm danh (có params) |
| GET | `/attendance/{id}` | Chi tiết điểm danh |
| POST | `/attendance` | Tạo điểm danh |
| PUT | `/attendance/{id}` | Cập nhật điểm danh |
| DELETE | `/attendance/{id}` | Xóa điểm danh |

---

## 13. Records (`/records`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/records` | Danh sách hồ sơ/sổ đầu bài |
| GET | `/records/{id}` | Chi tiết hồ sơ |
| GET | `/records/school/{schoolId}` | Hồ sơ theo trường |
| GET | `/records/class/{classId}` | Hồ sơ theo lớp |
| GET | `/records/student/{studentId}` | Hồ sơ theo học sinh |
| POST | `/records` | Tạo hồ sơ |
| PUT | `/records/{id}` | Cập nhật hồ sơ |
| DELETE | `/records/{id}` | Xóa hồ sơ |

---

## 14. Reports (`/reports`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/reports/stats` | Thống kê tổng quan |
| GET | `/reports/school/{schoolId}/stats` | Thống kê theo trường |
| GET | `/reports/class/{classId}/stats` | Thống kê theo lớp |
| GET | `/reports/exam-scores` | Báo cáo điểm (params) |
| GET | `/reports/attendance` | Báo cáo điểm danh |
| GET | `/reports/behavior` | Báo cáo hạnh kiểm |
| GET | `/reports/export/excel` | Xuất Excel (query params) |
| GET | `/reports/export/pdf` | Xuất PDF (query params) |

Frontend gọi dạng: `GET /reports/{reportType}?...` và export excel/pdf với query params.

---

## 15. Dashboard (`/dashboard`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/dashboard` | Dữ liệu dashboard (tùy role) |

---

## 16. Các API khác (backend có, frontend có thể chưa gọi đủ)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/class-sections` | Danh sách tiết/tiết học |
| GET | `/class-sections/{id}` | Chi tiết tiết |
| GET | `/class-sections/school/{schoolId}` | Theo trường |
| GET | `/class-sections/class/{classRoomId}` | Theo lớp |
| GET | `/class-sections/teacher/{teacherId}` | Theo giáo viên |
| GET | `/school-years` | Danh sách năm học |
| GET | `/school-years/school/{schoolId}` | Năm học theo trường |
| GET | `/behaviors` | Danh sách hạnh kiểm |
| GET | `/behaviors/student/{studentId}` | Hạnh kiểm theo học sinh |
| GET | `/behaviors/class/{classId}` | Hạnh kiểm theo lớp |
| POST | `/behaviors` | Tạo hạnh kiểm |
| PUT | `/behaviors/{id}` | Cập nhật hạnh kiểm |
| DELETE | `/behaviors/{id}` | Xóa hạnh kiểm |

---

## Ghi chú

- **Content-Type**: Mặc định `application/json`. Upload file dùng `multipart/form-data` (không set Content-Type để browser tự thêm boundary).
- **Token**: Lưu trong `localStorage` với key `token`. Hết hạn (401) sẽ redirect về `/login`.
- **Timeout**: 10 giây (cấu hình trong `frontend/src/services/api.js`).
