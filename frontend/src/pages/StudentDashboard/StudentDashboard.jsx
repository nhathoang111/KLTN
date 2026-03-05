import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    fetchStudentInfo();
  }, []);

  const fetchStudentInfo = async () => {
    try {
      // Use the current logged-in user's information
      if (user) {
        setStudentInfo(user);
      } else {
        // Fallback: try to fetch from API if user is not available
        const response = await api.get('/users');
        const users = response.data.users || [];
        const student = users.find(u => u.role?.name === 'STUDENT');
        setStudentInfo(student);
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Xem thời khóa biểu', icon: '📅', path: '/schedules', color: '#667eea', description: 'Xem lịch học hàng ngày' },
    { title: 'Xem điểm & Nhận xét', icon: '📊', path: '/exam-scores', color: '#764ba2', description: 'Xem điểm & nhận xét từ giáo viên' },
    { title: 'Bài tập', icon: '📝', path: '/assignments', color: '#f093fb', description: 'Nhận & nộp bài tập' },
    { title: 'Thông báo', icon: '📢', path: '/announcements', color: '#f5576c', description: 'Xem thông báo từ trường/giáo viên' }
  ];

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h2>🎓 Student Dashboard</h2>
        <p>Xin chào, {studentInfo?.fullName || 'Học sinh'}</p>
      </div>

      <div className="info-card student-info-card">
        <h3>🎓 Thông tin học sinh</h3>
        {studentInfo ? (
          <div className="details">
            <p><strong>Họ tên:</strong> {studentInfo.fullName || 'N/A'}</p>
            <p><strong>Email:</strong> {studentInfo.email || 'N/A'}</p>
            <p><strong>Vai trò:</strong> {studentInfo.role?.name || 'N/A'}</p>
            {studentInfo.school && (
              <p><strong>Trường:</strong> {studentInfo.school.name || 'N/A'}</p>
            )}
            {studentInfo.classEntity && (
              <p><strong>Lớp:</strong> {studentInfo.classEntity.name || 'N/A'}</p>
            )}
            <p><strong>Trạng thái:</strong> {studentInfo.status || 'N/A'}</p>
          </div>
        ) : (
          <p>Chưa có thông tin học sinh</p>
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

export default StudentDashboard;
