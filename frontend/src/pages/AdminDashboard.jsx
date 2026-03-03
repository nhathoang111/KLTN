import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    if (user) {
      fetchSchoolInfo();
    }
  }, [user]);

  const fetchSchoolInfo = async () => {
    try {
      // Lấy schoolId từ user context
      const schoolId = user?.school?.id;
      
      if (schoolId) {
        // Fetch thông tin đầy đủ từ API với schoolId cụ thể
        const response = await api.get(`/schools/${schoolId}`);
        setSchoolInfo(response.data || null);
      } else {
        // Fallback: fetch từ API (cho Super Admin)
        const response = await api.get('/schools');
        setSchoolInfo(response.data.schools?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      // Nếu lỗi, vẫn hiển thị thông tin từ user context (có thể không đầy đủ)
      if (user?.school) {
        setSchoolInfo(user.school);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Quản lý Admin trường', icon: '👥', path: '/users?userRole=ADMIN', color: '#667eea', description: 'Tạo/sửa/xóa Admin trong trường' },
    { title: 'Quản lý phân quyền Admin', icon: '🔐', path: '/roles?userRole=ADMIN', color: '#764ba2', description: 'Phân quyền Admin trong phạm vi trường' },
    { title: 'Quản lý lớp học', icon: '📚', path: '/classes', color: '#f093fb', description: 'Quản lý năm học, khối lớp, lớp học' },
    { title: 'Quản lý môn học', icon: '📖', path: '/subjects', color: '#f5576c', description: 'Quản lý môn học của trường' },
    { title: 'Thời khóa biểu', icon: '📅', path: '/schedules', color: '#4facfe', description: 'Quản lý thời khóa biểu' },
    { title: 'Quản lý điểm số', icon: '📊', path: '/exam-scores', color: '#00f2fe', description: 'Quản lý điểm số học sinh' },
    { title: 'Chuyên cần & Kỷ luật', icon: '✅', path: '/attendance', color: '#ff6b6b', description: 'Quản lý chuyên cần, khen thưởng/kỷ luật' },
    { title: 'Thông báo', icon: '📢', path: '/announcements', color: '#4ecdc4', description: 'Quản lý thông báo, tài liệu, tin tức' }
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
        <h2>🏫 Admin Dashboard</h2>
        <p>Quản lý trường học: {schoolInfo?.name || 'Chưa có thông tin'}</p>
      </div>

      <div className="info-card school-info-card">
        <h3>🏫 Thông tin trường học</h3>
        {schoolInfo ? (
          <div className="details">
            <p><strong>Tên trường:</strong> {schoolInfo.name || 'Chưa có'}</p>
            <p><strong>Mã trường:</strong> {schoolInfo.code || 'Chưa có'}</p>
            <p><strong>Địa chỉ:</strong> {schoolInfo.address || 'Chưa có'}</p>
            <p><strong>Email:</strong> {schoolInfo.email || 'Chưa có'}</p>
            <p><strong>Số điện thoại:</strong> {schoolInfo.phone || 'Chưa có'}</p>
          </div>
        ) : (
          <p>Chưa có thông tin trường học</p>
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

export default AdminDashboard;
