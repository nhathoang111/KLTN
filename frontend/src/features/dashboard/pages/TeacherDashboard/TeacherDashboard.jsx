import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './TeacherDashboard.css';
import { useAuth } from '../../../auth/context/AuthContext';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTeacherInfo();
    }
  }, [user]);

  const fetchTeacherInfo = async () => {
    try {
      setTeacherInfo(user);
    } catch (error) {
      console.error('Error fetching teacher info:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Xem lớp phụ trách', icon: '📚', path: '/classes', color: '#667eea', description: 'Xem/quản lý lớp phụ trách' },
    { title: 'Nhập điểm & Nhận xét', icon: '📝', path: '/exam-scores', color: '#764ba2', description: 'Nhập điểm & nhận xét cho học sinh' },
    { title: 'Quản lý lịch dạy', icon: '📅', path: '/schedules', color: '#f093fb', description: 'Quản lý thời khóa biểu dạy' },
    { title: 'Gửi thông báo', icon: '📢', path: '/announcements', color: '#f5576c', description: 'Gửi thông báo cho học sinh/lớp' },
    { title: 'Giao & Chấm bài tập', icon: '📋', path: '/assignments', color: '#4facfe', description: 'Giao & chấm bài tập' },
    //{ title: 'Theo dõi chuyên cần', icon: '✅', path: '/attendance', color: '#00f2fe', description: 'Theo dõi chuyên cần học sinh' },
    { title: 'Giao tiếp học sinh', icon: '💬', path: '/messages', color: '#ff6b6b', description: 'Giao tiếp với học sinh' }
  ];

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h2>👨‍🏫 Bảng điều khiển giáo viên</h2>
        <p>Xin chào, {teacherInfo?.fullName || 'Giáo viên'}</p>
      </div>

      <div className="info-card teacher-info-card">
        <h3>👨‍🏫 Thông tin giáo viên</h3>
        {teacherInfo ? (
          <div className="details">
            <p><strong>Họ tên:</strong> {teacherInfo.fullName}</p>
            <p><strong>Email:</strong> {teacherInfo.email}</p>
            <p><strong>Vai trò:</strong> {teacherInfo.role?.name}</p>
            <p><strong>Trạng thái:</strong> {teacherInfo.status}</p>
          </div>
        ) : (
          <p>Chưa có thông tin giáo viên</p>
        )}
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <h3>⚡ Thao tác nhanh</h3>
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

export default TeacherDashboard;

