import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Bell, Book, BookOpen, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, ClipboardList, Clock, PencilLine, User
} from 'lucide-react';
import api from '../../../../shared/lib/api';
import { formatGradeAnalysisForDisplay } from '../../../../shared/lib/formatGradeAnalysisForDisplay';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import { useAuth } from '../../../auth/context/AuthContext';
import '../StudentDashboard/StudentDashboard.css';
import './ParentDashboard.css';

// --- HÀM HELPER HỖ TRỢ (Từ Student Dashboard) ---
const PERIOD_TIMES = [
  { start: '07:00', end: '07:45' }, { start: '07:50', end: '08:35' },
  { start: '08:40', end: '09:25' }, { start: '09:30', end: '10:15' },
  { start: '10:20', end: '11:05' }, { start: '13:00', end: '13:45' },
  { start: '13:50', end: '14:35' }, { start: '14:40', end: '15:25' },
  { start: '15:30', end: '16:15' }, { start: '16:20', end: '17:05' },
];

function periodTimeRange(period) {
  const p = Number(period);
  if (!p || p < 1 || p > PERIOD_TIMES.length) return '—';
  const { start, end } = PERIOD_TIMES[p - 1];
  return `${start} - ${end}`;
}

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
  let h = 0; const str = s || '';
  for (let i = 0; i < str.length; i += 1) h += str.charCodeAt(i);
  return hues[h % hues.length];
}

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

function daysUntilDue(due) {
  if (!due) return null;
  const end = new Date(due);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

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
  const data = last4.map((k) => {
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

function getAcademicYearLabelFromData(studentDetail, classInfo) {
  const fromDetail = studentDetail?.class?.schoolYear;
  if (typeof fromDetail === 'string' && fromDetail.trim()) return fromDetail;
  const fromClass = classInfo?.schoolYear;
  if (typeof fromClass === 'string' && fromClass.trim()) return fromClass;
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 7 ? y : y - 1;
  return `${startYear} - ${startYear + 1}`;
}

// --- MAIN COMPONENT ---
const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State chung
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State học sinh đang chọn
  const [selectedChildId, setSelectedChildId] = useState(localStorage.getItem('activeStudentId'));
  
  // State dữ liệu màn chi tiết
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [studentDetail, setStudentDetail] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [examScores, setExamScores] = useState([]);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState('');
  const [semesterUi, setSemesterUi] = useState('2');

  const schoolId = user?.school?.id;

  // Lấy danh sách con em + enrich class/school bằng cách gọi /users/{childId}/enrollment
  useEffect(() => {
    const fetchParentDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${user?.id}`);
        const rawChildren = response.data.children || [];

        // Gọi song song /users/{childId}/enrollment để lấy className
        // (API này trả về enrollment.className và enrollment.classId đúng)
        const enriched = await Promise.all(
          rawChildren.map(async (child) => {
            try {
              const enrRes = await api.get(`/users/${child.id}/enrollment`);
              const enr = enrRes.data?.enrollment;
              if (enr?.className) {
                return {
                  ...child,
                  class: { id: enr.classId, name: enr.className },
                };
              }
              return child; // Giữ nguyên dữ liệu cũ nếu không tìm thấy enrollment mới
            } catch (e) {
              return child; // fallback nếu lỗi
            }
          })
        );

        setChildren(enriched);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách con em:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchParentDetails();
  }, [user]);

  // Load chi tiết khi đã chọn một học sinh
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchChildData = async () => {
      // Reset states để tránh dữ liệu cũ (hoặc từ con trước) còn sót lại
      setTodaySchedules([]);
      setTodayAttendance([]);
      setLoadingDetails(true);

      try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        // 1. Lấy thông tin học sinh
        let detail = null;
        let cId = null;
        try {
          const detailRes = await api.get(`/users/${selectedChildId}`);
          detail = detailRes.data;
          // Cố gắng lấy classId từ nhiều nguồn trong object user
          cId = detail?.class?.id || 
                detail?.classId || 
                detail?.classEntity?.id || 
                detail?.enrollment?.classId;
        } catch (e) {
          console.error('Lỗi tải thông tin học sinh', e);
        }
        
        // Nếu API user entity không trả về class do serialization, gọi enrollment
        if (!cId) {
          try {
            const enrRes = await api.get(`/users/${selectedChildId}/enrollment`);
            if (enrRes.data?.enrollment?.classId) cId = enrRes.data.enrollment.classId;
          } catch (e) {}
        }
        setStudentDetail(detail);

        // 2. TKB & ExamScores
        const examUrl = schoolId 
          ? `/exam-scores?studentId=${selectedChildId}&schoolId=${schoolId}` 
          : `/exam-scores?studentId=${selectedChildId}`;

        const [scoresRes, studentSchRes] = await Promise.all([
          api.get(examUrl).catch(() => ({ data: { examScores: [] } })),
          api.get(`/schedules/student/${selectedChildId}`).catch(() => ({ data: { schedules: [] } })),
        ]);
        setExamScores(scoresRes.data?.examScores || []);

        let schedules = [];
        if (cId) {
          try {
            const classSchRes = await api.get(`/schedules/class/${cId}`);
            schedules = classSchRes.data?.schedules || [];
          } catch (e) {}
        }
        if (!schedules.length) schedules = studentSchRes.data?.schedules || [];

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

        // 1. Logic lọc TKB chuẩn hóa: Ưu tiên Date > DayOfWeek 
        // Tránh tình trạng môn định kỳ (như Âm nhạc/Mỹ thuật) hiện vào ngày nghỉ hoặc ngày trống
        let todayList = [];

        // Bước A: Tìm các môn được ấn định CHÍNH XÁC cho ngày hôm nay
        const todaySpecific = schedules.filter(s => getDateStr(s) === todayStr);

        if (todaySpecific.length > 0) {
          // Nếu ngày hôm nay đã có lịch ấn định cụ thể -> Chỉ lấy danh sách này
          todayList = todaySpecific;
        } else {
          // Bước B: Nếu không có lịch cụ thể, ta mới xét đến lịch định kỳ (Thứ trong tuần)
          // Quan trọng: Chỉ lấy những bản ghi định kỳ THỰC SỰ (trường date phải là null)
          todayList = schedules.filter(s => {
            const hasSpecificDate = getDateStr(s) !== null;
            if (hasSpecificDate) return false; // Nếu môn này có gán ngày khác thì bỏ qua
            return scheduleDayOfWeekFromRow(s) === todayDayOfWeek;
          });
        }

        todayList.sort((a, b) => (a.period || 0) - (b.period || 0));
        setTodaySchedules(todayList);

        // 3. Điểm danh
        try {
          const classSectionIds = [...new Set(todayList.map(s => s.classSection?.id || s.classSectionId).filter(Boolean))];
          
          if (classSectionIds.length === 0) {
            setTodayAttendance([]);
            return;
          }

          const attendancePromises = classSectionIds.map(async (classSectionId) => {
             try {
                 const res = await api.get(`/attendance`, { params: { classSectionId, date: todayStr } });
                 const items = res.data?.items || [];
                 // Tìm bản ghi điểm danh của đúng con mình trong lớp học phần này
                 const myChildRecord = items.find(it => String(it.studentId) === String(selectedChildId));
                 if (myChildRecord) {
                      return { ...myChildRecord, boundClassSectionId: classSectionId };
                 }
             } catch (e) {}
             return null;
          });
          
          // Chờ tất cả các request lấy điểm danh xong
          const attendanceResults = (await Promise.all(attendancePromises)).filter(item => item !== null);
          setTodayAttendance(attendanceResults);
        } catch (e) {}

        // 4. Assignments & Announcements (cần cId)
        if (cId) {
          const [assignmentsRes, mySubRes, annRes, classRes] = await Promise.all([
            api.get(`/assignments/class/${cId}`).catch(() => ({ data: { assignments: [] } })),
            api.get(`/assignments/student/${selectedChildId}/submissions`).catch(() => ({ data: { submissions: [] } })),
            schoolId ? api.get(`/announcements?schoolId=${schoolId}`).catch(() => ({ data: { announcements: [] } })) : Promise.resolve({ data: { announcements: [] } }),
            api.get(`/classes/${cId}`).catch(() => ({ data: { class: null } })),
          ]);
          
          const allAssignments = assignmentsRes.data?.assignments || [];
          const mySubs = mySubRes.data?.submissions || [];
          const submittedAssignmentIds = new Set(mySubs.map((s) => s.assignment?.id ?? s.assignment_id).filter(Boolean));
          setAssignments(allAssignments.filter((a) => !submittedAssignmentIds.has(a.id)));
          
          const allAnn = annRes.data?.announcements || [];
          setAnnouncements(allAnn.filter((a) => {
            const ac = a.classEntity?.id ?? a.class_id;
            return ac === cId || ac == null;
          }));

          const rawClass = classRes.data?.class ?? classRes.data;
          setClassInfo(rawClass);
        }

      } catch (error) {
        console.error('Lỗi tổng hợp khi fetch dữ liệu con:', error);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchChildData();
  }, [selectedChildId, schoolId]);

  const handleSelectChild = (child) => {
    localStorage.setItem('activeStudentId', child.id);
    localStorage.setItem('activeStudentName', child.fullName);
    setSelectedChildId(child.id.toString());
    window.location.href = '/dashboard';
  };

  const handleUnselect = () => {
    localStorage.removeItem('activeStudentId');
    localStorage.removeItem('activeStudentName');
    setSelectedChildId(null);
    window.location.reload();
  };

  const analyzeWithAi = async () => {
    try {
      setAiError('');
      setAiAnalysis(null);
      if (!examScores || examScores.length === 0) {
        setAiError('Con chưa có điểm để phân tích.');
        return;
      }
      setAiLoading(true);

      const recentMinScores = [];
      const bySubject = {};
      examScores.forEach((e) => {
        const subjectName = e.subject?.name || 'Môn';
        const score = Number(e.score);
        if (Number.isNaN(score)) return;
        if (!bySubject[subjectName]) bySubject[subjectName] = { min: score };
        else bySubject[subjectName].min = Math.min(bySubject[subjectName].min, score);
      });
      Object.entries(bySubject).forEach(([subject, v]) => recentMinScores.push({ subject, score: v.min }));

      const payload = {
        target: `Học sinh: ${studentDetail?.fullName || 'con bạn'}`,
        subjects: recentMinScores.map((r) => ({
          name: r.subject,
          score: Number(r.score),
          previousScore: null,
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


  // --- Chuẩn bị số liệu hiển thị ---
  const headerDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isSunday = new Date().getDay() === 0;

  const displayUser = studentDetail || { fullName: localStorage.getItem('activeStudentName') };
  const fullName = displayUser?.fullName || displayUser?.full_name || 'Học sinh';
  const className = displayUser?.class?.name || classInfo?.name || '—';
  const schoolName = displayUser?.school?.name || user?.school?.name || 'Trường';
  const studentCode = displayUser?.studentCode || displayUser?.student_code || displayUser?.code || `HS${String(selectedChildId).padStart(5, '0')}`;
  const academicYearLabel = getAcademicYearLabelFromData(studentDetail, classInfo);

  const scheduleRowsWithAttendance = useMemo(() => {
    return todaySchedules.map((schedule) => {
      const sSectionId = String(schedule.classSectionId || schedule.classSection?.id);
      const attRecord = todayAttendance.find(a => String(a.boundClassSectionId) === sSectionId);
      
      let status = 'pending'; let statusText = 'Chưa điểm danh';
      if (attRecord && attRecord.status) {
         const uppercaseStatus = String(attRecord.status).toUpperCase();
         if (uppercaseStatus === 'PRESENT') { status = 'present'; statusText = 'Đã điểm danh'; }
         if (uppercaseStatus === 'ABSENT') { status = 'absent'; statusText = 'Vắng mặt'; }
         if (uppercaseStatus === 'LATE') { status = 'late'; statusText = 'Đi trễ'; }
      }
      return { schedule, status, statusText };
    });
  }, [todaySchedules, todayAttendance]);

  const lessonsToday = todaySchedules.length;
  const attendedCount = scheduleRowsWithAttendance.filter(r => r.status !== 'pending').length;
  const attendancePct = lessonsToday > 0 ? Math.round((attendedCount / lessonsToday) * 100) : 0;

  // Tính điểm trung bình và xếp loại
  const avgScoreNum = examScores.length > 0 ? (examScores.reduce((sum, e) => sum + Number(e.score), 0) / examScores.length) : 0;
  const avgScoreDisplay = examScores.length > 0 ? avgScoreNum.toFixed(1) : '—';
  
  let classification = 'Chưa xếp loại';
  let classColor = '#64748b'; 
  let classBg = '#f1f5f9';
  if (avgScoreNum >= 8.0) { classification = 'Giỏi'; classColor = '#16a34a'; classBg = '#dcfce3'; }
  else if (avgScoreNum >= 6.5) { classification = 'Khá'; classColor = '#0284c7'; classBg = '#e0f2fe'; }
  else if (avgScoreNum >= 5.0) { classification = 'Trung bình'; classColor = '#ea580c'; classBg = '#ffedd5'; }
  else if (avgScoreNum > 0) { classification = 'Yếu'; classColor = '#dc2626'; classBg = '#fee2e2'; }

  if (loading) {
    return <div className="parent-dashboard-container">Đang tải danh sách con em...</div>;
  }

  // === RENDERING DETAIL VIEW (Khi Đã Chọn Con) ===
  if (selectedChildId) {
    return (
      <div className="pd-detail-container">
        {/* Khối Banner */}
        <section className="sd2-hero" aria-label="Hồ sơ học sinh">
          <div className="sd2-hero-inner" style={{ position: 'relative' }}>
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
              Lớp {className}
                <span className="sd2-dot">•</span>
                Học kỳ {semesterUi}
                <span className="sd2-dot">•</span>
                Năm học {academicYearLabel}
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
            
            {/* Nút Hủy Chọn Con ở góc phải banner */}
            <div style={{ position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)' }}>
              <button className="pd-btn-sm" onClick={handleUnselect}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M16 11h6"></path><path d="M19 8l3 3-3 3"></path></svg>
                Đổi con khác
              </button>
            </div>
          </div>
        </section>

        {/* Thống kê (3 khối cân bằng) */}
        <div className="pd-stats-row">
          <div className="pd-stat-card">
            <div className="pd-stat-icon-wrap purple">
              <Book size={24} strokeWidth={2} aria-hidden />
            </div>
            <div className="pd-stat-info">
              <p className="pd-stat-label">Tiết học hôm nay</p>
              <p className="pd-stat-value">{lessonsToday}</p>
              <p className="pd-stat-hint">{lessonsToday > 0 ? `${attendedCount} tiết đã qua` : 'Không có tiết'}</p>
            </div>
          </div>
          <div className="pd-stat-card">
            <div className="pd-stat-icon-wrap green">
              <CheckCircle2 size={24} strokeWidth={2} aria-hidden />
            </div>
            <div className="pd-stat-info">
              <p className="pd-stat-label">Đã điểm danh</p>
              <p className="pd-stat-value">{lessonsToday > 0 ? `${attendedCount}/${lessonsToday}` : '—'}</p>
              <p className="pd-stat-hint">
              </p>
            </div>
          </div>
          <div className="pd-stat-card">
            <div className="pd-stat-info" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="pd-stat-label">Điểm trung bình học kỳ</span>
                <span style={{ backgroundColor: classBg, color: classColor, padding: '4px 12px', borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem' }}>
                  {classification}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p className="pd-stat-value" style={{ color: classColor }}>{avgScoreDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Chính Lưới 2 cột (sử dụng class CSS mới pd-grid-2col) */}
        <div className="pd-grid-2col">
          
          {/* == Cột Trái == */}
          <div className="sd2-col">
            
            {/* Thời khóa biểu hôm nay */}
            <section className="sd2-card">
              <div className="sd2-card-head">
                <div className="pd-title-action">
                  <h2 className="sd2-card-title">Thời khóa biểu hôm nay</h2>
                  <button type="button" className="sd2-link-btn" onClick={() => navigate('/schedules')}>
                    Xem tuần
                  </button>
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
                    {loadingDetails ? (
                      <tr><td colSpan={5} className="sd2-empty">Đang tải...</td></tr>
                    ) : scheduleRowsWithAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="sd2-empty">
                          {isSunday ? 'Chủ nhật — không có tiết học.' : 'Không có tiết nào hôm nay.'}
                        </td>
                      </tr>
                    ) : (
                      scheduleRowsWithAttendance.map(({ schedule: s, status, statusText }) => {
                        const subj = scheduleSubjectDisplayName(s, '—');
                        const hue = hueFromString(subj);
                        return (
                          <tr key={s.id} className={status === 'pending' ? 'sd2-row-pending' : ''}>
                            <td>{s.period ?? '—'}</td>
                            <td className="sd2-nowrap">{periodTimeRange(s.period)}</td>
                            <td>
                              <span className="sd2-subj-cell">
                                <span className="sd2-subj-dot" style={{ background: `hsl(${hue} 70% 52%)` }} aria-hidden />
                                {subj}
                              </span>
                            </td>
                            <td>{s.teacher?.fullName ?? s.teacher?.full_name ?? '—'}</td>
                            <td>
                              {status === 'pending' ? (
                                <span className="sd2-pill sd2-pill--wait">{statusText}</span>
                              ) : status === 'absent' ? (
                                <span className="sd2-pill sd2-pill--danger">{statusText}</span>
                              ) : status === 'late' ? (
                                <span style={{backgroundColor: '#ffedd5', color: '#ea580c', padding: '4px 10px', borderRadius:'14px', fontSize:'0.75rem', fontWeight:'600'}}>{statusText}</span>
                              ) : (
                                <span className="sd2-pill sd2-pill--ok">{statusText}</span>
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

            {/* Phân tích AI */}
            <section className="sd2-card" style={{ marginTop: '24px' }}>
              <div className="sd2-card-head">
                <h2 className="sd2-card-title">Phân tích & gợi ý từ AI</h2>
              </div>
              <div className="sd2-ai-block">
                <button
                  type="button"
                  className="sd2-outline-btn"
                  onClick={analyzeWithAi}
                  disabled={aiLoading}
                >
                  {aiLoading ? 'Đang phân tích...' : 'Bắt đầu phân tích'}
                </button>
                {aiError ? <p className="sd2-ai-err">{aiError}</p> : null}
                {aiAnalysis ? <pre className="sd2-ai-out">{aiAnalysis}</pre> : null}
                {!aiAnalysis && !aiError && !aiLoading && (
                  <p className="sd2-chart-note" style={{marginTop:'10px'}}>Nhấn nút để AI phân tích toàn bộ điểm số của con bạn và đưa ra lời khuyên học tập phù hợp!</p>
                )}
              </div>
            </section>

          </div>

          {/* == Cột Phải == */}
          <div className="sd2-col">
            
            {/* Bài tập cần nộp */}
            <section className="sd2-card">
              <div className="sd2-card-head">
                <div className="pd-title-action">
                  <h2 className="sd2-card-title">Bài tập cần nộp</h2>
                  <button type="button" className="sd2-link-btn" onClick={() => navigate('/assignments')}>Xem tất cả</button>
                </div>
              </div>
              <ul className="sd2-list">
                {assignments.length === 0 ? (
                  <li className="sd2-empty sd2-empty--block" style={{ backgroundColor: '#f0fdf4', border: '1px dashed #bbf7d0', color: '#166534', padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                      <ClipboardList size={24} style={{ color: '#10b981' }} />
                      <span style={{ fontWeight: '600' }}>Không có bài tập cần nộp</span>
                      <span style={{ fontSize: '0.85rem' }}>Con bạn đã hoàn thành đầy đủ bài tập.</span>
                    </div>
                  </li>
                ) : (
                  assignments.slice(0, 3).map((a, i) => {
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
                          {overdue ? <span className="sd2-pill sd2-pill--danger">Quá hạn</span>
                            : soon && dLeft != null ? <span className="sd2-pill sd2-pill--info">Còn {dLeft} ngày</span>
                            : dLeft != null ? <span className="sd2-pill sd2-pill--muted">Còn {dLeft} ngày</span>
                            : <span className="sd2-pill sd2-pill--muted">Chưa có hạn</span>}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            {/* Thông báo từ giáo viên */}
            <section className="sd2-card" style={{ marginTop: '24px' }}>
              <div className="sd2-card-head">
                <div className="pd-title-action">
                  <h2 className="sd2-card-title">Thông báo từ giáo viên</h2>
                  <button type="button" className="sd2-link-btn" onClick={() => navigate('/announcements')}>Xem tất cả</button>
                </div>
              </div>
              {announcements.length === 0 ? (
                <p className="sd2-empty sd2-empty--block">Không có thông báo mới.</p>
              ) : (
                <ul className="sd2-list">
                  {announcements.slice(0, 4).map((a) => {
                    const hue = hueFromString(a.author?.fullName || '');
                    return (
                      <li key={a.id} className="sd2-msg-item">
                        <div className="sd2-msg-avatar" style={{ backgroundColor: `hsl(${hue} 80% 88%)`, color: `hsl(${hue} 70% 30%)` }}>
                          {initials(a.author?.fullName)}
                        </div>
                        <div className="sd2-msg-body">
                          <div className="sd2-msg-line">
                            <span className="sd2-msg-title">{a.author?.fullName || 'Hệ thống'}</span>
                            <span className="sd2-msg-time">{formatRelativeVi(a.createdAt || a.created_at)}</span>
                          </div>
                          <p className="sd2-msg-desc">{a.title} • {a.content}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // === RENDERING SELECTION VIEW (Khi chưa chọn con) ===
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f0fe 0%, #dbeafe 40%, #ede9fe 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 32px',
    }}>

      {/* Badge tên trường */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '48px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: '999px', padding: '6px 18px 6px 10px',
          boxShadow: '0 2px 12px rgba(99,102,241,0.10)',
        }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#3730a3' }}>
            {user?.school?.name || 'Trường'}
          </span>
        </div>
      </div>

      {/* Hero Title */}
      <div style={{ maxWidth: '780px', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #3730a3 0%, #2563eb 60%, #6366f1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: '1.2',
          margin: '0 0 12px',
        }}>
          Hệ thống Quản lý<br />thông tin học tập
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400', margin: 0 }}>
          Theo dõi tiến độ học tập của học sinh một cách dễ dàng
        </p>
      </div>

      {/* Danh sách con em */}
      {children.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.9)', borderRadius: '20px',
          padding: '40px', border: '1px solid rgba(226,232,240,0.8)',
          maxWidth: '480px', textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Xin chào, {user?.fullName}!
          </h2>
          <p style={{ color: '#64748b', marginBottom: '6px' }}>
            Hiện tại chưa có học sinh nào được liên kết với tài khoản của bạn.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Vui lòng liên hệ với văn phòng nhà trường để được hỗ trợ.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '20px',
          maxWidth: '960px',
        }}>
          {children.map((child) => (
            <div
              key={child.id}
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '28px 22px 22px',
                border: '1px solid rgba(226,232,240,0.7)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onClick={() => handleSelectChild(child)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.14)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.06)';
              }}
            >
              {/* Icon graduation cap */}
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px',
                border: '2px solid rgba(99,102,241,0.15)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Tên học sinh */}
              <h3 style={{
                fontSize: '1rem', fontWeight: '700', color: '#1e293b',
                margin: '0 0 12px', lineHeight: '1.3',
              }}>{child.fullName}</h3>

              {/* Email */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.8rem', color: '#64748b', marginBottom: '6px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="#94a3b8" strokeWidth="1.8"/>
                  <path d="M2 7l10 7 10-7" stroke="#94a3b8" strokeWidth="1.8"/>
                </svg>
                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {child.email || '—'}
                </span>
              </div>

              {/* Lớp */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.8rem', color: '#64748b', marginBottom: '6px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 21V9l9-6 9 6v12" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 21V15h6v6" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>
                  {(() => {
                    // Ưu tiên lấy tên lớp từ object class được enrich hoặc các trường fallback
                    const clsName = 
                      (child.class && typeof child.class === 'object' ? child.class.name : null) || 
                      child.className || 
                      child.classEntity?.name || 
                      child.class_name || 
                      (typeof child.class === 'string' ? child.class : null);
                    
                    return clsName ? `Lớp: ${clsName}` : 'Lớp: Chưa xếp lớp';
                  })()}
                </span>
              </div>

             
              {/* Button */}
              <button
                style={{
                  width: '100%', padding: '10px',
                  background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontWeight: '600', fontSize: '0.88rem',
                  cursor: 'pointer', transition: 'opacity 0.2s',
                  boxShadow: '0 2px 10px rgba(79,70,229,0.25)',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Xem thông tin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;