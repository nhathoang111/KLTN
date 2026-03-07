import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    classes: 0,
    subjects: 0,
    announcements: 0,
    documents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [schoolsRes, usersRes, subjectsRes, announcementsRes, documentsRes] = await Promise.all([
        api.get('/schools'),
        api.get('/users?userRole=SUPER_ADMIN'),
        api.get('/subjects'),
        api.get('/announcements'),
        api.get('/documents'),
      ]);

      setStats({
        schools: schoolsRes.data.schools?.length || 0,
        users: usersRes.data.users?.length || 0,
        classes: 0,
        subjects: subjectsRes.data.subjects?.length || 0,
        announcements: announcementsRes.data.announcements?.length || 0,
        documents: documentsRes.data.documents?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Tổng số trường', value: stats.schools, icon: 'S', color: '#667eea', description: 'Quản lý toàn bộ trường học' },
    { title: 'Tổng số người dùng', value: stats.users, icon: 'U', color: '#764ba2', description: 'Tất cả người dùng trong hệ thống' },
    { title: 'Tổng số lớp học', value: stats.classes, icon: 'C', color: '#f093fb', description: 'Các lớp học trên toàn hệ thống' },
    { title: 'Tổng số môn học', value: stats.subjects, icon: 'J', color: '#f5576c', description: 'Các môn học đã cấu hình' },
    { title: 'Tổng số thông báo', value: stats.announcements, icon: 'A', color: '#4facfe', description: 'Thông báo toàn hệ thống' },
    { title: 'Tổng số tài liệu', value: stats.documents, icon: 'D', color: '#00f2fe', description: 'Tài liệu đã tải lên' },
  ];

  const quickActions = [
    { title: 'Quản lý trường học', icon: 'S', path: '/schools', color: '#667eea', description: 'Tạo, cập nhật và khóa/mở trường học' },
    { title: 'Quản lý quản trị hệ thống', icon: 'SA', path: '/users?userRole=SUPER_ADMIN', color: '#764ba2', description: 'Quản lý tài khoản quản trị hệ thống' },
    { title: 'Quản lý quản trị trường', icon: 'AD', path: '/users?userRole=ADMIN', color: '#f093fb', description: 'Quản lý tài khoản quản trị theo từng trường' },
  ];

  if (loading) {
    return (
      <div className="super-admin-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      <div className="dashboard-header">
        <h2>Bảng điều khiển quản trị hệ thống</h2>
        <p>Tổng quan và điều hành toàn bộ hệ thống quản lý trường học.</p>
        {user?.fullName && <p>Đăng nhập với tài khoản: {user.fullName}</p>}
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <h3>{card.value}</h3>
              <p className="stat-title">{card.title}</p>
              <p className="stat-description">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <h3>Thao tác nhanh</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <div key={index} className="quick-action-card" style={{ borderColor: action.color }}>
                <div className="action-icon" style={{ backgroundColor: action.color }}>
                  {action.icon}
                </div>
                <h4>{action.title}</h4>
                <p className="action-description">{action.description}</p>
                <button
                  className="action-btn"
                  onClick={() => {
                    window.location.href = action.path;
                  }}
                  style={{ backgroundColor: action.color }}
                >
                  Mở
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
