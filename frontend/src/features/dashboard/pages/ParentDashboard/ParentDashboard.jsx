import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './ParentDashboard.css';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(localStorage.getItem('activeStudentId'));

  useEffect(() => {
    const fetchParentDetails = async () => {
      try {
        setLoading(true);
        // API /users/{id} trả về thông tin user kèm mảng "children" nếu là phụ huynh
        const response = await api.get(`/users/${user.id}`);
        setChildren(response.data.children || []);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách con em:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchParentDetails();
    }
  }, [user]);

  const handleSelectChild = (child) => {
    localStorage.setItem('activeStudentId', child.id);
    localStorage.setItem('activeStudentName', child.fullName);
    setSelectedChildId(child.id.toString());
    
    // Chuyển hướng đến trang thời khóa biểu để kích hoạt hiển thị menu và xem dữ liệu luôn
    window.location.href = '/schedules';
  };

  const handleUnselect = () => {
    localStorage.removeItem('activeStudentId');
    localStorage.removeItem('activeStudentName');
    setSelectedChildId(null);
    // Tải lại trang để Sidebar ẩn các menu chức năng đi
    window.location.reload();
  };

  if (loading) {
    return <div className="parent-dashboard-container">Đang tải danh sách con em...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>👨‍👩‍👧‍👦 Bảng điều khiển dành cho Phụ huynh</h1>
        <p>Hệ thống quản lý thông tin học tập của con em bạn tại {user?.school?.name || 'nhà trường'}</p>
      </div>

      <div className="dashboard-content">
        {selectedChildId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button 
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '8px 16px' }}
              onClick={handleUnselect}
            >
              🔄 Hủy chọn con hiện tại
            </button>
          </div>
        )}
        {children.length === 0 ? (
          <div className="welcome-section">
            <h2>Xin chào, {user?.fullName}!</h2>
            <p>Hiện tại chưa có học sinh nào được liên kết với tài khoản của bạn.</p>
            <p className="text-slate-500">Vui lòng liên hệ với văn phòng nhà trường để được hỗ trợ.</p>
          </div>
        ) : (
          <div className="child-selection-grid">
            {children.map((child) => (
              <div 
                key={child.id} 
                className={`feature-card child-card ${selectedChildId === child.id.toString() ? 'selected' : ''}`}
                onClick={() => handleSelectChild(child)}
              >
                <div className="child-avatar">
                  <span className="avatar-icon">👤</span>
                </div>
                <h3>{child.fullName}</h3>
                <p className="child-email">{child.email}</p>
                <p className="child-school">Trường: {user?.school?.name || '—'}</p>
                
                <button className={`select-btn ${selectedChildId === child.id.toString() ? 'active' : ''}`}>
                  {selectedChildId === child.id.toString() ? 'Đang chọn' : 'Chọn xem thông tin'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;