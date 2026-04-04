## Giới thiệu dự án

Đây là hệ thống **quản lý trường học (School Management)** gồm:
- **Backend:** Java 17, Spring Boot 3, REST API.
- **Frontend:** React 18, Vite, React Router.
- **Database:** MySQL (có thể chạy H2 trong quá trình phát triển).

Các chức năng chính:
- **Quản lý trường, lớp, môn học**.
- **Quản lý người dùng** (Học sinh, Giáo viên, Phụ huynh, Admin, Super Admin).
- **Phân công giáo viên – môn học**, quản lý điểm, điểm danh, tài liệu, thông báo, báo cáo.
- **Import người dùng từ file Excel** theo mẫu `mau_nhap_nguoi_dung.xls`.

## Cấu trúc thư mục

- `pom.xml` – cấu hình Maven cho backend Spring Boot.
- `src/main/java/com/example/schoolmanagement` – mã nguồn backend (entity, repository, service, controller).
- `src/main/resources` – cấu hình (ví dụ `application.properties`), script SQL.
- `frontend/` – project React (Node.js) cho giao diện web.
  - `frontend/package.json` – cấu hình npm, script chạy FE.
  - `frontend/src/` – mã nguồn React (các page như `UserListPage`, `UserEditPage`, `ClassListPage`, v.v.).
  - `frontend/src/services/api.js` – cấu hình Axios gọi API backend.
- `mau_nhap_nguoi_dung.xls` – file mẫu import người dùng.

## Yêu cầu môi trường

- **Java:** 17
- **Maven:** 3.8+ (để build/run backend)
- **Node.js:** 16+ (khuyến nghị 18 LTS) để chạy frontend
- **MySQL:** 8.x (hoặc phiên bản tương đương)

## Cách chạy backend (Spring Boot)

1. Cài đặt Java 17 và Maven.
2. Cấu hình kết nối DB trong `src/main/resources/application.properties` (URL, user, password MySQL).
3. Tại thư mục gốc dự án, chạy:

```bash
mvn clean spring-boot:run
```

4. Mặc định backend chạy tại `http://localhost:8080`.

## Cách chạy frontend (React)

1. Cài Node.js (kèm npm).
2. Vào thư mục `frontend`:

```bash
cd frontend
npm install
npm run dev
```

3. Mặc định Vite chạy tại `http://localhost:5173` (hoặc port mà Vite in ra console).
4. Frontend gọi backend qua các endpoint `/api/...` (ví dụ `/api/users`).

## Các module chức năng chính (tóm tắt)

### Backend

- `entity/` – định nghĩa các bảng: `User`, `Role`, `School`, `ClassEntity`, `Subject`, `Enrollment`, `ParentStudent`, `TeacherSubject`, v.v.
- `repository/` – lớp truy vấn DB bằng Spring Data JPA.
- `service/` – xử lý nghiệp vụ:
  - `UserService` – quản lý người dùng, phân vai trò, import Excel, phân công học sinh–phụ huynh, giáo viên–môn học.
  - Các service khác: quản lý điểm, điểm danh, lịch học, tài liệu, thông báo, báo cáo.
- `controller/` – REST API, ví dụ:
  - `/api/users` – CRUD người dùng, import, lấy dữ liệu cho form chỉnh sửa.
  - Các endpoint cho trường, lớp, môn học, điểm, điểm danh, v.v.

### Frontend

- `src/App.jsx` – khai báo router, layout, các route chính (`/users`, `/classes`, `/subjects`, `/dashboard`, ...).
- `src/pages/` – các màn hình:
  - `UserListPage`, `UserCreatePage`, `UserEditPage` – quản lý người dùng.
  - `SchoolListPage`, `ClassListPage`, `SubjectListPage`, ... – quản lý danh mục.
  - `ExamScoreManagement`, `AttendanceManagement`, `DocumentListPage`, `ReportListPage`, ...
- `src/components/Layout.jsx` – layout chung sau khi đăng nhập.
- `src/contexts/AuthContext.jsx` – quản lý trạng thái đăng nhập phía FE.

## Luồng làm việc cơ bản

1. **Super Admin / Admin** đăng nhập qua màn hình `/login`.
2. Vào **Dashboard**, sau đó:
   - Tạo trường (`schools`), lớp (`classes`), môn (`subjects`).
   - Import hoặc tạo mới người dùng (học sinh, giáo viên, phụ huynh) tại `users`.
3. Gán:
   - Học sinh vào lớp.
   - Phụ huynh – học sinh qua form chỉnh sửa phụ huynh.
   - Giáo viên – môn học qua form chỉnh sửa giáo viên.
4. Sử dụng các module điểm, điểm danh, tài liệu, thông báo, báo cáo theo nhu cầu trường.

---

## Flow của dự án (cho người mới)

Phần này mô tả luồng chạy từ giao diện đến database để dễ bắt đầu đọc code và debug.

### 1. Luồng tổng thể (end-to-end)

```
[Trình duyệt]  →  [React (Vite)]  →  [Axios / HTTP]  →  [Spring Boot :8080]  →  [MySQL]
     ↑                    ↑                    ↑                    ↑
   User thao tác      Frontend (FE)         REST API            Backend (BE)
   (click, form)      gọi api.get/post      /api/users...        Controller → Service → Repository → DB
```

- **Frontend** (port 5173): React render trang, user bấm nút/điền form → component gọi `api.get(...)` hoặc `api.post/put/delete(...)` từ `frontend/src/services/api.js`.
- **api.js**: Axios `baseURL = http://localhost:8080/api`, mỗi request gửi kèm header `Authorization: Bearer <token>` nếu đã đăng nhập.
- **Backend** (port 8080): Nhận request tại các `@RestController` (ví dụ `UserController`), gọi `UserService` → Repository (JPA) → ghi/đọc database.

### 2. Luồng đăng nhập (Login)

1. User mở `/login` → `LoginPage.jsx` hiển thị form email + password.
2. User nhấn "Đăng nhập" → gọi `api.post('/auth/login', { email, password })`.
3. Backend: `AuthController` nhận request → Spring Security xác thực → trả về thông tin user (và có thể token).
4. Frontend: `AuthContext.login()` nhận response → lưu `user` vào `localStorage` và state → chuyển hướng (ví dụ sang `/dashboard`).
5. Các lần sau: Mỗi request API từ `api.js` có thể gửi token (nếu backend dùng JWT); nếu 401 thì interceptor xóa token/user và redirect về `/login`.

### 3. Luồng sau khi đăng nhập (điều hướng & quyền)

1. **App.jsx**: Route `/` bọc bởi `<ProtectedRoute>`.
2. **ProtectedRoute**: Dùng `useAuth()`; nếu chưa có `user` (và không loading) → `<Navigate to="/login" />`; nếu có user → render `children` (tức là `<Layout />`).
3. **Layout**: Hiển thị sidebar/header và `<Outlet />` (các route con: `/dashboard`, `/users`, `/classes`, ...).
4. Tùy role (Super Admin, Admin, Teacher, Student) backend có thể giới hạn API (ví dụ Admin chỉ CRUD user của trường mình); frontend có thể ẩn/hiện menu theo `user.role`.

### 4. Luồng một thao tác điển hình: "Xem danh sách user"

1. User vào trang **Quản lý người dùng** → route `/users` → `UserListPage.jsx` mount.
2. Trong `useEffect`, page gọi `api.get('/users', { params: { userRole, schoolId } })` (có thể kèm header role/school từ user đăng nhập).
3. Backend: `UserController.getUsers()` → `UserService.getUsersFilteredAndEnriched()` → Repository lấy dữ liệu, service bổ sung thông tin (lớp, môn, …) → trả JSON.
4. Frontend nhận response → set state (ví dụ `setUsers(data.users)`) → render bảng danh sách.

### 5. Luồng "Chỉnh sửa user" (ví dụ giáo viên – cập nhật môn)

1. User bấm "Sửa" một dòng trong danh sách → navigate đến `/users/:id/edit` → `UserEditPage.jsx` mount với `id` từ URL.
2. **Load dữ liệu**: Page gọi song song:
   - `api.get('/users/' + id)` → backend `getUserForEdit(id)` trả Map (không trả entity để tránh lỗi lazy/serialization).
   - `api.get('/users/' + id + '/teacher-subjects')` (nếu là giáo viên) → backend trả `{ subjectIds: [...] }`.
   - Có thể gọi thêm `/roles`, `/schools`, `/classes` để điền dropdown.
3. Form hiển thị với dữ liệu đã load; user chọn môn (subjectIds), sửa thông tin rồi bấm "Lưu".
4. **Submit**: `api.put('/users/' + id, userData)` với `userData` gồm `roleId`, `schoolId`, `subjectIds` (array), ...
5. Backend: `UserController.put` → `UserService.updateUser(id, userData)`:
   - Cập nhật bảng `users`;
   - Nếu role là giáo viên: xóa hết `teacher_subjects` của user đó rồi thêm lại theo `subjectIds`.
6. Response trả về (ví dụ `getUserForEdit(id)` lại) → frontend hiển thị thông báo thành công và có thể redirect về `/users`.

### 6. Luồng Import Excel

1. User vào trang user (hoặc màn hình import) → chọn file Excel (theo mẫu `mau_nhap_nguoi_dung.xls`) → bấm Import.
2. Frontend: `api.post('/users/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })` (kèm role/school của user đăng nhập nếu backend yêu cầu).
3. Backend: `UserImportService.importFromExcel()` đọc file, map cột (email, tên, vai trò, trường, lớp, môn, con em, …) → với mỗi dòng tạo/cập nhật user và các quan hệ (enrollment, parent_student, teacher_subjects).
4. Trả về kết quả (số thành công, lỗi) → frontend hiển thị.

### Tóm tắt flow theo lớp

| Lớp | Vai trò |
|-----|--------|
| **Trình duyệt** | Hiển thị giao diện, gửi HTTP request (do React/Axios thực hiện). |
| **React (FE)** | Điều hướng (Router), form, gọi API (api.js), lưu token/user (AuthContext, localStorage). |
| **Axios (api.js)** | Gửi request tới `http://localhost:8080/api`, thêm header Authorization, xử lý 401. |
| **Controller (BE)** | Nhận request REST, gọi Service, trả JSON. |
| **Service (BE)** | Nghiệp vụ: validate, đổi role, cập nhật enrollment/parent_student/teacher_subjects, import Excel. |
| **Repository (BE)** | Truy vấn DB qua JPA (findBy..., save, delete). |
| **Database** | Lưu trữ users, schools, classes, subjects, enrollment, teacher_subjects, parent_student, ... |

Hiểu flow này giúp biết khi một tính năng "không chạy" thì cần xem ở bước nào: FE (request đúng chưa?), BE (controller/service có nhận đúng không?), hay DB (dữ liệu có đúng không?).

---

## Ghi chú cho người mới

- Khi sửa hoặc tạo người dùng, các hành vi đặc biệt:
  - **Học sinh:** gắn với lớp (enrollment).
  - **Phụ huynh:** gắn danh sách con qua bảng `parent_student`.
  - **Giáo viên:** gắn danh sách môn qua bảng `teacher_subjects`.
- Tính năng import Excel:
  - Dùng mẫu `mau_nhap_nguoi_dung.xls`.
  - Phân tích file và tạo user tương ứng, đồng thời gán quan hệ (nếu có đủ thông tin).

# 🏫 School Management System

Hệ thống quản lý trường học hoàn chỉnh với Spring Boot backend và React frontend.

## 🚀 Quick Start

### 1. Khởi động Backend (Spring Boot)
```bash
# Cách 1: Sử dụng script tự động
restart-server.bat

# Cách 2: Manual
mvn spring-boot:run
```

### 2. Khởi động Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### 3. Test APIs
```bash
test-apis.bat
```

## 📊 API Endpoints

### ✅ **Hoàn thiện (10/11 entities)**

| Entity | Endpoint | CREATE | READ | UPDATE | DELETE |
|--------|----------|--------|------|--------|--------|
| **User** | `/api/users` | ✅ | ✅ | ✅ | ✅ |
| **School** | `/api/schools` | ✅ | ✅ | ✅ | ✅ |
| **Class** | `/api/classes` | ✅ | ✅ | ✅ | ✅ |
| **Subject** | `/api/subjects` | ✅ | ✅ | ✅ | ✅ |
| **Assignment** | `/api/assignments` | ✅ | ✅ | ✅ | ✅ |
| **Announcement** | `/api/announcements` | ✅ | ✅ | ✅ | ✅ |
| **Document** | `/api/documents` | ✅ | ✅ | ✅ | ✅ |
| **Role** | `/api/roles` | ✅ | ✅ | ✅ | ✅ |
| **Attendance** | `/api/attendance` | ✅ | ✅ | ✅ | ✅ |
| **Record** | `/api/records` | ✅ | ✅ | ✅ | ✅ |

### ⚠️ **Cần kiểm tra**

| Entity | Endpoint | CREATE | READ | UPDATE | DELETE | Ghi chú |
|--------|----------|--------|------|--------|--------|---------|
| **Schedule** | `/api/schedules` | ⚠️ | ✅ | ✅ | ✅ | Conflict detection |

## 🔧 **Các sửa đổi đã thực hiện**

### 1. **DocumentController**
- ✅ Thêm POST method cho JSON data
- ✅ Hỗ trợ tạo document metadata
- ✅ Validation đầy đủ

### 2. **RecordController** 
- ✅ Tạo controller hoàn chỉnh
- ✅ Tạo RecordRepository
- ✅ CRUD operations đầy đủ

### 3. **ScheduleController**
- ✅ Sửa conflict detection logic
- ✅ Thêm UTF-8 encoding support
- ✅ Cải thiện error handling

## 🗄️ **Database Schema**

### Core Entities:
- **School** - Trường học
- **User** - Người dùng (Admin, Teacher, Student)
- **Role** - Vai trò
- **ClassEntity** - Lớp học
- **Subject** - Môn học

### Academic Entities:
- **Schedule** - Lịch học
- **Assignment** - Bài tập
- **AssignmentSubmission** - Nộp bài
- **Announcement** - Thông báo
- **Document** - Tài liệu
- **Record** - Hồ sơ học sinh
- **Attendance** - Điểm danh

## 🔐 **Authentication & Authorization**

- **Super Admin**: Toàn quyền hệ thống
- **Admin**: Quản lý trường học
- **Teacher**: Quản lý lớp học, điểm số
- **Student**: Xem thông tin cá nhân

## 📱 **Frontend Features**

- Dashboard theo vai trò
- Quản lý người dùng
- Quản lý lớp học
- Quản lý môn học
- Quản lý lịch học
- Quản lý bài tập
- Quản lý thông báo
- Quản lý tài liệu
- Quản lý điểm danh

## 🛠️ **Tech Stack**

### Backend:
- **Spring Boot 3.3.4**
- **Spring Data JPA**
- **Spring Security**
- **MySQL Database**
- **Maven**

### Frontend:
- **React 18**
- **Vite**
- **React Router**
- **Axios**

## 📝 **API Examples**

### Create User:
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "password": "123456",
    "roleId": 8,
    "schoolId": 1,
    "status": "ACTIVE"
  }'
```

### Create School:
```bash
curl -X POST http://localhost:8080/api/schools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "code": "TEST",
    "address": "123 Test Street",
    "phone": "0123456789",
    "email": "test@school.edu.vn",
    "status": "ACTIVE"
  }'
```

## 🎯 **Status: HOÀN THIỆN**

Hệ thống đã được hoàn thiện với:
- ✅ **10/11 entities** có đầy đủ CRUD operations
- ✅ **API endpoints** hoàn chỉnh
- ✅ **Validation và error handling** tốt
- ✅ **Cấu trúc code** rõ ràng
- ✅ **Documentation** đầy đủ

**Hệ thống sẵn sàng để sử dụng!** 🚀
