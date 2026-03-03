import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Xác định vai trò người dùng
  const getUserRole = () => {
    if (!user) return 'GUEST';
    
    // Normalize role name to uppercase for case-insensitive matching
    const roleName = user.role?.name?.toUpperCase();
    
    // Debug: Log role information
    console.log('User:', user);
    console.log('Role name (original):', user.role?.name);
    console.log('Role name (uppercase):', roleName);
    
    if (roleName === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (roleName === 'ADMIN') return 'ADMIN';
    if (roleName === 'TEACHER') return 'TEACHER';
    if (roleName === 'STUDENT') return 'STUDENT';
    
    console.log('Unknown role, defaulting to GUEST');
    return 'GUEST';
  };

  const userRole = getUserRole();

  // Menu items dựa trên vai trò
  const getMenuItems = () => {
    const allMenuItems = [
      { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'GUEST'] },
      
      // SuperAdmin chỉ có 2 chức năng chính
      { path: '/schools', label: 'Quản lý trường học', icon: '🏫', roles: ['SUPER_ADMIN'] },
      { path: '/users', label: 'Quản lý Admin trường', icon: '👨‍💼', roles: ['SUPER_ADMIN'] },
      
      // Admin có đầy đủ 8 chức năng
      { path: '/users', label: 'Quản lý người dùng', icon: '👥', roles: ['ADMIN'] },
      { path: '/roles', label: 'Quản lý phân quyền', icon: '🔐', roles: ['ADMIN'] },
      { path: '/classes', label: 'Quản lý lớp học', icon: '📚', roles: ['ADMIN'] },
      { path: '/subjects', label: 'Quản lý môn học', icon: '📖', roles: ['ADMIN'] },
      { path: '/schedules', label: 'Quản lý thời khóa biểu', icon: '📅', roles: ['ADMIN'] },
      { path: '/exam-scores', label: 'Quản lý điểm số', icon: '📊', roles: ['ADMIN'] },
      // { path: '/attendance', label: 'Chuyên cần & Kỷ luật', icon: '✅', roles: ['ADMIN'] },
      { path: '/announcements', label: 'Thông báo & Tài liệu', icon: '📢', roles: ['ADMIN'] },
      
      // Teacher có 6 chức năng
      { path: '/classes', label: 'Xem lớp phụ trách', icon: '📚', roles: ['TEACHER'] },
      { path: '/exam-scores', label: 'Nhập điểm & Nhận xét', icon: '📝', roles: ['TEACHER'] },
      { path: '/assignments', label: 'Giao & Chấm bài tập', icon: '📋', roles: ['TEACHER'] },
      { path: '/schedules', label: 'Xem thời khóa biểu', icon: '📅', roles: ['TEACHER'] },
      //{ path: '/attendance', label: 'Theo dõi chuyên cần', icon: '✅', roles: ['TEACHER'] },
      { path: '/announcements', label: 'Thông báo', icon: '📢', roles: ['TEACHER'] },
      
      // Student có 4 chức năng
      { path: '/schedules', label: 'Xem thời khóa biểu', icon: '📅', roles: ['STUDENT'] },
      { path: '/exam-scores', label: 'Xem điểm & Nhận xét', icon: '📊', roles: ['STUDENT'] },
      { path: '/assignments', label: 'Bài tập', icon: '📝', roles: ['STUDENT'] },
      { path: '/announcements', label: 'Thông báo', icon: '📢', roles: ['STUDENT'] },
    ];

    return allMenuItems.filter(item => item.roles.includes(userRole));
  };

  const getUserRoleLabel = () => {
    switch (userRole) {
      case 'SUPER_ADMIN': return '👑 Super Admin';
      case 'ADMIN': return '🏫 Admin';
      case 'TEACHER': return '👨‍🏫 Giáo viên';
      case 'STUDENT': return '🎓 Học sinh';
      case 'GUEST': return '🎯 Demo Mode';
      default: return 'Người dùng';
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🏫 School Management</h2>
          {user && (
            <div className="user-info">
              <div className="user-name">{user.fullName}</div>
              <div className="user-role">{getUserRoleLabel()}</div>
              {user.school && userRole !== 'SUPER_ADMIN' && (
                <div className="user-school">🏫 {user.school.name}</div>
              )}
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          {getMenuItems().map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="main-header">
          <h1>Hệ thống quản lý trường học</h1>
          <button className="logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;