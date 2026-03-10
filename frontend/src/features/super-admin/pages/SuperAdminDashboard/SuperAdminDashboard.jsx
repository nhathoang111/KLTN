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
  const [schools, setSchools] = useState([]);
  const [schoolStatusStats, setSchoolStatusStats] = useState({
    active: 0,
    paused: 0,
    pending: 0,
  });
  const [recentSchools, setRecentSchools] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Giữ nguyên logic fetch dữ liệu, chỉ thay đổi trình bày UI
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

      const schoolsData = schoolsRes.data.schools || [];
      const announcementsData = announcementsRes.data.announcements || [];

      setSchools(schoolsData);

      // Thống kê trạng thái trường học từ dữ liệu thật
      const activeSchools = schoolsData.filter((school) => school.status === 'ACTIVE').length;
      const pausedSchools = schoolsData.filter((school) => school.status === 'LOCKED').length;
      const pendingSchools = schoolsData.filter((school) => school.status === 'INACTIVE').length;

      setSchoolStatusStats({
        active: activeSchools,
        paused: pausedSchools,
        pending: pendingSchools,
      });

      // Bảng "Trường mới tạo" lấy từ 3 trường tạo gần nhất
      const sortedSchools = [...schoolsData]
        .filter((school) => school.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      setRecentSchools(sortedSchools);

      // "Hoạt động gần đây" lấy từ thông báo mới nhất
      const sortedAnnouncements = [...announcementsData]
        .filter((item) => item.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      setRecentActivities(sortedAnnouncements);

      // Yêu cầu chờ xử lý = tổng số thông báo hiện có (thông tin thật)
      setPendingRequests(announcementsData.length || 0);

      setStats({
        schools: schoolsData.length || 0,
        users: usersRes.data.users?.length || 0,
        classes: 0,
        subjects: subjectsRes.data.subjects?.length || 0,
        announcements: announcementsData.length || 0,
        documents: documentsRes.data.documents?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Thêm trường mới', badge: null, path: '/schools/create' },
    { title: 'Quản lý người dùng', badge: stats.users || null, path: '/users?userRole=SUPER_ADMIN' },
    { title: 'Xem báo cáo', badge: null, path: '/reports' },
    { title: 'Cài đặt hệ thống', badge: null, path: '/settings' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getSchoolName = (schoolId) => {
    if (!schoolId) return '';
    const found = schools.find((s) => s.id === schoolId);
    return found?.name || '';
  };

  const getBarHeight = (value) => {
    const max = Math.max(schoolStatusStats.active, schoolStatusStats.paused, schoolStatusStats.pending, 1);
    const maxPixel = 120;
    return `${(value / max) * maxPixel}px`;
  };

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
      {/* Thanh header trên cùng */}
      <div className="sa-topbar">
        <div>
          <h1 className="sa-title">Super Admin</h1>
          <p className="sa-subtitle">Tổng quan điều hành toàn bộ hệ thống quản lý trường học.</p>
        </div>
        <div className="sa-topbar-right">
          <div className="sa-topbar-icons">
            <button className="sa-icon-btn sa-noti">
              <span className="sa-icon-bell" />
              <span className="sa-noti-dot" />
            </button>
            <button className="sa-icon-btn">
              <span className="sa-icon-bell sa-icon-bell--outline" />
            </button>
          </div>
          <div className="sa-user-chip">
            <div className="sa-user-avatar">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="sa-user-info">
              <span className="sa-user-name">{user?.fullName || 'Super Admin'}</span>
              <span className="sa-user-role">Quản trị hệ thống</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng thống kê trên cùng */}
      <div className="sa-kpi-row">
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon sa-kpi-icon--home" />
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Tổng số trường</span>
            <span className="sa-kpi-value">{stats.schools}</span>
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon sa-kpi-icon--user" />
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Tổng người dùng</span>
            <span className="sa-kpi-value">{stats.users}</span>
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon sa-kpi-icon--check" />
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Tài khoản hoạt động</span>
            <span className="sa-kpi-value">{stats.users}</span>
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon sa-kpi-icon--clock" />
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Yêu cầu chờ xử lý</span>
            <span className="sa-kpi-value">{pendingRequests}</span>
          </div>
        </div>
      </div>

      {/* Vùng giữa: biểu đồ */}
      <div className="sa-middle-row">
        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Người dùng theo vai trò</span>
          </div>
          <div className="sa-chart-body">
            <div className="sa-donut-chart">
              <div className="sa-donut-center">
                <span>{stats.users}</span>
                <span>Người dùng</span>
              </div>
            </div>
            <div className="sa-legend">
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--admin" />
                <span>Admin</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--teacher" />
                <span>Giáo viên</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--student" />
                <span>Học sinh</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--parent" />
                <span>Phụ huynh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Tình trạng trường học</span>
          </div>
          <div className="sa-bar-chart">
            <div className="sa-bar-item">
              <div
                className="sa-bar sa-bar--active"
                style={{ height: getBarHeight(schoolStatusStats.active) }}
              />
              <span>Hoạt động</span>
            </div>
            <div className="sa-bar-item">
              <div
                className="sa-bar sa-bar--pause"
                style={{ height: getBarHeight(schoolStatusStats.paused) }}
              />
              <span>Tạm ngưng</span>
            </div>
            <div className="sa-bar-item">
              <div
                className="sa-bar sa-bar--pending"
                style={{ height: getBarHeight(schoolStatusStats.pending) }}
              />
              <span>Chờ duyệt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng dưới: bảng + hoạt động + quick actions */}
      <div className="sa-bottom-row">
        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Trường mới tạo</span>
          </div>
          <table className="sa-table">
            <thead>
              <tr>
                <th>Tên trường</th>
                <th>Mã trường</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentSchools.map((school) => (
                <tr key={school.id || school.code}>
                  <td>{school.name || '-'}</td>
                  <td>{school.code || '-'}</td>
                  <td>{formatDate(school.createdAt)}</td>
                  <td>
                    <span
                      className={`sa-badge sa-badge--${
                        school.status === 'ACTIVE'
                          ? 'active'
                          : school.status === 'LOCKED'
                          ? 'paused'
                          : 'pending'
                      }`}
                    >
                      {school.status || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Hoạt động gần đây</span>
          </div>
          <ul className="sa-activity-list">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="sa-activity-item">
                <span className="sa-activity-dot" />
                <span>
                  <span className="sa-activity-title">{activity.title}</span>
                  {activity.school && (
                    <span className="sa-activity-meta">
                      {' '}
                      • {getSchoolName(activity.school.id)} • {formatDate(activity.createdAt)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Quick Actions</span>
          </div>
          <div className="sa-quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.title}
                type="button"
                className="sa-quick-action-btn"
                onClick={() => {
                  window.location.href = action.path;
                }}
              >
                <span className="sa-quick-action-left">
                  <span className="sa-quick-action-icon" />
                  <span>{action.title}</span>
                </span>
                {action.badge && <span className="sa-quick-action-badge">{action.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
