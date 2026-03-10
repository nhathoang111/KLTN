import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);

  // Các số liệu thống kê ưu tiên lấy từ backend nếu có, nếu không dùng giá trị mặc định
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    staffs: 0,
    awards: 0,
  });

  const quickActions = [
    { title: 'Quản lý người dùng', icon: 'U', path: '/users?userRole=ADMIN', color: '#4f46e5', description: 'Quản lý giáo viên, học sinh và phụ huynh' },
    { title: 'Quản lý phân quyền', icon: 'R', path: '/roles?userRole=ADMIN', color: '#e879f9', description: 'Thiết lập quyền vai trò trong trường' },
    { title: 'Lịch học & dạy', icon: 'T', path: '/schedules', color: '#38bdf8', description: 'Quản lý thời khóa biểu lớp học' },
    { title: 'Thông báo', icon: 'AN', path: '/announcements', color: '#22c55e', description: 'Đăng thông báo của nhà trường' },
  ];

  const attendanceData = [
    { day: 'Mon', value: 75 },
    { day: 'Tue', value: 82 },
    { day: 'Wed', value: 95 },
    { day: 'Thu', value: 88 },
    { day: 'Fri', value: 91 },
  ];

  const agendaItems = [
    { time: '08:00 am', grade: 'Toàn trường', title: 'Chào cờ & thông báo đầu tuần', color: '#e0e7ff' },
    { time: '10:00 am', grade: 'Khối 9', title: 'Ôn tập Toán cuối kỳ', color: '#ecfdf3' },
    { time: '03:00 pm', grade: 'Khối 6 - 7', title: 'Sinh hoạt CLB ngoại khóa', color: '#fef3c7' },
  ];

  const messages = [
    { sender: 'GV. Nguyễn Văn A', title: 'Đề xuất điều chỉnh thời khóa biểu', time: '10 phút trước' },
    { sender: 'Phụ huynh lớp 9A1', title: 'Xin phép nghỉ học cho học sinh', time: '1 giờ trước' },
  ];

  useEffect(() => {
    if (user) fetchSchoolInfo();
  }, [user]);

  const fetchSchoolInfo = async () => {
    try {
      const schoolId = user?.school?.id;
      if (schoolId) {
        const response = await api.get(`/schools/${schoolId}`);
        const data = response.data || null;
        setSchoolInfo(data);

        // Nếu backend có sẵn các trường thống kê thì dùng, nếu không giữ mặc định
        setStats((prev) => ({
          students: data?.studentCount ?? prev.students,
          teachers: data?.teacherCount ?? prev.teachers,
          staffs: data?.staffCount ?? prev.staffs,
          awards: data?.awardCount ?? prev.awards,
        }));
      } else {
        const response = await api.get('/schools');
        const firstSchool = response.data.schools?.[0] || null;
        setSchoolInfo(firstSchool);
        setStats((prev) => ({
          students: firstSchool?.studentCount ?? prev.students,
          teachers: firstSchool?.teacherCount ?? prev.teachers,
          staffs: firstSchool?.staffCount ?? prev.staffs,
          awards: firstSchool?.awardCount ?? prev.awards,
        }));
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      if (user?.school) {
        setSchoolInfo(user.school);
        setStats((prev) => ({
          students: user.school.studentCount ?? prev.students,
          teachers: user.school.teacherCount ?? prev.teachers,
          staffs: user.school.staffCount ?? prev.staffs,
          awards: user.school.awardCount ?? prev.awards,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBarHeight = (value) => {
    const max = Math.max(...attendanceData.map((item) => item.value), 1);
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
          <div className="ad-kpi-pill">+15%</div>
          <span className="ad-kpi-label">Học sinh</span>
          <span className="ad-kpi-value">{stats.students.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--teachers">
          <div className="ad-kpi-pill">+3%</div>
          <span className="ad-kpi-label">Giáo viên</span>
          <span className="ad-kpi-value">{stats.teachers.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--staffs">
          <div className="ad-kpi-pill">+1%</div>
          <span className="ad-kpi-label">Nhân viên</span>
          <span className="ad-kpi-value">{stats.staffs.toLocaleString('vi-VN')}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--awards">
          <div className="ad-kpi-pill">+5%</div>
          <span className="ad-kpi-label">Thành tích</span>
          <span className="ad-kpi-value">{stats.awards.toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* Khu vực giữa */}
      <div className="ad-middle-row">
        <div className="ad-card ad-card--students">
          <div className="ad-card-header">
            <span className="ad-card-title">Students</span>
          </div>
          <div className="ad-student-chart">
            <div className="ad-student-donut">
              <div className="ad-student-donut-inner">
                <div className="ad-student-icon" />
              </div>
            </div>
            <div className="ad-student-legend">
              <div className="ad-student-legend-row">
                <span className="ad-student-legend-dot ad-student-legend-dot--boys" />
                <div>
                  <div className="ad-student-legend-label">Nam</div>
                  <div className="ad-student-legend-value">45.4%</div>
                </div>
              </div>
              <div className="ad-student-legend-row">
                <span className="ad-student-legend-dot ad-student-legend-dot--girls" />
                <div>
                  <div className="ad-student-legend-label">Nữ</div>
                  <div className="ad-student-legend-value">54.6%</div>
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

        <div className="ad-card ad-card--calendar">
          <div className="ad-card-header">
            <span className="ad-card-title">Lịch trong tuần</span>
          </div>
          <div className="ad-calendar">
            <div className="ad-calendar-header">
              <span>Tháng {new Date().getMonth() + 1}</span>
              <span>{new Date().getFullYear()}</span>
            </div>
            <div className="ad-calendar-days">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="ad-agenda-list">
              {agendaItems.map((item) => (
                <div
                  key={`${item.time}-${item.title}`}
                  className="ad-agenda-item"
                  style={{ backgroundColor: item.color }}
                >
                  <div className="ad-agenda-time">{item.time}</div>
                  <div className="ad-agenda-content">
                    <div className="ad-agenda-grade">{item.grade}</div>
                    <div className="ad-agenda-title">{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
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
            <span className="ad-card-title">Messages</span>
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
            {messages.map((msg) => (
              <div key={msg.title} className="ad-message-item">
                <div className="ad-message-avatar" />
                <div className="ad-message-content">
                  <div className="ad-message-title">{msg.title}</div>
                  <div className="ad-message-meta">
                    {msg.sender} • {msg.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
