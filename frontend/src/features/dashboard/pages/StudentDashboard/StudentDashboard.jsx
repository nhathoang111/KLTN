import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/lib/api';
import { formatGradeAnalysisForDisplay } from '../../../../shared/lib/formatGradeAnalysisForDisplay';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import { useAuth } from '../../../auth/context/AuthContext';
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

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentDetail, setStudentDetail] = useState(null); // user + class từ API
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [examScores, setExamScores] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [classInfo, setClassInfo] = useState(null); // class detail + student count
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState('');

  const studentId = user?.id;
  const schoolId = user?.school?.id;
  const classId = studentDetail?.class?.id;

  useEffect(() => {
    if (user && studentId) fetchData();
  }, [user, studentId]);

  const fetchData = async () => {
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

      // Lấy user đầy đủ (có class) cho student — backend cho phép STUDENT gọi với userRole=STUDENT&schoolId
      let detail = null;
      let effectiveSchoolId = schoolId;
      if (!effectiveSchoolId && user?.school?.id) effectiveSchoolId = user.school.id;
      if (effectiveSchoolId) {
        try {
          const usersRes = await api.get(`/users?userRole=STUDENT&schoolId=${effectiveSchoolId}`);
          const list = usersRes.data?.users || [];
          detail = list.find((u) => u.id === studentId) || null;
        } catch (err) {
          console.warn('Could not fetch student detail with class:', err?.response?.status, err?.message);
        }
      }
      setStudentDetail(detail || user);

      const cId = detail?.class?.id ?? user?.class?.id;

      const [schedulesRes, scoresRes] = await Promise.all([
        api.get(`/schedules/student/${studentId}`),
        // Lọc theo đúng school để chỉ thấy môn thuộc trường của học sinh
        api.get(
          schoolId
            ? `/exam-scores?studentId=${studentId}&schoolId=${schoolId}`
            : `/exam-scores?studentId=${studentId}`
        ),
      ]);

      const schedules = schedulesRes.data?.schedules || [];
      const getDateStr = (s) => {
        if (!s.date) return null;
        if (typeof s.date === 'string') return s.date.slice(0, 10);
        if (s.date.year != null) {
          const m = s.date.monthValue ?? s.date.month ?? 1;
          const d = s.date.dayOfMonth ?? s.date.day ?? 1;
          return `${s.date.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        return null;
      };
      const isToday = (s) => {
        const dateStr = getDateStr(s);
        if (dateStr) return dateStr === todayStr;
        if (s.dayOfWeek != null) return Number(s.dayOfWeek) === todayDayOfWeek;
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
        const cls = raw ? {
          ...raw,
          name: raw.name ?? raw.className,
          room: raw.room ?? '',
          homeroomTeacher: teacher ? { fullName: teacher.fullName ?? teacher.full_name ?? '—' } : null,
          studentCount: Number(studentCount) || 0,
        } : null;
        setClassInfo(cls);
      } else {
        setClassInfo(null);
      }
    } catch (e) {
      console.error('Error fetching student dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const lessonsToday = todaySchedules.length;
  const assignmentsToSubmit = assignments; // Đã lọc chỉ bài chưa nộp (từ API submissions)
  const unsubmittedCount = assignments.length;
  const avgScore =
    examScores.length > 0
      ? (examScores.reduce((s, e) => s + Number(e.score || 0), 0) / examScores.length).toFixed(1)
      : '—';
  const recentScoresBySubject = examScores
    .reduce((acc, e) => {
      const name = e.subject?.name || 'Môn';
      if (!acc[name]) acc[name] = [];
      acc[name].push(Number(e.score));
      return acc;
    }, {});
  const recentScores = Object.entries(recentScoresBySubject).map(([name, arr]) => ({
    subject: name,
    score: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
  }));

  // Dùng "điểm thấp nhất" theo môn để AI chắc chắn liệt kê môn có điểm dưới 5.0
  const recentMinScores = React.useMemo(() => {
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

  const subjectTrendBy30Days = React.useMemo(() => {
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

  const analyzeWithAi = async () => {
    try {
      setAiError('');
      setAiAnalysis(null);
      if (!recentScores.length) {
        setAiError('Chưa có điểm để phân tích.');
        return;
      }
      setAiLoading(true);

      const fullName = user?.fullName || studentDetail?.fullName || '';

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

  const formatDueDate = (d) => {
    if (!d) return '';
    const x = new Date(d);
    return `Ngày: ${x.getDate().toString().padStart(2, '0')}/${(x.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="sd-wrap">
        <div className="sd-loading">
          <div className="sd-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-wrap">
      {/* 4 thẻ thống kê */}
      <div className="sd-stats-row">
        <div className="sd-stat-card sd-stat-card--purple">
          <div className="sd-stat-icon sd-stat-icon--book" />
          <div className="sd-stat-body">
            <span className="sd-stat-label">Tiết học hôm nay</span>
            <span className="sd-stat-value">{lessonsToday} tiết</span>
          </div>
        </div>
        <div className="sd-stat-card sd-stat-card--orange">
          <div className="sd-stat-icon sd-stat-icon--assign" />
          <div className="sd-stat-body">
            <span className="sd-stat-label">Bài tập chưa nộp</span>
            <span className="sd-stat-value">{unsubmittedCount} bài</span>
          </div>
        </div>
        <div className="sd-stat-card sd-stat-card--blue">
          <div className="sd-stat-icon sd-stat-icon--star" />
          <div className="sd-stat-body">
            <span className="sd-stat-label">Điểm trung bình</span>
            <span className="sd-stat-value">{avgScore}</span>
          </div>
        </div>
        <div className="sd-stat-card sd-stat-card--teal">
          <div className="sd-stat-icon sd-stat-icon--bell" />
          <div className="sd-stat-body">
            <span className="sd-stat-label">Thông báo mới</span>
            <span className="sd-stat-value">{announcements.length} thông báo</span>
          </div>
        </div>
      </div>

      {/* 2 cột chính */}
      <div className="sd-main-row">
        <div className="sd-left-col">
          <div className="sd-card">
            <h3 className="sd-card-title">Thời khóa biểu hôm nay</h3>
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th>Tiết</th>
                    <th>Môn</th>
                    <th>Giáo viên</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedules.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="sd-empty">Không có tiết nào hôm nay.</td>
                    </tr>
                  ) : (
                    todaySchedules.map((s) => (
                      <tr key={s.id}>
                        <td>Tiết {s.period ?? '-'}</td>
                        <td>{scheduleSubjectDisplayName(s, '-')}</td>
                        <td>{s.teacher?.fullName ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sd-card">
            <h3 className="sd-card-title">Điểm gần đây</h3>
            <ul className="sd-score-list">
              {recentScores.length === 0 ? (
                <li className="sd-empty">Chưa có điểm.</li>
              ) : (
                recentScores.slice(0, 5).map((r) => (
                  <li key={r.subject} className="sd-score-item">
                    <span className="sd-score-subject">{r.subject}</span>
                    <span className="sd-score-value">{r.score}</span>
                  </li>
                ))
              )}
            </ul>
            <button type="button" className="sd-view-all" onClick={() => navigate('/exam-scores')}>
              Xem tất cả
            </button>

            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="sd-view-all"
                onClick={analyzeWithAi}
                disabled={aiLoading || recentScores.length === 0}
              >
                {aiLoading ? 'Đang phân tích...' : 'Phân tích bằng AI'}
              </button>

              {aiError && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#b91c1c',
                  }}
                >
                  {aiError}
                </div>
              )}

              {aiAnalysis && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: '#312e81',
                    whiteSpace: 'pre-line',
                    maxHeight: '240px',
                    overflow: 'auto',
                  }}
                >
                  {aiAnalysis}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sd-right-col">
          <div className="sd-card">
            <div className="sd-card-head">
              <h3 className="sd-card-title">Bài tập cần nộp</h3>
              <button type="button" className="sd-view-all" onClick={() => navigate('/assignments')}>
                Xem tất cả
              </button>
            </div>
            <ul className="sd-assign-list">
              {assignmentsToSubmit.length === 0 ? (
                <li className="sd-empty">Không có bài tập cần nộp.</li>
              ) : (
                assignmentsToSubmit.slice(0, 5).map((a) => (
                  <li key={a.id} className="sd-assign-item">
                    <span className="sd-assign-icon" />
                    <div className="sd-assign-body">
                      <span className="sd-assign-title">{a.title}</span>
                      {a.dueDate && <span className="sd-assign-due">{formatDueDate(a.dueDate)}</span>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <h3 className="sd-card-title">Thông báo từ giáo viên</h3>
              <button type="button" className="sd-view-all" onClick={() => navigate('/announcements')}>
                Xem tất cả
              </button>
            </div>
            <ul className="sd-announce-list">
              {announcements.length === 0 ? (
                <li className="sd-empty">Chưa có thông báo.</li>
              ) : (
                announcements.slice(0, 4).map((a) => (
                  <li key={a.id} className="sd-announce-item">
                    <div className="sd-announce-avatar">
                      {(a.createdBy?.fullName || 'G').charAt(0)}
                    </div>
                    <div className="sd-announce-body">
                      <span className="sd-announce-author">
                        {a.createdBy?.fullName || 'Giáo viên'}
                      </span>
                      <span className="sd-announce-title">{a.title}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sd-card">
            <div className="sd-card-head">
              <h3 className="sd-card-title">Thông tin lớp</h3>
              <button type="button" className="sd-view-all" onClick={() => navigate('/schedules')}>
                Xem tất cả
              </button>
            </div>
            <div className="sd-class-info">
              <div className="sd-class-row">
                <span className="sd-class-icon sd-class-icon--room" />
                <span>{classInfo?.name || '—'}</span>
              </div>
              <div className="sd-class-row">
                <span className="sd-class-icon sd-class-icon--pin" />
                <span>Phòng {classInfo?.room || '—'}</span>
              </div>
              <div className="sd-class-row">
                <span className="sd-class-icon sd-class-icon--person" />
                <span>GVCN {classInfo?.homeroomTeacher?.fullName || '—'}</span>
              </div>
              <div className="sd-class-row">
                <span className="sd-class-icon sd-class-icon--group" />
                <span>Sĩ số {classInfo?.studentCount ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
