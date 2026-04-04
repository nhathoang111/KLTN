
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import './ParentDashboard.css';

const PERIOD_TIMES = [
  { start: '07:00', end: '07:45' },
  { start: '07:50', end: '08:35' },
  { start: '08:40', end: '09:25' },
  { start: '09:30', end: '10:15' },
  { start: '10:20', end: '11:05' },
  { start: '13:00', end: '13:45' },
  { start: '13:50', end: '14:35' },
  { start: '14:40', end: '15:25' },
  { start: '15:30', end: '16:15' },
  { start: '16:20', end: '17:05' },
];

const FULL_DAY_PERIODS = Array.from({ length: 10 }, (_, index) => index + 1);

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(localStorage.getItem('activeStudentId'));
  const [timeline, setTimeline] = useState([]);
  const [attendanceItems, setAttendanceItems] = useState([]);
  const [loadingTodayData, setLoadingTodayData] = useState(false);

  const toDateYmd = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getScheduleDateString = (schedule) => {
    const rawDate = schedule?.date ?? schedule?.scheduleDate ?? schedule?.attendanceDate;
    if (!rawDate) return null;

    if (typeof rawDate === 'string') {
      return rawDate.slice(0, 10);
    }

    if (Array.isArray(rawDate) && rawDate.length >= 3) {
      const [year, month, day] = rawDate;
      if (year && month && day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    if (rawDate.year != null) {
      const month = rawDate.monthValue ?? rawDate.month ?? 1;
      const day = rawDate.dayOfMonth ?? rawDate.day ?? 1;
      return `${rawDate.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return null;
  };

  const inferDayOfWeek = (schedule) => {
    if (schedule?.dayOfWeek != null) return Number(schedule.dayOfWeek);
    const dateStr = getScheduleDateString(schedule);
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    const js = d.getDay();
    return js === 0 ? 7 : js;
  };

  const periodTime = (period) => {
    const index = Number(period) - 1;
    if (index < 0 || index >= PERIOD_TIMES.length) return '—';
    return `${PERIOD_TIMES[index].start} - ${PERIOD_TIMES[index].end}`;
  };

  const attendanceLabel = (status) => {
    const value = (status || '').toUpperCase();
    if (value === 'PRESENT') return 'Có mặt';
    if (value === 'ABSENT') return 'Vắng';
    if (value === 'LATE') return 'Đi muộn';
    return 'Chưa điểm danh';
  };

  const attendanceBadgeClass = (status) => {
    const value = (status || '').toUpperCase();
    if (value === 'PRESENT') return 'present';
    if (value === 'ABSENT') return 'absent';
    if (value === 'LATE') return 'late';
    return 'pending';
  };

  useEffect(() => {
    const fetchParentDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${user.id}`);
        setChildren(response.data.children || []);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách con em:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchParentDetails();
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedChildId) {
        setTimeline([]);
        setAttendanceItems([]);
        return;
      }

      try {
        setLoadingTodayData(true);
        const now = new Date();
        const todayStr = toDateYmd(now);
        const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
        const [scheduleResult, attendanceResult] = await Promise.allSettled([
          api.get(`/schedules/student/${selectedChildId}`),
          api.get('/attendance', { params: { studentId: Number(selectedChildId), date: todayStr } }),
        ]);

        if (scheduleResult.status !== 'fulfilled') {
          throw scheduleResult.reason;
        }

        const schedules = scheduleResult.value.data?.schedules || [];
        const schedulesByDate = schedules
          .filter((item) => {
            const dateStr = getScheduleDateString(item);
            return !!dateStr && dateStr === todayStr;
          });
        const relevantSchedules = (schedulesByDate.length > 0 ? schedulesByDate : (schedules || [])
          .filter((item) => inferDayOfWeek(item) === todayDayOfWeek))
          .sort((a, b) => {
            const pa = Number(a.period || 0);
            const pb = Number(b.period || 0);
            if (pa !== pb) return pa - pb;
            const aDate = getScheduleDateString(a);
            const bDate = getScheduleDateString(b);
            const aScore = aDate === todayStr ? 0 : 1;
            const bScore = bDate === todayStr ? 0 : 1;
            return aScore - bScore;
          });

        const byPeriod = new Map();
        relevantSchedules.forEach((item) => {
          const p = Number(item.period || 0);
          if (p >= 1 && p <= 10 && !byPeriod.has(p)) {
            byPeriod.set(p, item);
          }
        });

        const fullDayTimeline = FULL_DAY_PERIODS.map((period) => ({
          period,
          schedule: byPeriod.get(period) || null,
        }));
        setTimeline(fullDayTimeline);

        // Lấy dữ liệu từ trường 'items' của AttendanceGetResponse
        const attendanceData = attendanceResult.status === 'fulfilled' ? attendanceResult.value.data : null;
        const todayRecords = attendanceData?.items || attendanceData?.attendance || [];

        if (attendanceResult.status !== 'fulfilled') {
          console.warn('Không tải được dữ liệu điểm danh, vẫn hiển thị thời khóa biểu.', attendanceResult.reason);
        }

        const mappedAttendance = fullDayTimeline
          .filter((slot) => slot.schedule)
          .map((slot, index) => {
            const schedule = slot.schedule;
            const sectionId = schedule?.classSection?.id ?? schedule?.classSectionId ?? schedule?.classSection_id;
            const subjectName = scheduleSubjectDisplayName(schedule, 'Môn học');

            const matched = (todayRecords || []).find((record) => {
              const recordSectionId = record?.classSectionId ?? record?.classSection?.id;
              if (sectionId != null && recordSectionId != null) {
                return String(sectionId) === String(recordSectionId);
              }
              return false;
            });

            return {
              key: `${schedule.id || sectionId || 'attendance'}-${index}`,
              period: slot.period,
              subject: subjectName,
              teacher: schedule?.teacher?.fullName || '—',
              room: schedule?.room || '—',
              status: matched?.status || 'PENDING',
            };
          });

        setAttendanceItems(mappedAttendance);
      } catch (error) {
        console.error('Lỗi khi tải dashboard phụ huynh:', error);
        setTimeline([]);
        setAttendanceItems([]);
      } finally {
        setLoadingTodayData(false);
      }
    };

    fetchDashboardData();
  }, [selectedChildId]);

  const handleSelectChild = (child) => {
    localStorage.setItem('activeStudentId', child.id);
    localStorage.setItem('activeStudentName', child.fullName);
    setSelectedChildId(String(child.id));
    window.location.href = '/schedules';
  };

  const handleUnselect = () => {
    localStorage.removeItem('activeStudentId');
    localStorage.removeItem('activeStudentName');
    setSelectedChildId(null);
    window.location.reload();
  };

  if (loading) {
    return <div className="parent-dashboard-container">Đang tải danh sách con em...</div>;
  }

  const selectedChild = children.find((child) => String(child.id) === String(selectedChildId));
  const selectedChildName = selectedChild?.fullName || localStorage.getItem('activeStudentName') || 'con bạn';

  const lessonsToday = attendanceItems.length;
  const checkedInCount = attendanceItems.filter((item) => ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes((item.status || '').toUpperCase())).length;
  const pendingCount = attendanceItems.filter((item) => (item.status || '').toUpperCase() === 'PENDING').length;

  return (
    <div className="dashboard">
      <div className="pd-shell">
        <div className="pd-topline">
          <span className="pd-topline__crumb">Bảng điều khiển dành cho Phụ huynh</span>
          <h1 className="pd-topline__title">
           <b>Hệ thống quản lý thông tin học tập của con em bạn tại {user?.school?.name || 'nhà trường'}</b>
          </h1>
        </div>

        <div className="dashboard-content">
          {selectedChildId ? (
            <div className="pd-wrap">
              <div className="pd-hero">
                <div className="pd-hero-copy">
                  <div className="pd-hero-kicker">PHỤ HUYNH * ĐANG XEM CON</div>
                  <div className="pd-hero-name">{selectedChildName}</div>
                  <div className="pd-hero-meta">Thông tin học tập trong ngày hôm nay</div>
                </div>
                <button className="pd-hero-button" onClick={handleUnselect}>Đổi con khác</button>
              </div>

              <div className="pd-kpis">
                <div className="pd-kpi pd-kpi--blue">
                  <div className="pd-kpi__icon pd-kpi__icon--book" />
                  <div className="pd-kpi__content">
                    <div className="pd-kpi__label">Tiết học hôm nay</div>
                    <div className="pd-kpi__value">{lessonsToday} tiết</div>
                  </div>
                </div>
                <div className="pd-kpi pd-kpi--green">
                  <div className="pd-kpi__icon pd-kpi__icon--check" />
                  <div className="pd-kpi__content">
                    <div className="pd-kpi__label">Đã điểm danh</div>
                    <div className="pd-kpi__value">{checkedInCount} tiết</div>
                  </div>
                </div>
                <div className="pd-kpi pd-kpi--orange">
                  <div className="pd-kpi__icon pd-kpi__icon--pending" />
                  <div className="pd-kpi__content">
                    <div className="pd-kpi__label">Chưa điểm danh</div>
                    <div className="pd-kpi__value">{pendingCount} tiết</div>
                  </div>
                </div>
              </div>

              {loadingTodayData ? (
                <div className="pd-loading-card">
                  <div className="pd-spinner" />
                  <p>Đang tải thời khóa biểu và điểm danh hôm nay...</p>
                </div>
              ) : (
                <div className="pd-grid">
                  <section className="pd-card pd-card--wide">
                    <div className="pd-card__head">
                      <h3>Thời khóa biểu hôm nay</h3>
                    </div>

                    <div className="pd-timeline">
                      {timeline.length === 0 ? (
                        <div className="pd-empty">Không có dữ liệu thời khóa biểu.</div>
                      ) : (
                        timeline.map((slot) => (
                          <div key={slot.period} className={`pd-timeline__item ${slot.schedule ? '' : 'is-empty-slot'}`}>
                            <div className="pd-timeline__left">
                              <span className="pd-period-tag">Tiết {slot.period}</span>
                              <span className="pd-period-time">{periodTime(slot.period)}</span>
                            </div>

                            {slot.schedule ? (
                              <div className="pd-timeline__main">
                                <div className="pd-timeline__subject">{scheduleSubjectDisplayName(slot.schedule, '—')}</div>
                                <div className="pd-timeline__meta">
                                  <span>👤 GV: {slot.schedule?.teacher?.fullName || '—'}</span>
                                  <span>📍 Phòng: {slot.schedule?.room || '—'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="pd-timeline__main">
                                <div className="pd-timeline__subject pd-empty-subject">Không có tiết học</div>
                                <div className="pd-timeline__meta">
                                  <span>Trống</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="pd-card pd-card--side">
                    <div className="pd-card__head">
                      <h3>Điểm danh hôm nay</h3>
                      <span className="pd-badge pd-badge--soft">{checkedInCount}/{lessonsToday || 0}</span>
                    </div>

                    <div className="pd-attendance">
                      {attendanceItems.length === 0 ? (
                        <div className="pd-empty">Hôm nay không có tiết học để điểm danh.</div>
                      ) : (
                        attendanceItems.map((item) => (
                          <div key={item.key} className="pd-attendance__item">
                            <div className="pd-attendance__body">
                              <div className="pd-attendance__title">Tiết {item.period}: {item.subject}</div>
                              <div className="pd-attendance__meta">👤 {item.teacher}</div>
                              <div className="pd-attendance__meta">📍 Phòng: {item.room}</div>
                            </div>
                            <span className={`pd-status pd-status--${attendanceBadgeClass(item.status)}`}>
                              {attendanceLabel(item.status)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          ) : children.length === 0 ? (
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
                  className={`feature-card child-card ${selectedChildId === String(child.id) ? 'selected' : ''}`}
                  onClick={() => handleSelectChild(child)}
                >
                  <div className="child-avatar">
                    <span className="avatar-icon">👤</span>
                  </div>
                  <h3>{child.fullName}</h3>
                  <p className="child-email">{child.email}</p>
                  <p className="child-school">Trường: {user?.school?.name || '—'}</p>

                  <button className={`select-btn ${selectedChildId === String(child.id) ? 'active' : ''}`}>
                    {selectedChildId === String(child.id) ? 'Đang chọn' : 'Chọn xem thông tin'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
