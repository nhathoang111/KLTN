import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);

  // Các số liệu thống kê lấy từ backend (học sinh, giáo viên, phụ huynh, số lớp học)
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    parents: 0,
    classes: 0,
  });

  const quickActions = [
    { title: 'Quản lý người dùng', icon: 'U', path: '/users?userRole=ADMIN', color: '#4f46e5', description: 'Quản lý giáo viên, học sinh và phụ huynh' },
    { title: 'Quản lý phân quyền', icon: 'R', path: '/roles?userRole=ADMIN', color: '#e879f9', description: 'Thiết lập quyền vai trò trong trường' },
    { title: 'Lịch học & dạy', icon: 'T', path: '/schedules', color: '#38bdf8', description: 'Quản lý thời khóa biểu lớp học' },
    { title: 'Thông báo', icon: 'AN', path: '/announcements', color: '#22c55e', description: 'Đăng thông báo của nhà trường' },
  ];

  const [notifications, setNotifications] = useState([]);
  /** Thống kê số lớp theo khối: [{ gradeLevel: 6, count: 2 }, ...] */
  const [classStatsByGrade, setClassStatsByGrade] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  useEffect(() => {
    if (user) fetchSchoolInfo();
  }, [user]);

  const buildRecentWeekAttendance = async (schoolId) => {
    const classesRes = await api.get(`/classes/school/${schoolId}`);
    const classes = classesRes.data?.classes || [];
    const classIds = classes.map((c) => c.id).filter(Boolean);
    if (!classIds.length) return [];

    const now = new Date();
    const dates = [];
    for (let i = 1; i <= 10; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d);
      if (dates.length === 5) break;
    }
    dates.reverse();

    const values = await Promise.all(
      dates.map(async (d) => {
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let present = 0;
        let total = 0;
        await Promise.all(
          classIds.map(async (classId) => {
            try {
              const sectionsRes = await api.get(`/class-sections/class/${classId}`);
              const sections = sectionsRes.data?.classSections || [];
              await Promise.all(
                sections.map(async (section) => {
                  try {
                    const attRes = await api.get('/attendance', { params: { classSectionId: section.id, date } });
                    const items = attRes.data?.items || [];
                    total += items.length;
                    present += items.filter((it) => ['PRESENT', 'LATE'].includes(String(it.status || '').toUpperCase())).length;
                  } catch {
                    // bỏ qua lỗi cục bộ
                  }
                })
              );
            } catch {
              // bỏ qua lỗi cục bộ
            }
          })
        );
        return total > 0 ? Math.round((present / total) * 100) : 0;
      })
    );

    return dates.map((d, idx) => ({ day: `T${d.getDay() === 0 ? 7 : d.getDay()}`, value: values[idx] ?? 0 }));
  };

  const fetchSchoolInfo = async () => {
    try {
      const schoolId = user?.school?.id;
      if (schoolId) {
        const [schoolRes, announcementsRes, classesRes] = await Promise.all([
          api.get(`/schools/${schoolId}`),
          api.get(`/announcements?schoolId=${schoolId}`),
          api.get(`/classes/school/${schoolId}`),
        ]);
        const data = schoolRes.data || null;
        setSchoolInfo(data);
        setStats((prev) => ({
          students: data?.studentCount ?? prev.students,
          teachers: data?.teacherCount ?? prev.teachers,
          parents: data?.parentCount ?? prev.parents,
          classes: data?.classCount ?? prev.classes,
        }));
        const list = announcementsRes.data?.announcements || [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setNotifications(sorted.slice(0, 5));
        const classes = classesRes.data?.classes || [];
        const byGrade = classes.reduce((acc, c) => {
          const g = c.gradeLevel != null ? c.gradeLevel : 0;
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {});
        const gradeStats = Object.entries(byGrade)
          .map(([gradeLevel, count]) => ({ gradeLevel: Number(gradeLevel), count }))
          .sort((a, b) => a.gradeLevel - b.gradeLevel);
        setClassStatsByGrade(gradeStats);
        const attendance = await buildRecentWeekAttendance(schoolId).catch(() => []);
        setAttendanceData(attendance);
      } else {
        const response = await api.get('/schools');
        const firstSchool = response.data.schools?.[0] || null;
        let schoolWithStats = firstSchool;
        if (firstSchool?.id) {
          const detailRes = await api.get(`/schools/${firstSchool.id}`);
          schoolWithStats = detailRes.data || firstSchool;
        }
        setSchoolInfo(schoolWithStats || firstSchool);
        setStats((prev) => ({
          students: schoolWithStats?.studentCount ?? prev.students,
          teachers: schoolWithStats?.teacherCount ?? prev.teachers,
          parents: schoolWithStats?.parentCount ?? prev.parents,
          classes: schoolWithStats?.classCount ?? prev.classes,
        }));
        const schoolIdForAnn = firstSchool?.id;
        if (schoolIdForAnn) {
          const [annRes, classesRes] = await Promise.all([
            api.get(`/announcements?schoolId=${schoolIdForAnn}`),
            api.get(`/classes/school/${schoolIdForAnn}`),
          ]);
          const list = annRes.data?.announcements || [];
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
          setNotifications(sorted.slice(0, 5));
          const classes = classesRes.data?.classes || [];
          const byGrade = classes.reduce((acc, c) => {
            const g = c.gradeLevel != null ? c.gradeLevel : 0;
            acc[g] = (acc[g] || 0) + 1;
            return acc;
          }, {});
          const gradeStats = Object.entries(byGrade)
            .map(([gradeLevel, count]) => ({ gradeLevel: Number(gradeLevel), count }))
            .sort((a, b) => a.gradeLevel - b.gradeLevel);
          setClassStatsByGrade(gradeStats);
          const attendance = await buildRecentWeekAttendance(schoolIdForAnn).catch(() => []);
          setAttendanceData(attendance);
        } else {
          const annRes = await api.get('/announcements');
          const list = annRes.data?.announcements || [];
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
          setNotifications(sorted.slice(0, 5));
          setClassStatsByGrade([]);
          setAttendanceData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      if (user?.school) {
        setSchoolInfo(user.school);
        setStats((prev) => ({
          students: user.school.studentCount ?? prev.students,
          teachers: user.school.teacherCount ?? prev.teachers,
          parents: user.school.parentCount ?? prev.parents,
          classes: user.school.classCount ?? prev.classes,
        }));
      }
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBarHeight = (value) => {
    const max = Math.max(...(attendanceData.length ? attendanceData.map((item) => item.value) : [1]), 1);
    const maxPixel = 110;
    return `${(value / max) * maxPixel}px`;
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">
          <div className="spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Thanh header bên trong (sidebar vẫn giữ ở Layout) */}
      <div className="ad-topbar">
        <div className="ad-topbar-left">
          <h1 className="ad-title">Dashboard</h1>
          <p className="ad-subtitle">
            {schoolInfo?.name || 'Chưa có thông tin trường'} • Quản trị trường học
          </p>
        </div>
        <div className="ad-topbar-right">
          <div className="ad-search">
            <span className="ad-search-icon" />
            <input placeholder="Tìm kiếm nhanh..." />
          </div>
          <button className="ad-topbar-icon-btn">
            <span className="ad-topbar-icon-bell" />
          </button>
          <div className="ad-user-chip">
            <div className="ad-user-avatar">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="ad-user-info">
              <span className="ad-user-name">{user?.fullName || 'Admin trường'}</span>
              <span className="ad-user-role">School Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng thẻ thống kê */}
      <div className="ad-kpi-row">
        <div className="ad-kpi-card ad-kpi-card--students">
          <div className="ad-kpi-pill">Thực tế</div>
          <span className="ad-kpi-label">Học sinh</span>
          <span className="ad-kpi-value">{stats.students.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--teachers">
          <div className="ad-kpi-pill">Thực tế</div>
          <span className="ad-kpi-label">Giáo viên</span>
          <span className="ad-kpi-value">{stats.teachers.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--parents">
          <div className="ad-kpi-pill">Thực tế</div>
          <span className="ad-kpi-label">Phụ huynh</span>
          <span className="ad-kpi-value">{stats.parents.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--classes">
          <div className="ad-kpi-pill">Thực tế</div>
          <span className="ad-kpi-label">Số lớp học</span>
          <span className="ad-kpi-value">{stats.classes.toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* Khu vực giữa */}
      <div className="ad-middle-row">
        <div className="ad-card ad-card--students">
          <div className="ad-card-header">
            <span className="ad-card-title">Students</span>
          </div>
          <div className="ad-student-chart">
            <div
              className="ad-student-donut"
              style={{
                background: (() => {
                  const male = schoolInfo?.studentMaleCount ?? 0;
                  const female = schoolInfo?.studentFemaleCount ?? 0;
                  const total = male + female;
                  if (total === 0) return 'conic-gradient(#e5e7eb 0 360deg)';
                  const maleDeg = (male / total) * 360;
                  return `conic-gradient(#4f46e5 0 ${maleDeg}deg, #f97316 ${maleDeg}deg 360deg)`;
                })(),
              }}
            >
              <div className="ad-student-donut-inner">
                <div className="ad-student-icon" />
              </div>
            </div>
            <div className="ad-student-legend">
              <div className="ad-student-legend-row">
                <span className="ad-student-legend-dot ad-student-legend-dot--boys" />
                <div>
                  <div className="ad-student-legend-label">Nam</div>
                  <div className="ad-student-legend-value">
                    {(() => {
                      const male = schoolInfo?.studentMaleCount ?? 0;
                      const female = schoolInfo?.studentFemaleCount ?? 0;
                      const total = male + female;
                      const pct = total ? (male / total) * 100 : 0;
                      return `${pct.toFixed(1)}%`;
                    })()}
                  </div>
                </div>
              </div>
              <div className="ad-student-legend-row">
                <span className="ad-student-legend-dot ad-student-legend-dot--girls" />
                <div>
                  <div className="ad-student-legend-label">Nữ</div>
                  <div className="ad-student-legend-value">
                    {(() => {
                      const male = schoolInfo?.studentMaleCount ?? 0;
                      const female = schoolInfo?.studentFemaleCount ?? 0;
                      const total = male + female;
                      const pct = total ? (female / total) * 100 : 0;
                      return `${pct.toFixed(1)}%`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ad-card ad-card--attendance">
          <div className="ad-card-header">
            <span className="ad-card-title">Attendance</span>
            <span className="ad-card-subtitle">Weekly • All grades</span>
          </div>
          <div className="ad-attendance-body">
            <div className="ad-attendance-legend">
              <span className="ad-attendance-dot ad-attendance-dot--present" />
              <span>Đi học</span>
            </div>
            <div className="ad-attendance-chart">
              {attendanceData.map((item) => (
                <div key={item.day} className="ad-attendance-bar-item">
                  <div
                    className="ad-attendance-bar"
                    style={{ height: getAttendanceBarHeight(item.value) }}
                  />
                  <span className="ad-attendance-day">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ad-card ad-card--grade-stats">
          <div className="ad-card-header">
            <span className="ad-card-title">Thống kê lớp theo khối</span>
          </div>
          <div className="ad-grade-stats">
            {classStatsByGrade.length === 0 ? (
              <p className="ad-grade-stats-empty">Chưa có dữ liệu lớp theo khối.</p>
            ) : (
              <ul className="ad-grade-stats-list">
                {classStatsByGrade.map(({ gradeLevel, count }) => (
                  <li key={gradeLevel} className="ad-grade-stats-row">
                    <span className="ad-grade-stats-label">Khối {gradeLevel}</span>
                    <span className="ad-grade-stats-value">{count} lớp</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Hàng dưới: Thao tác nhanh + tin nhắn */}
      <div className="ad-bottom-row">
        <div className="ad-card ad-card--actions">
          <div className="ad-card-header">
            <span className="ad-card-title">Quick Actions</span>
          </div>
          <div className="ad-quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.title}
                type="button"
                className="ad-quick-action-btn"
                onClick={() => {
                  window.location.href = action.path;
                }}
              >
                <span className="ad-quick-action-left">
                  <span
                    className="ad-quick-action-icon"
                    style={{ backgroundColor: action.color }}
                  />
                  <span>{action.title}</span>
                </span>
                <span className="ad-quick-action-desc">{action.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ad-card ad-card--messages">
          <div className="ad-card-header">
            <span className="ad-card-title">Thông báo</span>
            <button
              type="button"
              className="ad-view-all-btn"
              onClick={() => {
                window.location.href = '/announcements';
              }}
            >
              Xem tất cả
            </button>
          </div>
          <div className="ad-message-list">
            {notifications.length === 0 ? (
              <p className="ad-notification-empty">Chưa có thông báo nào.</p>
            ) : (
              notifications.map((msg) => (
                <div key={msg.id} className="ad-message-item">
                  <div className="ad-message-avatar" />
                  <div className="ad-message-content">
                    <div className="ad-message-title">{msg.title}</div>
                    <div className="ad-message-meta">
                      {msg.createdBy?.fullName || 'Hệ thống'} • {formatTimeAgo(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
