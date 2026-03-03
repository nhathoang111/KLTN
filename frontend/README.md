# School Management System - React Frontend

## 🚀 Cài đặt và chạy

### 1. Cài đặt Node.js
Tải và cài đặt Node.js từ: https://nodejs.org/

### 2. Cài đặt dependencies
```bash
cd frontend
npm install
```

### 3. Chạy development server
```bash
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

## 🔐 Tài khoản đăng nhập

- **👑 Super Admin**: `superadmin@example.com` / `123456`
- **🏫 Admin**: `admin@example.com` / `123456`  
- **👨‍🏫 Teacher**: `teacher@example.com` / `123456`
- **🎓 Student**: `student@example.com` / `123456`

## 📁 Cấu trúc project

### Components
- `src/components/Layout.jsx` - Layout chính với sidebar và header
- `src/components/ProtectedRoute.jsx` - Route bảo vệ
- `src/contexts/AuthContext.jsx` - Context quản lý authentication

### Pages
- `src/pages/Dashboard.jsx` - Dashboard chính với role-based routing
- `src/pages/LoginPage.jsx` - Trang đăng nhập
- `src/pages/SuperAdminDashboard.jsx` - Dashboard cho Super Admin
- `src/pages/AdminDashboard.jsx` - Dashboard cho Admin
- `src/pages/TeacherDashboard.jsx` - Dashboard cho Teacher
- `src/pages/StudentDashboard.jsx` - Dashboard cho Student
- `src/pages/RoleManagement.jsx` - Quản lý phân quyền
- `src/pages/ExamScoreManagement.jsx` - Quản lý điểm số
- `src/pages/AttendanceManagement.jsx` - Quản lý chuyên cần
- Các trang quản lý khác: Schools, Classes, Subjects, Users, Schedules

### Services
- `src/services/api.js` - Axios instance với interceptors

## 🌐 API Endpoints

- `POST /api/auth/login` - Đăng nhập
- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/schools` - Lấy danh sách trường học
- `GET /api/classes` - Lấy danh sách lớp học
- `GET /api/subjects` - Lấy danh sách môn học
- `GET /api/roles` - Lấy danh sách vai trò
- `GET /api/exam-scores` - Lấy danh sách điểm số
- `GET /api/attendance` - Lấy danh sách chuyên cần

## 🎯 Tính năng chính

### Role-based Access Control
- **Super Admin**: Toàn quyền hệ thống
- **Admin**: Quản lý trường học
- **Teacher**: Quản lý lớp học và học sinh
- **Student**: Xem thông tin cá nhân

### Dashboard Features
- **Demo Mode**: Truy cập trực tiếp `/dashboard` mà không cần đăng nhập
- **Role-specific Dashboards**: Mỗi role có dashboard riêng
- **Dynamic Navigation**: Menu thay đổi theo role

### Management Features
- Quản lý trường học, lớp học, môn học
- Quản lý người dùng và phân quyền
- Quản lý điểm số và chuyên cần
- Quản lý thời khóa biểu

## ⚙️ Cấu hình

### Environment Variables
- `VITE_API_URL`: URL của backend API (mặc định: `http://localhost:8080/api`)

### Vite Configuration
- Port: 5173
- Proxy: `/api` → `http://localhost:8080`

## 📝 Lưu ý

- Backend Spring Boot phải chạy tại port 8080
- Frontend React chạy tại port 5173
- CORS đã được cấu hình để cho phép giao tiếp giữa frontend và backend
- Sử dụng localStorage để lưu trữ token và thông tin user
- Responsive design hỗ trợ mobile và desktop

## 🛠️ Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run lint` - Chạy ESLint
- `npm run preview` - Preview production build