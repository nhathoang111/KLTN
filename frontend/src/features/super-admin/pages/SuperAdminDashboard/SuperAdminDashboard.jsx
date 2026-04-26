import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './SuperAdminDashboard.css';

const formatSchoolStatusLabel = (status) => {
  if (!status) return '-';
  const u = String(status).toUpperCase();
  if (u === 'ACTIVE') return 'Hoạt động';
  if (u === 'LOCKED') return 'Tạm khóa';
  if (u === 'INACTIVE') return 'Ngưng hoạt động';
  return status;
};

const schoolStatusBadgeClass = (status) => {
  const u = String(status || '').toUpperCase();
  if (u === 'ACTIVE') return 'active';
  if (u === 'LOCKED') return 'paused';
  if (u === 'INACTIVE') return 'inactive';
  return 'inactive';
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [schoolStatusStats, setSchoolStatusStats] = useState({
    active: 0,
    paused: 0,
    inactive: 0,
  });
  const [recentSchools, setRecentSchools] = useState([]);
  const [roleStats, setRoleStats] = useState({
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [schoolsRes, usersRes] = await Promise.all([
        api.get('/schools'),
        api.get('/users?userRole=SUPER_ADMIN'),
      ]);

      const schoolsData = schoolsRes.data.schools || [];

      setSchools(schoolsData);

      const activeSchools = schoolsData.filter((school) => school.status === 'ACTIVE').length;
      const pausedSchools = schoolsData.filter((school) => school.status === 'LOCKED').length;
      const inactiveSchools = schoolsData.filter((school) => school.status === 'INACTIVE').length;

      setSchoolStatusStats({
        active: activeSchools,
        paused: pausedSchools,
        inactive: inactiveSchools,
      });

      const sortedSchools = [...schoolsData]
        .filter((school) => school.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      setRecentSchools(sortedSchools);

      setStats({
        schools: schoolsData.length || 0,
        users: usersRes.data.users?.length || 0,
      });
      const users = usersRes.data.users || [];
      const nextRoleStats = users.reduce(
        (acc, u) => {
          const rn = String(u?.role?.name || '').toUpperCase();
          if (rn.includes('TEACHER')) acc.teacher += 1;
          else if (rn.includes('STUDENT')) acc.student += 1;
          else if (rn.includes('PARENT')) acc.parent += 1;
          else if (rn.includes('ADMIN')) acc.admin += 1;
          return acc;
        },
        { admin: 0, teacher: 0, student: 0, parent: 0 }
      );
      setRoleStats(nextRoleStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Thêm trường mới', badge: null, path: '/schools/create' },
    { title: 'Quản lý người dùng', badge: stats.users || null, path: '/users?userRole=SUPER_ADMIN' },
    { title: 'Thống kê toàn hệ thống', badge: null, path: '/platform-reports' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getBarHeight = (value) => {
    const max = Math.max(schoolStatusStats.active, schoolStatusStats.paused, schoolStatusStats.inactive, 1);
    const maxPixel = 120;
    return `${(value / max) * maxPixel}px`;
  };
  const totalRoleUsers = roleStats.admin + roleStats.teacher + roleStats.student + roleStats.parent;
  const donutBackground = (() => {
    if (!totalRoleUsers) return 'conic-gradient(#e2e8f0 0 360deg)';
    const adminDeg = (roleStats.admin / totalRoleUsers) * 360;
    const teacherDeg = (roleStats.teacher / totalRoleUsers) * 360;
    const studentDeg = (roleStats.student / totalRoleUsers) * 360;
    return `conic-gradient(
      #6366f1 0 ${adminDeg}deg,
      #06b6d4 ${adminDeg}deg ${adminDeg + teacherDeg}deg,
      #22c55e ${adminDeg + teacherDeg}deg ${adminDeg + teacherDeg + studentDeg}deg,
      #f59e0b ${adminDeg + teacherDeg + studentDeg}deg 360deg
    )`;
  })();

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
      <div className="sa-topbar">
        <div>
          <h1 className="sa-title">Super Admin</h1>
          <p className="sa-subtitle">Tổng quan điều hành toàn bộ hệ thống quản lý trường học.</p>
        </div>
        <div className="sa-topbar-right">
          <div className="sa-topbar-icons">
            <button type="button" className="sa-icon-btn sa-noti" aria-label="Thông báo">
              <span className="sa-icon-bell" />
              <span className="sa-noti-dot" />
            </button>
            <button type="button" className="sa-icon-btn" aria-label="Tin nhắn">
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
          <div className="sa-kpi-icon sa-kpi-icon--home" />
          <div className="sa-kpi-content">
            <span className="sa-kpi-label">Trường đang hoạt động</span>
            <span className="sa-kpi-value">{schoolStatusStats.active}</span>
          </div>
        </div>
      </div>

      <div className="sa-middle-row">
        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Người dùng theo vai trò</span>
          </div>
          <div className="sa-chart-body">
            <div className="sa-donut-chart" style={{ background: donutBackground }}>
              <div className="sa-donut-center">
                <span>{stats.users}</span>
                <span>Người dùng</span>
              </div>
            </div>
            <div className="sa-legend">
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--admin" />
                <span>Admin ({roleStats.admin})</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--teacher" />
                <span>Giáo viên ({roleStats.teacher})</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--student" />
                <span>Học sinh ({roleStats.student})</span>
              </div>
              <div className="sa-legend-item">
                <span className="sa-legend-dot sa-legend-dot--parent" />
                <span>Phụ huynh ({roleStats.parent})</span>
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
              <span>Tạm khóa</span>
            </div>
            <div className="sa-bar-item">
              <div
                className="sa-bar sa-bar--inactive"
                style={{ height: getBarHeight(schoolStatusStats.inactive) }}
              />
              <span>Ngưng hoạt động</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sa-bottom-row">
        <div className="sa-card">
          <div className="sa-card-header">
            <span className="sa-card-title">Trường mới tạo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tên trường</th>
                  <th className="px-4 py-3 text-left">Mã trường</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {recentSchools.map((school) => (
                  <tr key={school.id || school.code} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">{school.name || '-'}</td>
                    <td className="px-4 py-3">{school.code || '-'}</td>
                    <td className="px-4 py-3">{formatDate(school.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`sa-badge sa-badge--${schoolStatusBadgeClass(school.status)}`}>
                        {formatSchoolStatusLabel(school.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
