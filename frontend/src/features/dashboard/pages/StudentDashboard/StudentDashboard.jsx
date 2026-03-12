import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import './StudentDashboard.css';

const PERIOD_TIMES = [
  { start: '07:00', end: '07:45' },
  { start: '08:00', end: '08:45' },
  { start: '08:50', end: '09:35' },
  { start: '09:50', end: '10:35' },
  { start: '10:40', end: '11:25' },
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
        api.get(`/exam-scores?studentId=${studentId}`),
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
                        <td>{s.subject?.name ?? '-'}</td>
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
