import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    classes: 0,
    subjects: 0,
    announcements: 0,
    documents: 0
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
        api.get('/documents')
      ]);

      setStats({
        schools: schoolsRes.data.schools?.length || 0,
        users: usersRes.data.users?.length || 0,
        classes: 0, // Will be implemented later
        subjects: subjectsRes.data.subjects?.length || 0,
        announcements: announcementsRes.data.announcements?.length || 0,
        documents: documentsRes.data.documents?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Tổng số trường học', value: stats.schools, icon: '🏫', color: '#667eea', description: 'Quản lý toàn bộ hệ thống' },
    { title: 'Tổng số người dùng', value: stats.users, icon: '👥', color: '#764ba2', description: 'Tất cả vai trò trong hệ thống' },
    { title: 'Tổng số lớp học', value: stats.classes, icon: '📚', color: '#f093fb', description: 'Các lớp học trong hệ thống' },
    { title: 'Tổng số môn học', value: stats.subjects, icon: '📖', color: '#f5576c', description: 'Các môn học được dạy' },
    { title: 'Tổng số thông báo', value: stats.announcements, icon: '📢', color: '#4facfe', description: 'Thông báo hệ thống' },
    { title: 'Tổng số tài liệu', value: stats.documents, icon: '📄', color: '#00f2fe', description: 'Tài liệu được upload' }
  ];

  const quickActions = [
    { title: 'Quản lý trường học', icon: '🏫', path: '/schools', color: '#667eea', description: 'Tạo/sửa/xóa trường học' },
    { title: 'Quản lý Super Admin', icon: '👑', path: '/users?userRole=SUPER_ADMIN', color: '#764ba2', description: 'Quản lý Super Admin hệ thống' },
    { title: 'Quản lý Admin trường', icon: '👨‍💼', path: '/users?userRole=ADMIN', color: '#f093fb', description: 'Quản lý Admin của từng trường' }
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
        <h2>👑 Super Admin Dashboard</h2>
        <p>Quản lý toàn bộ hệ thống trường học</p>
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
          <h3>🚀 Thao tác nhanh</h3>
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
                  onClick={() => window.location.href = action.path}
                  style={{ backgroundColor: action.color }}
                >
                  Truy cập
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
