import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    if (user) fetchSchoolInfo();
  }, [user]);

  const fetchSchoolInfo = async () => {
    try {
      const schoolId = user?.school?.id;
      if (schoolId) {
        const response = await api.get(`/schools/${schoolId}`);
        setSchoolInfo(response.data || null);
      } else {
        const response = await api.get('/schools');
        setSchoolInfo(response.data.schools?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      if (user?.school) setSchoolInfo(user.school);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Quản lý người dùng', icon: 'U', path: '/users?userRole=ADMIN', color: '#667eea', description: 'Quản lý giáo viên, học sinh và phụ huynh' },
    { title: 'Quản lý phân quyền', icon: 'R', path: '/roles?userRole=ADMIN', color: '#764ba2', description: 'Thiết lập quyền vai trò trong trường' },
    { title: 'Quản lý lớp học', icon: 'C', path: '/classes', color: '#f093fb', description: 'Quản lý lớp học và nhóm lớp' },
    { title: 'Quản lý môn học', icon: 'J', path: '/subjects', color: '#f5576c', description: 'Quản lý các môn học trong trường' },
    { title: 'Thời khóa biểu', icon: 'T', path: '/schedules', color: '#4facfe', description: 'Quản lý thời khóa biểu lớp học' },
    { title: 'Điểm thi', icon: 'E', path: '/exam-scores', color: '#00f2fe', description: 'Quản lý điểm thi của học sinh' },
    { title: 'Điểm danh', icon: 'AT', path: '/attendance', color: '#ff6b6b', description: 'Quản lý điểm danh và nề nếp' },
    { title: 'Thông báo', icon: 'AN', path: '/announcements', color: '#4ecdc4', description: 'Đăng thông báo của nhà trường' },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Bảng điều khiển quản trị trường</h2>
        <p>Trường: {schoolInfo?.name || 'Chưa có thông tin trường'}</p>
      </div>

      <div className="info-card school-info-card">
        <h3>Thông tin trường học</h3>
        {schoolInfo ? (
          <div className="details">
            <p><strong>Tên:</strong> {schoolInfo.name || 'Không có'}</p>
            <p><strong>Mã trường:</strong> {schoolInfo.code || 'Không có'}</p>
            <p><strong>Địa chỉ:</strong> {schoolInfo.address || 'Không có'}</p>
            <p><strong>Email:</strong> {schoolInfo.email || 'Không có'}</p>
            <p><strong>Số điện thoại:</strong> {schoolInfo.phone || 'Không có'}</p>
          </div>
        ) : (
          <p>Chưa có thông tin trường học.</p>
        )}
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
                  onClick={() => { window.location.href = action.path; }}
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

export default AdminDashboard;
