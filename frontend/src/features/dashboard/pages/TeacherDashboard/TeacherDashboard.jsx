import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/lib/api';
import './TeacherDashboard.css';
import { useAuth } from '../../../auth/context/AuthContext';

/** Tiết 1–10 — khớp TKB (period 1–5 sáng, 6–10 chiều) */
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

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentCountByClassId, setStudentCountByClassId] = useState({});
  const [scoreStats, setScoreStats] = useState({ gioi: 0, kha: 0, trungBinh: 0, yeu: 0 });

  const teacherId = user?.id;

  useEffect(() => {
    if (user && teacherId) fetchData();
  }, [user, teacherId]);

  // Chuẩn hóa ngày từ API (string "yyyy-mm-dd" hoặc object Java LocalDate) để so sánh với ngày local
  const getScheduleDateStr = (s) => {
    if (s.date == null) return null;
    if (typeof s.date === 'string') return s.date.slice(0, 10);
    if (Array.isArray(s.date)) {
      const [y, m, d] = s.date;
      if (y != null && m != null && d != null) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (typeof s.date === 'object' && s.date.year != null) {
      const m = (s.date.monthValue ?? s.date.month ?? 1);
      const d = (s.date.dayOfMonth ?? s.date.day ?? 1);
      return `${s.date.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  };

  const fetchData = async () => {
    try {
      const now = new Date();
      // Dùng ngày LOCAL để khớp với thời khóa biểu (backend lưu LocalDate, không timezone)
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      // Backend: dayOfWeek 1=Thứ 2, 2=Thứ 3, ..., 6=Thứ 7 (theo Schedule entity)
      const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // JS: 0=CN, 1=T2,...,6=T7

      const [classesRes, schedulesRes, assignmentsRes, countsRes] = await Promise.all([
        api.get(`/classes/teacher/${teacherId}`),
        api.get(`/schedules/teacher/${teacherId}`),
        api.get(`/assignments/teacher/${teacherId}`),
        api.get('/classes/counts/students'),
      ]);
      const classes = classesRes.data?.classes || [];
      setTeacherClasses(classes);
      const schedules = schedulesRes.data?.schedules || [];
      setAllSchedules(schedules);

      const isToday = (s) => {
        const dateStr = getScheduleDateStr(s);
        if (dateStr) return dateStr === todayStr;
        if (s.dayOfWeek != null && s.dayOfWeek !== undefined) return Number(s.dayOfWeek) === todayDayOfWeek;
        return false;
      };
      const todayList = schedules.filter(isToday).sort((a, b) => (a.period || 0) - (b.period || 0));
      setTodaySchedules(todayList);
      setAssignments(assignmentsRes.data?.assignments || []);
      const counts = countsRes.data || {};
      setStudentCountByClassId(counts);

      // Lớp đang dạy = các lớp xuất hiện trong TKB của GV (distinct từ schedules)
      const classIdsFromSchedules = new Set(
        schedules.map((s) => s.classEntity?.id ?? s.class_id).filter(Boolean)
      );
      // Thống kê điểm: dùng cả lớp chủ nhiệm và lớp dạy
      const classIds = new Set([...classes.map((c) => c.id), ...classIdsFromSchedules]);
      if (classIds.size > 0 && user?.school?.id) {
        const scoresRes = await api.get(`/exam-scores?schoolId=${user.school.id}`);
        const allScores = scoresRes.data?.examScores || [];
        const teacherClassScores = allScores.filter((s) => s.classEntity?.id && classIds.has(s.classEntity.id));
        let gioi = 0, kha = 0, trungBinh = 0, yeu = 0;
        teacherClassScores.forEach((s) => {
          const sc = Number(s.score);
          if (sc >= 8) gioi++;
          else if (sc >= 6.5) kha++;
          else if (sc >= 5) trungBinh++;
          else yeu++;
        });
        setScoreStats({ gioi, kha, trungBinh, yeu });
      }
    } catch (e) {
      console.error('Error fetching teacher dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  // Lớp đang dạy: số lớp distinct từ toàn bộ TKB của GV; nếu không có TKB thì dùng lớp chủ nhiệm
  const classIdsTeaching = React.useMemo(() => {
    const ids = new Set();
    allSchedules.forEach((s) => {
      const id = s.classEntity?.id ?? s.class_id;
      if (id) ids.add(id);
    });
    if (ids.size === 0) teacherClasses.forEach((c) => ids.add(c.id));
    return ids;
  }, [allSchedules, teacherClasses]);
  const classesTeachingCount = classIdsTeaching.size;
  const totalStudents = Array.from(classIdsTeaching).reduce(
    (sum, id) => sum + (studentCountByClassId[id] ?? 0),
    0
  );
  const assignmentsCount = assignments.length;
  const lessonsTodayCount = todaySchedules.length;

  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    const d = new Date(dueDate);
    return `Hạn nộp: ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getPeriodTime = (period) => {
    const p = (period != null ? Number(period) : 1) - 1;
    const t = PERIOD_TIMES[p] || PERIOD_TIMES[0];
    return `${t.start}-${t.end}`;
  };

  if (loading) {
    return (
      <div className="td-wrap">
        <div className="td-loading">
          <div className="td-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="td-wrap">
      {/* 4 thẻ thống kê */}
      <div className="td-stats-row">
        <div className="td-stat-card">
          <div className="td-stat-icon td-stat-icon--class" />
          <div className="td-stat-body">
            <span className="td-stat-label">Lớp đang dạy</span>
            <span className="td-stat-value">{classesTeachingCount} lớp</span>
          </div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-icon td-stat-icon--students" />
          <div className="td-stat-body">
            <span className="td-stat-label">Học sinh phụ trách</span>
            <span className="td-stat-value">{totalStudents} học sinh</span>
          </div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-icon td-stat-icon--assign" />
          <div className="td-stat-body">
            <span className="td-stat-label">Bài tập đã tạo</span>
            <span className="td-stat-value">{assignmentsCount} bài tập</span>
          </div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-icon td-stat-icon--lesson" />
          <div className="td-stat-body">
            <span className="td-stat-label">Tiết dạy hôm nay</span>
            <span className="td-stat-value">{lessonsTodayCount} tiết</span>
          </div>
        </div>
      </div>

      {/* 2 cột nội dung */}
      <div className="td-main-row">
        {/* Cột trái */}
        <div className="td-left-col">
          <div className="td-card">
            <h3 className="td-card-title">Thời khóa biểu hôm nay</h3>
            <div className="td-table-wrap">
              <table className="td-table">
                <thead>
                  <tr>
                    <th>Tiết</th>
                    <th>Lớp</th>
                    <th>Môn học</th>
                    <th>Phòng</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td-empty">Không có tiết nào hôm nay.</td>
                    </tr>
                  ) : (
                    todaySchedules.map((s) => (
                      <tr key={s.id}>
                        <td>{s.period ?? '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="td-link"
                            onClick={() => navigate(`/classes/${s.classEntity?.id}`)}
                          >
                            {s.classEntity?.name ?? '-'}
                          </button>
                        </td>
                        <td>{s.subject?.name ?? '-'}</td>
                        <td>{s.room ?? '-'}</td>
                        <td>{getPeriodTime(s.period)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="td-card">
            <h3 className="td-card-title">Danh sách lớp phụ trách</h3>
            <ul className="td-class-list">
              {teacherClasses.length === 0 ? (
                <li className="td-empty">Chưa có lớp phụ trách.</li>
              ) : (
                teacherClasses.map((c) => {
                  const count = studentCountByClassId[c.id] ?? c.studentCount ?? 0;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="td-class-item"
                        onClick={() => navigate(`/classes/${c.id}`)}
                      >
                        <span>{c.name}</span>
                        <span className="td-class-meta">({count} học sinh)</span>
                        <span className="td-class-arrow">›</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* Cột phải */}
        <div className="td-right-col">
          <div className="td-card">
            <div className="td-card-head">
              <h3 className="td-card-title">Bài tập cho lớp phụ trách</h3>
              <button type="button" className="td-view-all" onClick={() => navigate('/assignments')}>
                Xem tất cả
              </button>
            </div>
            <ul className="td-assign-list">
              {assignments.length === 0 ? (
                <li className="td-empty">Chưa có bài tập.</li>
              ) : (
                assignments.slice(0, 5).map((a) => (
                  <li key={a.id} className="td-assign-item">
                    <span className="td-assign-icon" />
                    <div className="td-assign-body">
                      <span className="td-assign-title">{a.title}</span>
                      <span className="td-assign-class">Lớp {a.classEntity?.name ?? '-'}</span>
                      {a.dueDate && (
                        <span className="td-assign-due">{formatDueDate(a.dueDate)}</span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="td-card">
            <h3 className="td-card-title">Bài tập gần đây</h3>
            <ul className="td-assign-list td-assign-list--recent">
              {assignments.length === 0 ? (
                <li className="td-empty">Chưa có bài tập.</li>
              ) : (
                [...assignments]
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .slice(0, 4)
                  .map((a) => (
                    <li key={a.id} className="td-assign-item">
                      <span className="td-assign-icon" />
                      <div className="td-assign-body">
                        <span className="td-assign-title">{a.title}</span>
                        <span className="td-assign-class">Lớp {a.classEntity?.name ?? '-'}</span>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          </div>

          <div className="td-card">
            <h3 className="td-card-title">Thống kê điểm lớp</h3>
            <div className="td-chart-wrap">
              <div className="td-chart-bars">
                {[
                  { key: 'gioi', label: 'Giỏi', value: scoreStats.gioi, color: '#22c55e' },
                  { key: 'kha', label: 'Khá', value: scoreStats.kha, color: '#3b82f6' },
                  { key: 'trungBinh', label: 'Trung bình', value: scoreStats.trungBinh, color: '#eab308' },
                  { key: 'yeu', label: 'Yếu', value: scoreStats.yeu, color: '#ef4444' },
                ].map(({ key, label, value, color }) => {
                  const max = Math.max(scoreStats.gioi, scoreStats.kha, scoreStats.trungBinh, scoreStats.yeu, 1);
                  const h = (value / max) * 120;
                  return (
                    <div key={key} className="td-chart-bar-item">
                      <div
                        className="td-chart-bar"
                        style={{ height: `${h}px`, backgroundColor: color }}
                      />
                      <span className="td-chart-label">{label}</span>
                      <span className="td-chart-value">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
