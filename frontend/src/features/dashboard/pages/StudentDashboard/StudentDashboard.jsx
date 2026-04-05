import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Bell,
  Book,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Medal,
  PencilLine,
  Trophy,
  User,
} from 'lucide-react';
import api from '../../../../shared/lib/api';
import { formatGradeAnalysisForDisplay } from '../../../../shared/lib/formatGradeAnalysisForDisplay';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import { useAuth } from '../../../auth/context/AuthContext';
import { BE_DATA_GAP_ITEMS, MOCK_ACHIEVEMENTS, MOCK_PROGRESS_CHART } from './mockData';
import './StudentDashboard.css';

/** Tiết 1–10 — khớp thời khóa biểu */
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

function periodTimeRange(period) {
  const p = Number(period);
  if (!p || p < 1 || p > PERIOD_TIMES.length) return '—';
  const { start, end } = PERIOD_TIMES[p - 1];
  return `${start} - ${end}`;
}

/** Thứ trong tuần từ API (camelCase/snake_case); 0 = Chủ nhật → 7 để khớp todayDayOfWeek */
function scheduleDayOfWeekFromRow(s) {
  const raw = s.dayOfWeek ?? s.day_of_week;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  if (n === 0) return 7;
  return n;
}

function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function hueFromString(s) {
  const hues = [217, 262, 142, 25, 330, 199];
  let h = 0;
  const str = s || '';
  for (let i = 0; i < str.length; i += 1) h += str.charCodeAt(i);
  return hues[h % hues.length];
}

/** Thời gian tương đối tiếng Việt đơn giản */
function formatRelativeVi(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const dayMs = 86400000;
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / dayMs);
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffDays === 0) return `Hôm nay • ${t}`;
  if (diffDays === 1) return `Hôm qua • ${t}`;
  if (diffDays === 2) return `Hôm kia • ${t}`;
  if (diffDays > 0 && diffDays < 7) return `${diffDays} ngày trước • ${t}`;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} • ${t}`;
}

/** Số ngày còn lại đến hạn nộp; âm = quá hạn */
function daysUntilDue(due) {
  if (!due) return null;
  const end = new Date(due);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

/**
 * Gom điểm thi theo tháng (createdAt) để vẽ biểu đồ.
 * @returns {{ data: { label: string, score: number }[], isReal: boolean }}
 */
function buildMonthlyProgressFromScores(examScores) {
  const byMonth = {};
  (examScores || []).forEach((e) => {
    const score = Number(e.score);
    if (Number.isNaN(score)) return;
    const raw = e.createdAt || e.created_at;
    if (!raw) return;
    const t = new Date(raw);
    if (Number.isNaN(t.getTime())) return;
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { sum: 0, n: 0 };
    byMonth[key].sum += score;
    byMonth[key].n += 1;
  });
  const keys = Object.keys(byMonth).sort();
  const last4 = keys.slice(-4);
  const data = last4.map((k, idx) => {
    const [, m] = k.split('-');
    const monthNum = Number(m);
    return {
      label: `Tháng ${monthNum}`,
      score: Number((byMonth[k].sum / byMonth[k].n).toFixed(1)),
      sortKey: k,
    };
  });
  const isReal = data.length >= 2;
  return { data, isReal };
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentDetail, setStudentDetail] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [examScores, setExamScores] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState('');
  const [semesterUi, setSemesterUi] = useState('2'); // chỉ UI, chưa có BE lọc theo học kỳ
  const [showBeNotes, setShowBeNotes] = useState(false);

  const studentId = user?.id;
  const schoolId = user?.school?.id;

  const displayUser = studentDetail || user;
  const fullName = displayUser?.fullName || displayUser?.full_name || 'Học sinh';
  const className = displayUser?.class?.name || classInfo?.name || '—';
  const schoolName = displayUser?.school?.name || user?.school?.name || 'Trường';
  const studentCode =
    displayUser?.studentCode ||
    displayUser?.student_code ||
    displayUser?.code ||
    (studentId ? `HS${String(studentId).padStart(5, '0')}` : '—');

  useEffect(() => {
    if (user && studentId) fetchData();
  }, [user, studentId]);

  const fetchData = async () => {
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

      let detail = null;
      let effectiveSchoolId = schoolId;
      if (!effectiveSchoolId && user?.school?.id) effectiveSchoolId = user.school.id;
      if (effectiveSchoolId) {
        try {
          const usersRes = await api.get(`/users?userRole=STUDENT&schoolId=${effectiveSchoolId}`);
          const list = usersRes.data?.users || [];
          detail = list.find((u) => u.id === studentId) || null;
        } catch {
          /* bỏ qua — không có quyền hoặc lỗi mạng */
        }
      }
      setStudentDetail(detail || user);

      let cId = detail?.class?.id ?? user?.class?.id;

      // Giống trang TKB: lấy lớp từ enrollment khi user/list users chưa gắn class
      if (!cId && studentId) {
        try {
          const enrRes = await api.get(`/users/${studentId}/enrollment`);
          const enr = enrRes.data?.enrollment;
          if (enr?.classId) cId = enr.classId;
        } catch {
          /* enrollment không khả dụng */
        }
      }

      const examUrl =
        schoolId
          ? `/exam-scores?studentId=${studentId}&schoolId=${schoolId}`
          : `/exam-scores?studentId=${studentId}`;

      const [scoresRes, studentSchRes] = await Promise.all([
        api.get(examUrl),
        api.get(`/schedules/student/${studentId}`).catch(() => ({ data: { schedules: [] } })),
      ]);

      let schedules = [];

      // Ưu tiên TKB theo lớp (cùng API trang Thời khóa biểu)
      if (cId) {
        try {
          const classSchRes = await api.get(`/schedules/class/${cId}`);
          schedules = classSchRes.data?.schedules || [];
        } catch {
          /* lỗi mạng / 403 */
        }
      }

      if (!schedules.length) {
        schedules = studentSchRes.data?.schedules || [];
      }
      /** Chuẩn hóa ngày từ API (string ISO, object LocalDate, mảng [y,m,d]) */
      const getDateStr = (s) => {
        if (!s.date) return null;
        if (typeof s.date === 'string') return s.date.slice(0, 10);
        if (Array.isArray(s.date) && s.date.length >= 3) {
          const [y, m, d] = s.date;
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        if (s.date.year != null) {
          const m = s.date.monthValue ?? s.date.month ?? 1;
          const d = s.date.dayOfMonth ?? s.date.day ?? 1;
          return `${s.date.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        return null;
      };
      /**
       * TKB hôm nay: khớp ngày cụ thể HOẶC thứ trong tuần.
       * BE thường set cả `date` (ngày mẫu khi tạo) lẫn `dayOfWeek` (1=Thứ Hai … 7=Chủ nhật, giống ISO);
       * Nếu chỉ so `date` sẽ mất tiết khi hôm nay trùng thứ nhưng khác ngày đã lưu.
       */
      const isToday = (s) => {
        const dateStr = getDateStr(s);
        if (dateStr && dateStr === todayStr) return true;
        const dow = scheduleDayOfWeekFromRow(s);
        if (dow != null) return dow === todayDayOfWeek;
        return false;
      };
      const todayList = schedules.filter(isToday).sort((a, b) => (a.period || 0) - (b.period || 0));

      setTodaySchedules(todayList);
      setExamScores(scoresRes.data?.examScores || []);

      if (cId) {
        const [assignmentsRes, mySubmissionsRes, announcementsRes, classRes, countsRes] = await Promise.all([
          api.get(`/assignments/class/${cId}`),
          api.get(`/assignments/student/${studentId}/submissions`).catch(() => ({ data: { submissions: [] } })),
          schoolId ? api.get(`/announcements?schoolId=${schoolId}`) : Promise.resolve({ data: { announcements: [] } }),
          api.get(`/classes/${cId}`),
          api.get('/classes/counts/students'),
        ]);
        const allAssignments = assignmentsRes.data?.assignments || [];
        const mySubs = mySubmissionsRes.data?.submissions || [];
        const submittedAssignmentIds = new Set(mySubs.map((s) => s.assignment?.id ?? s.assignment_id).filter(Boolean));
        setAssignments(allAssignments.filter((a) => !submittedAssignmentIds.has(a.id)));
        const allAnn = announcementsRes.data?.announcements || [];
        const forStudent = allAnn.filter((a) => {
          const ac = a.classEntity?.id ?? a.class_id;
          return ac === cId || ac == null;
        });
        setAnnouncements(forStudent);
        const raw = classRes.data?.class ?? classRes.data;
        const counts = countsRes.data || {};
        const studentCount = counts[cId] ?? counts[String(cId)] ?? raw?.studentCount ?? 0;
        const teacher = raw?.homeroomTeacher ?? raw?.homeroom_teacher;
        const cls = raw
          ? {
              ...raw,
              name: raw.name ?? raw.className,
              room: raw.room ?? '',
              homeroomTeacher: teacher ? { fullName: teacher.fullName ?? teacher.full_name ?? '—' } : null,
              studentCount: Number(studentCount) || 0,
            }
          : null;
        setClassInfo(cls);
      } else {
        setClassInfo(null);
      }
    } catch {
      /* lỗi tải dashboard — đã dừng loading ở finally */
    } finally {
      setLoading(false);
    }
  };

  const lessonsToday = todaySchedules.length;
  const avgScore =
    examScores.length > 0
      ? (examScores.reduce((s, e) => s + Number(e.score || 0), 0) / examScores.length).toFixed(1)
      : null;

  const recentScoresBySubject = examScores.reduce((acc, e) => {
    const name = e.subject?.name || 'Môn';
    if (!acc[name]) acc[name] = [];
    acc[name].push(Number(e.score));
    return acc;
  }, {});
  const recentScores = Object.entries(recentScoresBySubject).map(([name, arr]) => ({
    subject: name,
    score: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
  }));

  const recentMinScores = useMemo(() => {
    const by = {};
    (examScores || []).forEach((e) => {
      const subjectName = e.subject?.name || 'Môn';
      const score = Number(e.score);
      if (Number.isNaN(score)) return;
      if (!by[subjectName]) by[subjectName] = { min: score };
      else by[subjectName].min = Math.min(by[subjectName].min, score);
    });
    return Object.entries(by).map(([subject, v]) => ({ subject, score: v.min }));
  }, [examScores]);

  const subjectTrendBy30Days = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const currentStart = now - 30 * DAY;
    const previousStart = now - 60 * DAY;
    const by = {};
    (examScores || []).forEach((e) => {
      const subjectName = e.subject?.name || 'Môn';
      const score = Number(e.score);
      if (Number.isNaN(score)) return;
      const t = e.createdAt ? Date.parse(e.createdAt) : NaN;
      if (Number.isNaN(t)) return;
      if (!by[subjectName]) by[subjectName] = { cur: { min: null }, prev: { min: null } };
      if (t >= currentStart) {
        const curMin = by[subjectName].cur.min;
        by[subjectName].cur.min = curMin == null ? score : Math.min(curMin, score);
      } else if (t >= previousStart && t < currentStart) {
        const prevMin = by[subjectName].prev.min;
        by[subjectName].prev.min = prevMin == null ? score : Math.min(prevMin, score);
      }
    });
    return by;
  }, [examScores]);

  /** Điểm danh: chưa có BE — mô phỏng: tất cả trừ tiết cuối là đã điểm danh */
  const scheduleRowsWithMockAttendance = useMemo(() => {
    return todaySchedules.map((s, idx, arr) => ({
      schedule: s,
      attendedMock: arr.length === 0 ? false : idx < arr.length - 1,
    }));
  }, [todaySchedules]);

  const mockAttendedCount = scheduleRowsWithMockAttendance.filter((r) => r.attendedMock).length;
  const mockPendingCount = lessonsToday > 0 ? lessonsToday - mockAttendedCount : 0;
  const lastPeriodRow = scheduleRowsWithMockAttendance[scheduleRowsWithMockAttendance.length - 1];
  const pendingTimeHint =
    lastPeriodRow && !lastPeriodRow.attendedMock
      ? `Tiết ${lastPeriodRow.schedule.period ?? '?'}: ${periodTimeRange(lastPeriodRow.schedule.period)}`
      : '—';

  const attendancePct =
    lessonsToday > 0 ? Math.round((mockAttendedCount / lessonsToday) * 100) : null;

  const { data: chartFromBe, isReal: chartIsReal } = useMemo(
    () => buildMonthlyProgressFromScores(examScores),
    [examScores]
  );
  const progressChartData = chartIsReal ? chartFromBe : MOCK_PROGRESS_CHART;
  const chartUsesMock = !chartIsReal;

  const currentGpaDisplay = avgScore ?? MOCK_PROGRESS_CHART[MOCK_PROGRESS_CHART.length - 1].score;

  const analyzeWithAi = async () => {
    try {
      setAiError('');
      setAiAnalysis(null);
      if (!recentScores.length) {
        setAiError('Chưa có điểm để phân tích.');
        return;
      }
      setAiLoading(true);
      const payload = {
        target: fullName ? `Học sinh: ${fullName}` : 'Học sinh',
        subjects: recentMinScores.map((r) => ({
          name: r.subject,
          score: Number(r.score),
          previousScore: (() => {
            const t = subjectTrendBy30Days[r.subject];
            if (!t || t.prev.min == null) return null;
            return Number(Number(t.prev.min).toFixed(2));
          })(),
        })),
      };
      const res = await api.post('/ai/grade-analysis', payload);
      setAiAnalysis(formatGradeAnalysisForDisplay(res.data) || '');
    } catch (e) {
      setAiError(e?.response?.data?.error || e?.message || 'Phân tích AI thất bại');
    } finally {
      setAiLoading(false);
    }
  };

  const headerDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isSunday = new Date().getDay() === 0;

  if (loading) {
    return (
      <div className="sd2-wrap">
        <div className="sd2-loading">
          <div className="sd2-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd2-wrap">
      {/* Header: breadcrumb + ngày + chuông */}
      <header className="sd2-page-head">
        <nav className="sd2-breadcrumb" aria-label="Breadcrumb">
          <span>Học sinh</span>
          <span className="sd2-bc-sep">/</span>
          <span className="sd2-bc-current">Tổng quan</span>
        </nav>
        <div className="sd2-head-actions">
          <time className="sd2-head-date" dateTime={new Date().toISOString()}>
            <Calendar size={16} strokeWidth={2} aria-hidden />
            {headerDate}
          </time>
          <button type="button" className="sd2-icon-btn" aria-label="Thông báo" title="Thông báo (chưa có API đếm)">
            <Bell size={20} strokeWidth={2} />
            {announcements.length > 0 ? <span className="sd2-badge">{Math.min(announcements.length, 9)}</span> : null}
          </button>
        </div>
      </header>

      {/* Hồ sơ — BE: tên, lớp, trường, mã HS (mã có thể fallback) | mock: học kỳ/năm học */}
      <section className="sd2-hero" aria-label="Hồ sơ học sinh">
        <div className="sd2-hero-inner">
          <div className="sd2-avatar" aria-hidden>
            {displayUser?.avatarUrl || displayUser?.avatar_url ? (
              <img src={displayUser.avatarUrl || displayUser.avatar_url} alt="" className="sd2-avatar-img" />
            ) : (
              <span className="sd2-avatar-initials">{initials(fullName)}</span>
            )}
          </div>
          <div className="sd2-hero-text">
            <h1 className="sd2-hero-name">{fullName}</h1>
            <p className="sd2-hero-sub">
              {className !== '—' ? `Lớp ${className}` : 'Chưa xếp lớp'}
              <span className="sd2-dot">•</span>
              <span className="sd2-mock-tag" title="Chưa có API học kỳ/năm học — hiển thị mẫu">
                Học kỳ {semesterUi}
              </span>
              <span className="sd2-dot">•</span>
              <span className="sd2-mock-tag" title="Chưa có API năm học — hiển thị mẫu">
                Năm học 2025 - 2026
              </span>
            </p>
            <div className="sd2-hero-tags">
              <span className="sd2-tag">
                <BookOpen size={14} strokeWidth={2} aria-hidden />
                {schoolName}
              </span>
              <span className="sd2-tag">
                <User size={14} strokeWidth={2} aria-hidden />
                Mã học sinh: {studentCode}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 thẻ thống kê */}
      <section className="sd2-stats" aria-label="Thống kê nhanh">
        <article className="sd2-stat sd2-stat--purple">
          <div className="sd2-stat-icon-wrap sd2-stat-icon-wrap--purple">
            <Book size={22} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="sd2-stat-label">Tiết hôm nay</p>
            <p className="sd2-stat-value">{lessonsToday}</p>
            <p className="sd2-stat-hint sd2-stat-hint--mock" title="Ước tính UI — chưa có API điểm danh theo tiết">
              {lessonsToday > 0 ? `${mockAttendedCount} tiết đã hoàn thành (mẫu)` : 'Không có tiết'}
            </p>
          </div>
        </article>
        <article className="sd2-stat sd2-stat--green">
          <div className="sd2-stat-icon-wrap sd2-stat-icon-wrap--green">
            <CheckCircle2 size={22} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="sd2-stat-label">Điểm danh</p>
            <p className="sd2-stat-value">
              {lessonsToday > 0 ? `${mockAttendedCount}/${lessonsToday}` : '—'}
            </p>
            <p className="sd2-stat-hint sd2-stat-hint--mock" title="Chưa có API chuyên cần">
              {attendancePct != null ? (
                <>
                  <span className="sd2-stat-up">↑</span> {attendancePct}% (mẫu)
                </>
              ) : (
                'Chưa có dữ liệu'
              )}
            </p>
          </div>
        </article>
        <article className="sd2-stat sd2-stat--orange">
          <div className="sd2-stat-icon-wrap sd2-stat-icon-wrap--orange">
            <Clock size={22} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="sd2-stat-label">Chưa điểm danh</p>
            <p className="sd2-stat-value">{lessonsToday > 0 ? String(mockPendingCount) : '—'}</p>
            <p className="sd2-stat-hint sd2-stat-hint--mock" title="Chưa có API — gợi ý theo tiết cuối (mẫu)">
              {lessonsToday > 0 ? pendingTimeHint : '—'}
            </p>
          </div>
        </article>
        <article className="sd2-stat sd2-stat--blue">
          <div className="sd2-stat-icon-wrap sd2-stat-icon-wrap--blue">
            <BarChart3 size={22} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="sd2-stat-label">Điểm TB</p>
            <p className="sd2-stat-value">{avgScore ?? '—'}</p>
            <p className="sd2-stat-hint sd2-stat-hint--mock" title="Điểm TB từ điểm thi; so sánh HK chưa có API">
              {avgScore ? (
                <>
                  <span className="sd2-stat-up">↑</span> 0.6 so với Học kỳ 1 (mẫu)
                </>
              ) : (
                'Chưa có điểm thi'
              )}
            </p>
          </div>
        </article>
      </section>

      <div className="sd2-grid">
        {/* Cột trái */}
        <div className="sd2-col sd2-col--main">
          <section className="sd2-card">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Thời khóa biểu hôm nay</h2>
              <div className="sd2-card-actions">
                <button type="button" className="sd2-link-btn" onClick={() => navigate('/schedules')}>
                  Xem tuần
                </button>
                <div className="sd2-arrow-group" aria-label="Điều hướng tuần">
                  <button
                    type="button"
                    className="sd2-icon-btn sd2-icon-btn--sm"
                    aria-label="Tuần trước — mở thời khóa biểu"
                    title="Chưa có API tuần; mở trang Thời khóa biểu"
                    onClick={() => navigate('/schedules')}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="sd2-icon-btn sd2-icon-btn--sm"
                    aria-label="Tuần sau — mở thời khóa biểu"
                    title="Chưa có API tuần; mở trang Thời khóa biểu"
                    onClick={() => navigate('/schedules')}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="sd2-table-wrap">
              <table className="sd2-table">
                <thead>
                  <tr>
                    <th>Tiết</th>
                    <th>Thời gian</th>
                    <th>Môn học</th>
                    <th>Giáo viên</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="sd2-empty">
                        {isSunday
                          ? 'Hôm nay là Chủ nhật — không có tiết học trên thời khóa biểu.'
                          : 'Không có tiết nào hôm nay.'}
                      </td>
                    </tr>
                  ) : (
                    scheduleRowsWithMockAttendance.map(({ schedule: s, attendedMock }) => {
                      const subj = scheduleSubjectDisplayName(s, '—');
                      const hue = hueFromString(subj);
                      return (
                        <tr
                          key={s.id}
                          className={!attendedMock ? 'sd2-row-pending' : undefined}
                          title={!attendedMock ? 'Trạng thái điểm danh: dữ liệu mẫu (chưa có API)' : undefined}
                        >
                          <td>Tiết {s.period ?? '—'}</td>
                          <td className="sd2-nowrap">{periodTimeRange(s.period)}</td>
                          <td>
                            <span className="sd2-subj-cell">
                              <span
                                className="sd2-subj-dot"
                                style={{ background: `hsl(${hue} 70% 52%)` }}
                                aria-hidden
                              />
                              {subj}
                            </span>
                          </td>
                          <td>{s.teacher?.fullName ?? s.teacher?.full_name ?? '—'}</td>
                          <td>
                            {attendedMock ? (
                              <span className="sd2-pill sd2-pill--ok">Đã điểm danh</span>
                            ) : (
                              <span className="sd2-pill sd2-pill--wait">Chưa điểm danh</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sd2-card">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Điểm số gần đây</h2>
              <button type="button" className="sd2-link-btn" onClick={() => navigate('/exam-scores')}>
                Xem chi tiết
              </button>
            </div>
            {recentScores.length === 0 ? (
              <p className="sd2-empty sd2-empty--block">Chưa có điểm.</p>
            ) : (
              <ul className="sd2-grade-list">
                {recentScores.slice(0, 8).map((r) => {
                  const val = Math.min(10, Math.max(0, Number(r.score)));
                  const pct = (val / 10) * 100;
                  return (
                    <li key={r.subject} className="sd2-grade-row">
                      <span className="sd2-grade-name">{r.subject}</span>
                      <div className="sd2-grade-bar-wrap">
                        <div className="sd2-grade-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="sd2-grade-num">{r.score}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="sd2-ai-block">
              <button
                type="button"
                className="sd2-outline-btn"
                onClick={analyzeWithAi}
                disabled={aiLoading || recentScores.length === 0}
              >
                {aiLoading ? 'Đang phân tích...' : 'Phân tích bằng AI'}
              </button>
              {aiError ? <p className="sd2-ai-err">{aiError}</p> : null}
              {aiAnalysis ? <pre className="sd2-ai-out">{aiAnalysis}</pre> : null}
            </div>
          </section>
        </div>

        {/* Cột giữa — biểu đồ */}
        <div className="sd2-col sd2-col--mid">
          <section className="sd2-card sd2-card--chart">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Tiến độ học tập</h2>
              <select
                className="sd2-select"
                value={semesterUi}
                onChange={(e) => setSemesterUi(e.target.value)}
                aria-label="Học kỳ"
                title="Chưa lọc dữ liệu theo học kỳ — chỉ giao diện"
              >
                <option value="1">Học kỳ 1</option>
                <option value="2">Học kỳ 2</option>
              </select>
            </div>
            {chartUsesMock ? (
              <p className="sd2-chart-note">
                Đang dùng đường mẫu — cần ít nhất 2 tháng có điểm (theo ngày tạo bản ghi điểm) để vẽ từ API.
              </p>
            ) : null}
            <div className="sd2-chart-box">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={progressChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sd2grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="#94a3b8" width={28} />
                  <Tooltip
                    formatter={(v) => [`${v}`, 'Điểm TB']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#sd2grad)"
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="sd2-chart-foot">
              <span className="sd2-chart-metric sd2-chart-metric--mock" title="Chưa có API so sánh học kỳ">
                <span className="sd2-stat-up">↑</span> 0.6 điểm (mẫu)
              </span>
              <span className="sd2-chart-metric sd2-chart-metric--mock" title="Chưa có API xếp hạng">
                <Trophy size={16} strokeWidth={2} aria-hidden />
                Top 15% trong lớp (mẫu)
              </span>
            </div>
            <p className="sd2-chart-current">
              Điểm hiện tại (tháng cuối biểu đồ): <strong>{currentGpaDisplay}</strong>
            </p>
          </section>
        </div>

        {/* Cột phải */}
        <div className="sd2-col sd2-col--side">
          <section className="sd2-card">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Bài tập cần nộp</h2>
              <button type="button" className="sd2-link-btn" onClick={() => navigate('/assignments')}>
                Xem tất cả
              </button>
            </div>
            <ul className="sd2-list">
              {assignments.length === 0 ? (
                <li className="sd2-empty sd2-empty--block">Không có bài tập cần nộp.</li>
              ) : (
                assignments.slice(0, 5).map((a, i) => {
                  const dLeft = daysUntilDue(a.dueDate || a.due_date);
                  const overdue = dLeft != null && dLeft < 0;
                  const soon = dLeft != null && dLeft >= 0 && dLeft <= 7;
                  return (
                    <li key={a.id} className="sd2-list-item">
                      <span className={`sd2-sq-icon ${i % 2 === 0 ? 'sd2-sq-icon--violet' : 'sd2-sq-icon--sky'}`}>
                        {i % 2 === 0 ? <ClipboardList size={18} /> : <PencilLine size={18} />}
                      </span>
                      <div className="sd2-list-body">
                        <span className="sd2-list-title">{a.title}</span>
                        {overdue ? (
                          <span className="sd2-pill sd2-pill--danger">Quá hạn</span>
                        ) : soon && dLeft != null ? (
                          <span className="sd2-pill sd2-pill--info">Còn {dLeft} ngày</span>
                        ) : dLeft != null ? (
                          <span className="sd2-pill sd2-pill--muted">Còn {dLeft} ngày</span>
                        ) : (
                          <span className="sd2-pill sd2-pill--muted">Chưa có hạn</span>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="sd2-card">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Thông báo từ giáo viên</h2>
              <button type="button" className="sd2-link-btn" onClick={() => navigate('/announcements')}>
                Xem tất cả
              </button>
            </div>
            <ul className="sd2-announce">
              {announcements.length === 0 ? (
                <li className="sd2-empty sd2-empty--block">Chưa có thông báo.</li>
              ) : (
                announcements.slice(0, 3).map((a, idx) => {
                  const author = a.createdBy?.fullName || a.created_by?.fullName || 'Giáo viên';
                  const hue = hueFromString(author) + idx * 17;
                  return (
                    <li key={a.id} className="sd2-announce-item">
                      <span
                        className="sd2-announce-av"
                        style={{ background: `linear-gradient(135deg, hsl(${hue % 360} 65% 55%), hsl(${(hue + 40) % 360} 65% 45%))` }}
                      >
                        {initials(author)}
                      </span>
                      <div className="sd2-announce-main">
                        <div className="sd2-announce-top">
                          <span className="sd2-announce-name">{author}</span>
                          <span className="sd2-dot-live" title="Chưa đọc — chưa có API trạng thái đọc" />
                        </div>
                        <span className="sd2-announce-subj">
                          {a.classEntity?.name || a.class?.name || 'Thông báo chung'}
                        </span>
                        <p className="sd2-announce-snippet">{a.title || a.content?.slice(0, 80) || '—'}</p>
                        <time className="sd2-announce-time">{formatRelativeVi(a.createdAt || a.created_at)}</time>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="sd2-card sd2-card--achieve" data-mock="true">
            <div className="sd2-card-head">
              <h2 className="sd2-card-title">Thành tích &amp; khen thưởng</h2>
              <span className="sd2-mock-pill">Dữ liệu mẫu</span>
            </div>
            <ul className="sd2-achieve-list">
              {MOCK_ACHIEVEMENTS.map((item) => (
                <li key={item.id} className="sd2-achieve-item">
                  {item.icon === 'trophy' ? (
                    <Trophy size={20} className="sd2-achieve-ic" aria-hidden />
                  ) : (
                    <Medal size={20} className="sd2-achieve-ic" aria-hidden />
                  )}
                  <div>
                    <p className="sd2-achieve-title">{item.title}</p>
                    <p className="sd2-achieve-sub">{item.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="sd2-link-btn sd2-link-btn--block" disabled title="Chưa có trang danh sách thành tích">
              Xem tất cả
            </button>
          </section>
        </div>
      </div>

      <footer className="sd2-foot">
        <button type="button" className="sd2-foot-toggle" onClick={() => setShowBeNotes((v) => !v)}>
          {showBeNotes ? 'Ẩn' : 'Hiện'} ghi chú phần chưa có API backend
        </button>
        {showBeNotes ? (
          <ul className="sd2-foot-list">
            {BE_DATA_GAP_ITEMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}
      </footer>
    </div>
  );
};

export default StudentDashboard;
