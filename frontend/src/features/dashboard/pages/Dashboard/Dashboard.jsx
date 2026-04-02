import React from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import SuperAdminDashboard from '../../../super-admin/pages/SuperAdminDashboard/SuperAdminDashboard';
import AdminDashboard from '../../../admin/pages/AdminDashboard/AdminDashboard';
import TeacherDashboard from '../TeacherDashboard/TeacherDashboard';
import StudentDashboard from '../StudentDashboard/StudentDashboard';
import ParentDashboard from '../ParentDashboard/ParentDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('activeStudentId');
    localStorage.removeItem('activeStudentName');
    logout();
    window.location.href = '/login';
  };

  // Xác định vai trò người dùng
  const getUserRole = () => {
    if (!user) return 'GUEST';

    const roleName = user.role?.name?.toUpperCase();
    if (roleName === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (roleName === 'ADMIN') return 'ADMIN';
    if (roleName === 'TEACHER') return 'TEACHER';
    if (roleName === 'STUDENT') return 'STUDENT';
    if (roleName === 'PARENT') return 'PARENT';
    return 'GUEST';
  };

  const userRole = getUserRole();

  // Render dashboard dựa trên vai trò
  switch (userRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    default:
      return (
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>🏫 Bảng điều khiển quản lý trường học</h1>
            <div className="user-info">
              <span>Chế độ Demo</span>
              <button onClick={handleLogout} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="welcome-section">
              <h2>🎉 Chào mừng đến với hệ thống quản lý trường học!</h2>
              <p>Đây là dashboard chính của hệ thống. Từ đây bạn có thể:</p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <h3>🏫 Quản lý trường học</h3>
                <p>Thêm, sửa, xóa thông tin trường học</p>
              </div>

              <div className="feature-card">
                <h3>👥 Quản lý người dùng</h3>
                <p>Quản lý giáo viên, học sinh, admin</p>
              </div>

              <div className="feature-card">
                <h3>📚 Quản lý lớp học</h3>
                <p>Tạo và quản lý các lớp học</p>
              </div>

              <div className="feature-card">
                <h3>📖 Quản lý môn học</h3>
                <p>Thiết lập các môn học trong trường</p>
              </div>

              <div className="feature-card">
                <h3>📅 Quản lý lịch học</h3>
                <p>Tạo thời khóa biểu cho các lớp</p>
              </div>

              <div className="feature-card">
                <h3>📝 Quản lý bài tập</h3>
                <p>Giao bài tập và chấm điểm</p>
              </div>
            </div>

            <div className="quick-actions">
              <h3>🚀 Thao tác nhanh</h3>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => window.location.href = '/schools'}>
                  Xem trường học
                </button>
                <button className="action-btn" onClick={() => window.location.href = '/users'}>
                  Xem người dùng
                </button>
                <button className="action-btn" onClick={() => window.location.href = '/classes'}>
                  Xem lớp học
                </button>
                <button className="action-btn" onClick={() => window.location.href = '/subjects'}>
                  Xem môn học
                </button>
              </div>
            </div>
          </div>
        </div>
      );
  }
};

export default Dashboard;
