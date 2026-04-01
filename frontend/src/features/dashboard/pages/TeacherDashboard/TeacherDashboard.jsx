import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/lib/api';
import { formatTeacherManagementSummaryForDisplay } from '../../../../shared/lib/formatTeacherManagementSummaryForDisplay';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
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
  const [classSections, setClassSections] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiRetryInSec, setAiRetryInSec] = useState(0);

  const [infoQuestion, setInfoQuestion] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoAnswer, setInfoAnswer] = useState('');
  const [infoData, setInfoData] = useState(null);
  const [infoError, setInfoError] = useState('');

  const teacherId = user?.id;

  useEffect(() => {
    if (user && teacherId) fetchData();
  }, [user, teacherId]);

  useEffect(() => {
    if (aiRetryInSec <= 0) return undefined;
    const timer = setInterval(() => {
      setAiRetryInSec((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [aiRetryInSec]);

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
      try {
        const classSectionsRes = await api.get(`/class-sections/teacher/${teacherId}`);
        setClassSections(classSectionsRes.data?.classSections || []);
      } catch (e) {
        setClassSections([]);
      }

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

  // "Danh sách lớp phụ trách" nên hiển thị cả:
  // - lớp GVCN (teacherClasses)
  // - và các lớp giáo viên đang dạy theo TKB (allSchedules)
  // Nếu chỉ dựa vào GVCN mà giáo viên không làm GVCN thì sẽ hiện "Chưa có lớp phụ trách".
  const classesForResponsibilityList = React.useMemo(() => {
    const map = new Map();
    (teacherClasses || []).forEach((c) => {
      const id = c?.id;
      if (id != null && !map.has(id)) map.set(id, c);
    });

    (allSchedules || []).forEach((s) => {
      const c = s?.classEntity;
      const id = c?.id;
      if (id != null && !map.has(id)) map.set(id, c);
    });

    (classSections || []).forEach((cs) => {
      const c = cs?.classRoom || cs?.class_room;
      const id = c?.id;
      if (id != null && !map.has(id)) map.set(id, c);
    });

    return Array.from(map.values()).sort((a, b) => {
      const na = a?.name ?? '';
      const nb = b?.name ?? '';
      return na.localeCompare(nb, 'vi');
    });
  }, [teacherClasses, allSchedules, classSections]);

  const homeroomClassesList = React.useMemo(() => {
    return (teacherClasses || []).slice();
  }, [teacherClasses]);

  const otherResponsibilityClassesList = React.useMemo(() => {
    const homeroomIds = new Set((teacherClasses || []).map((c) => c?.id).filter(Boolean));
    return (classesForResponsibilityList || []).filter((c) => !homeroomIds.has(c?.id));
  }, [teacherClasses, classesForResponsibilityList]);
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

  const analyzeWithAi = async () => {
    try {
      setAiError('');
      setAiAnalysis(null);
      if (aiRetryInSec > 0) {
        setAiError(`Gemini đang giới hạn tần suất. Vui lòng thử lại sau ${aiRetryInSec} giây.`);
        return;
      }
      setAiLoading(true);

      const res = await api.post('/ai/teacher-management-summary', {});
      setAiRetryInSec(0);
      setAiAnalysis(formatTeacherManagementSummaryForDisplay(res.data) || '');
    } catch (e) {
      const status = Number(e?.response?.status);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Phân tích AI thất bại';
      if (status === 429) {
        const m = String(msg);
        // Chỉ countdown khi message có dạng "thử lại sau khoảng X giây" — tránh nhầm số từ "20 lần/ngày".
        const retryMatch =
          m.match(/thử lại sau khoảng\s+(\d+)\s*giây/i) || m.match(/sau khoảng\s+(\d+)\s*giây/i);
        if (retryMatch) {
          const retrySec = Number(retryMatch[1]);
          setAiRetryInSec(Number.isFinite(retrySec) && retrySec > 0 ? retrySec : 0);
        } else {
          setAiRetryInSec(0);
        }
      }
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const aiDisabled = aiLoading || aiRetryInSec > 0;
  const aiButtonText = aiLoading
    ? 'Đang tạo tổng quan...'
    : aiRetryInSec > 0
      ? `Thử lại sau ${aiRetryInSec}s`
      : 'AI tổng quan quản lý';

  const queryInformation = async () => {
    try {
      const q = String(infoQuestion || '').trim();
      setInfoError('');
      setInfoAnswer('');
      setInfoData(null);
      if (!q) {
        setInfoError('Vui lòng nhập câu hỏi.');
        return;
      }
      setInfoLoading(true);
      const res = await api.post('/ai/information-query', { question: q });
      const r = res?.data || {};
      if (r?.success === false) {
        setInfoError(r?.answer || r?.message || 'Tra cứu thất bại');
        return;
      }
      setInfoAnswer(String(r?.answer || '').trim());
      setInfoData(r?.data ?? null);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Tra cứu thất bại';
      setInfoError(String(msg));
    } finally {
      setInfoLoading(false);
    }
  };

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

      {/* AI tra cứu thông tin (đặt dưới 4 card) */}
      <div className="td-card td-aiq-card">
        <div className="td-card-head">
          <h3 className="td-card-title">AI Tra cứu thông tin</h3>
        </div>
        <div className="td-aiq-row">
          <input
            className="td-aiq-input"
            value={infoQuestion}
            onChange={(e) => setInfoQuestion(e.target.value)}
            placeholder="Ví dụ: 10A1 có mấy bạn yếu Toán? · Tôi đang dạy những lớp nào? · GVCN lớp 10A1 là ai?"
            disabled={infoLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                queryInformation();
              }
            }}
          />
          <button
            type="button"
            className="td-aiq-btn"
            onClick={queryInformation}
            disabled={infoLoading}
          >
            {infoLoading ? 'Đang tra cứu...' : 'Tra cứu'}
          </button>
        </div>

        {infoError && (
          <div className="td-aiq-error">
            {infoError}
          </div>
        )}

        {infoAnswer && (
          <div className="td-aiq-answer">
            {infoAnswer}
          </div>
        )}

        {infoData && (
          <details className="td-aiq-details">
            <summary className="td-aiq-summary">Xem dữ liệu trả về</summary>
            <pre className="td-aiq-pre">{JSON.stringify(infoData, null, 2)}</pre>
          </details>
        )}
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
                        <td>{scheduleSubjectDisplayName(s, '-')}</td>
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
            <h3 className="td-card-title">Bài tập đã giao</h3>
            <ul className="td-assign-list td-assign-list--recent">
              {assignments.length === 0 ? (
                <li className="td-empty">Chưa có bài tập.</li>
              ) : (
                [...assignments]
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .slice(0, 8)
                  .map((a) => (
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

          <div className="td-card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h3 className="td-card-title" style={{ margin: 0 }}>AI tổng quan quản lý lớp</h3>
              <button
                type="button"
                className="td-view-all"
                onClick={analyzeWithAi}
                disabled={aiDisabled}
                style={{ cursor: aiDisabled ? 'not-allowed' : 'pointer' }}
              >
                {aiButtonText}
              </button>
            </div>

            {aiError && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.9rem',
                }}
              >
                {aiError}
              </div>
            )}

            {aiAnalysis && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '10px',
                  whiteSpace: 'pre-line',
                  maxHeight: '260px',
                  overflow: 'auto',
                  color: '#312e81',
                  fontSize: '0.9rem',
                }}
              >
                {aiAnalysis}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải */}
        <div className="td-right-col">
          <div className="td-card">
            <h3 className="td-card-title">Lớp chủ nhệm</h3>
            <ul className="td-class-list">
              {homeroomClassesList.length === 0 ? (
                <li className="td-empty">Chưa có lớp chủ nhiệm.</li>
              ) : (
                homeroomClassesList.map((c) => {
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

          <div className="td-card">
            <h3 className="td-card-title">Lớp phụ trách</h3>
            <ul className="td-class-list">
              {otherResponsibilityClassesList.length === 0 ? (
                <li className="td-empty">Chưa có lớp phụ trách.</li>
              ) : (
                otherResponsibilityClassesList.map((c) => {
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
