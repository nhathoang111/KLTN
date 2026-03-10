# School Management Frontend

Frontend cho hệ thống quản lý trường học, xây dựng bằng React + Vite.

## Yêu cầu môi trường
- Node.js 18+
- npm 9+

## Cài đặt và chạy
```bash
npm install
npm run dev
```

App chạy mặc định tại `http://localhost:5173`.

## Scripts
- `npm run dev`: chạy môi trường development
- `npm run build`: build production
- `npm run preview`: chạy bản build local
- `npm run lint`: kiểm tra code style với ESLint

## Cấu trúc dự án
```text
src/
  app/
    providers/         # provider cấp app-level (AuthProvider)
    router/            # route config
  features/            # domain modules (auth, users, schools, classes...)
  shared/
    components/        # layout + shared UI
    lib/               # axios client, helper dùng chung
  styles/              # css dùng chung toàn app
```

## Auth và phân quyền
- Đăng nhập qua endpoint backend `/auth/login`.
- Token được lưu vào `localStorage` key `token`.
- User profile được lưu vào `localStorage` key `user`.
- Route được bảo vệ theo 2 lớp:
1. phải đăng nhập
2. đúng role cho từng route

## Biến môi trường
Tạo file `.env`:
```env
VITE_API_URL=http://localhost:8080/api
```

Nếu không khai báo, app dùng mặc định `http://localhost:8080/api`.

## Quy ước mã nguồn
- File text dùng UTF-8 (khai báo trong `.editorconfig`).
- EOL mặc định là LF (khai báo trong `.gitattributes`).
- Không commit thư mục build (`dist`) và dependency (`node_modules`).
