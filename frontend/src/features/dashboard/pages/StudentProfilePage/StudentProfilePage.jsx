import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  CheckSquare,
  GraduationCap,
  Hexagon,
  IdCard,
  Medal,
  Phone,
  School,
  Star,
  User,
  Users,
} from 'lucide-react';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import { BE_DATA_GAP_ITEMS, MOCK_CONDUCT_LABEL } from '../StudentDashboard/mockData';
import './studentProfileDashboard.css';

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

function formatDateViShort(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('vi-VN');
}

function displayOrChuaCapNhat(val) {
  if (val == null || String(val).trim() === '') return 'Chưa cập nhật';
  return String(val);
}

function xepLoaiFromGpa(avg) {
  const n = Number(avg);
  if (Number.isNaN(n)) return '—';
  if (n >= 8) return 'Học sinh Giỏi';
  if (n >= 6.5) return 'Học sinh Khá';
  if (n >= 5) return 'Học sinh Trung bình';
  return 'Học sinh Yếu';
}

function monGioiYeuFromRecent(recentScores) {
  if (!recentScores.length) return { gioi: null, yeu: 'Không có' };
  const sorted = [...recentScores].sort((a, b) => Number(b.score) - Number(a.score));
  const gioi = sorted[0].subject;
  const min = sorted[sorted.length - 1];
  const yeu = Number(min.score) < 6.5 ? min.subject : 'Không có';
  return { gioi, yeu };
}

const StudentProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [examScores, setExamScores] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [semesterUi, setSemesterUi] = useState('2');
  const [showBeNotes, setShowBeNotes] = useState(false);

  const studentId = user?.id;
  const schoolId = user?.school?.id;

  useEffect(() => {
    if (!user || !studentId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setError(null);
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
            /* không có quyền xem danh sách */
          }
        }
        const baseFromList = detail || user;
        let profileFromApi = {};
        try {
          const pr = await api.get(`/users/${studentId}`);
          profileFromApi = pr.data || {};
        } catch {
          /* tùy quyền */
        }
        setStudentDetail({
          ...baseFromList,
          ...profileFromApi,
          class: baseFromList?.class,
          rollno: baseFromList?.rollno ?? profileFromApi.rollno,
        });

        let cId = detail?.class?.id ?? user?.class?.id;
        if (!cId && studentId) {
          try {
            const enrRes = await api.get(`/users/${studentId}/enrollment`);
            const enr = enrRes.data?.enrollment;
            if (enr?.classId) cId = enr.classId;
          } catch {
            /* */
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
        if (cId) {
          try {
            const classSchRes = await api.get(`/schedules/class/${cId}`);
            schedules = classSchRes.data?.schedules || [];
          } catch {
            /* */
          }
        }
        if (!schedules.length) {
          schedules = studentSchRes.data?.schedules || [];
        }

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
          try {
            const classRes = await api.get(`/classes/${cId}`);
            const raw = classRes.data?.class ?? classRes.data;
            const teacher = raw?.homeroomTeacher ?? raw?.homeroom_teacher;
            const cls = raw
              ? {
                  ...raw,
                  name: raw.name ?? raw.className,
                  homeroomTeacher: teacher
                    ? { fullName: teacher.fullName ?? teacher.full_name ?? '—' }
                    : null,
                }
              : null;
            setClassInfo(cls);
          } catch {
            setClassInfo(null);
          }
        } else {
          setClassInfo(null);
        }
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Không tải được dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, studentId, schoolId]);

  const displayUser = studentDetail || user;
  const fullName = displayUser?.fullName || displayUser?.full_name || 'Học sinh';
  const className = displayUser?.class?.name || classInfo?.name || '—';
  const schoolName = displayUser?.school?.name || user?.school?.name || 'Trường';

  const schoolYearFromBe = displayUser?.class?.schoolYear;
  const schoolYearLine = schoolYearFromBe || '2025';
  const schoolYearIsMock = !schoolYearFromBe;
  const homeroomTeacherName = classInfo?.homeroomTeacher?.fullName ?? null;
  const rollnoDisplay = displayUser?.rollno != null ? String(displayUser.rollno) : '—';
  const semesterLabel = semesterUi === '1' ? 'Học kỳ 1' : 'Học kỳ 2';
  const isStudyingActive =
    !displayUser?.status || String(displayUser.status).toUpperCase() === 'ACTIVE';

  const lessonsToday = todaySchedules.length;
  const scheduleRowsWithMockAttendance = useMemo(() => {
    return todaySchedules.map((s, idx, arr) => ({
      schedule: s,
      attendedMock: arr.length === 0 ? false : idx < arr.length - 1,
    }));
  }, [todaySchedules]);
  const mockAttendedCount = scheduleRowsWithMockAttendance.filter((r) => r.attendedMock).length;
  const attendancePct =
    lessonsToday > 0 ? Math.round((mockAttendedCount / lessonsToday) * 100) : null;

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

  const profileSubjects = useMemo(() => monGioiYeuFromRecent(recentScores), [recentScores]);
  const xepLoaiHocTap = useMemo(() => xepLoaiFromGpa(avgScore), [avgScore]);

  if (loading) {
    return (
      <div className="spp-d2-wrap">
        <div className="spp-d2-loading">
          <div className="spp-d2-spinner" />
          <p>Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spp-d2-wrap">
        <p style={{ color: '#b91c1c' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="spp-d2-wrap">
      <section className="sd2-hero sd2-hero--profile" aria-label="Hồ sơ học sinh">
        <div className="sd2-hero-inner">
          <div className="sd2-avatar sd2-avatar--ring" aria-hidden>
            {displayUser?.avatarUrl || displayUser?.avatar_url ? (
              <img src={displayUser.avatarUrl || displayUser.avatar_url} alt="" className="sd2-avatar-img" />
            ) : (
              <span className="sd2-avatar-initials">{initials(fullName)}</span>
            )}
          </div>
          <div className="sd2-hero-text">
            <h1 className="sd2-hero-name">{fullName}</h1>
            <p
              className="sd2-hero-sub--single sd2-hero-sub--with-sem"
              title={
                schoolYearIsMock
                  ? 'Năm học: BE không trả schoolYear trên lớp — hiển thị 2025 (mẫu)'
                  : undefined
              }
            >
              <span className="sd2-hero-sub-text">
                {className !== '—' ? `Lớp ${className} - ${schoolYearLine}` : 'Chưa xếp lớp'}
              </span>
              <span className="sd2-hero-sub-sep" aria-hidden>
                ·
              </span>
              <span className="sd2-hero-sem-inline" title="Học kỳ chỉ UI — chưa lọc dữ liệu theo BE">
                <label htmlFor="spp-semester" className="sd2-hero-sem-label">
                  Học kỳ
                </label>
                <select
                  id="spp-semester"
                  className="sd2-hero-sem-select"
                  value={semesterUi}
                  onChange={(e) => setSemesterUi(e.target.value)}
                  aria-label="Học kỳ (chỉ giao diện)"
                >
                  <option value="1">Học kỳ 1</option>
                  <option value="2">Học kỳ 2</option>
                </select>
              </span>
            </p>
            <span className="sd2-status-badge">
              <GraduationCap size={15} strokeWidth={2} aria-hidden />
              {isStudyingActive ? 'Đang học' : displayOrChuaCapNhat(displayUser?.status)}
            </span>
          </div>
        </div>
        <svg className="sd2-hero-wave" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden>
          <path
            fill="#f1f5f9"
            d="M0,28 C320,56 640,0 960,28 C1280,56 1360,14 1440,22 L1440,56 L0,56 Z"
          />
        </svg>
      </section>

      <section className="sd2-quickbar" aria-label="Chỉ số nhanh">
        <div className="sd2-quickbar-cell sd2-quickbar-cell--gpa" title="Điểm TB từ exam-scores">
          <GraduationCap className="sd2-quickbar-ic" size={22} strokeWidth={2} aria-hidden />
          <span className="sd2-quickbar-label">Điểm TB</span>
          <span className="sd2-quickbar-value">{avgScore ?? '—'}</span>
        </div>
        <div
          className="sd2-quickbar-cell sd2-quickbar-cell--att"
          title="Chuyên cần: mock theo tiết hôm nay — chưa có API"
        >
          <CheckSquare className="sd2-quickbar-ic" size={22} strokeWidth={2} aria-hidden />
          <span className="sd2-quickbar-label">Chuyên cần</span>
          <span className="sd2-quickbar-value">{attendancePct != null ? `${attendancePct}%` : '—'}</span>
        </div>
        <div className="sd2-quickbar-cell sd2-quickbar-cell--conduct" title="Hạnh kiểm: chưa có API">
          <Star className="sd2-quickbar-ic sd2-quickbar-ic--gold" size={22} strokeWidth={2} aria-hidden />
          <span className="sd2-quickbar-label">Hạnh kiểm</span>
          <span className="sd2-quickbar-value">{MOCK_CONDUCT_LABEL}</span>
        </div>
        <div className="sd2-quickbar-cell sd2-quickbar-cell--teacher">
          <div className="sd2-teacher-av" aria-hidden>
            {homeroomTeacherName ? initials(homeroomTeacherName) : '?'}
          </div>
          <div className="sd2-quickbar-teacher-text">
            <span className="sd2-quickbar-label">Giáo viên</span>
            <span className="sd2-quickbar-value sd2-quickbar-value--sm">
              Giáo viên: {homeroomTeacherName || 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </section>

      <section className="sd2-profile-grid" aria-label="Thông tin chi tiết">
        <article className="sd2-pi-card">
          <h2 className="sd2-pi-card-title">
            <User className="sd2-pi-card-title-ic" size={20} strokeWidth={2} aria-hidden />
            Thông tin cá nhân
          </h2>
          <div className="sd2-pi-rows">
            <div className="sd2-pi-row">
              <User className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Giới tính</span>
              <span className="sd2-pi-row-val">{displayOrChuaCapNhat(displayUser?.gender)}</span>
            </div>
            <div className="sd2-pi-row">
              <Calendar className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Ngày sinh</span>
              <span className="sd2-pi-row-val">
                {formatDateViShort(displayUser?.dateOfBirth) || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="sd2-pi-row">
              <Phone className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Số điện thoại</span>
              <span className="sd2-pi-row-val">{displayOrChuaCapNhat(displayUser?.phone)}</span>
            </div>
          </div>
        </article>

        <article className="sd2-pi-card">
          <h2 className="sd2-pi-card-title">
            <School className="sd2-pi-card-title-ic" size={20} strokeWidth={2} aria-hidden />
            Thông tin trường học
          </h2>
          <div className="sd2-pi-rows">
            <div className="sd2-pi-row">
              <Briefcase className="sd2-pi-row-ic sd2-pi-row-ic--orange" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Trường</span>
              <span className="sd2-pi-row-val">{schoolName}</span>
            </div>
            <div className="sd2-pi-row" title="Học kỳ chỉ UI">
              <CheckSquare className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Học kỳ</span>
              <span className="sd2-pi-row-val">
                {semesterLabel}
                <span className="sd2-pi-mock-mark"> (UI)</span>
              </span>
            </div>
            <div className="sd2-pi-row">
              <IdCard className="sd2-pi-row-ic sd2-pi-row-ic--orange" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Số báo danh</span>
              <span className="sd2-pi-row-val" title="rollno từ enrollment">
                {rollnoDisplay}
              </span>
            </div>
          </div>
        </article>

        <article className="sd2-pi-card sd2-pi-card--mock" title="Chưa có API phụ huynh cho học sinh">
          <h2 className="sd2-pi-card-title">
            <Users className="sd2-pi-card-title-ic" size={20} strokeWidth={2} aria-hidden />
            Thông tin phụ huynh
          </h2>
          <div className="sd2-pi-rows">
            <div className="sd2-pi-row">
              <User className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Phụ huynh</span>
              <span className="sd2-pi-row-val sd2-pi-row-val--muted">Chưa cập nhật</span>
            </div>
            <div className="sd2-pi-row">
              <Phone className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Liên hệ PH</span>
              <span className="sd2-pi-row-val sd2-pi-row-val--muted">Chưa cập nhật</span>
            </div>
          </div>
        </article>

        <article className="sd2-pi-card">
          <h2 className="sd2-pi-card-title">
            <Award className="sd2-pi-card-title-ic" size={20} strokeWidth={2} aria-hidden />
            Kết quả học tập
          </h2>
          <div className="sd2-pi-rows">
            <div className="sd2-pi-row">
              <Medal className="sd2-pi-row-ic sd2-pi-row-ic--gold" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Môn giỏi</span>
              <span className="sd2-pi-row-val">{profileSubjects.gioi || '—'}</span>
            </div>
            <div className="sd2-pi-row">
              <AlertTriangle className="sd2-pi-row-ic sd2-pi-row-ic--red" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Môn yếu</span>
              <span className="sd2-pi-row-val">{profileSubjects.yeu}</span>
            </div>
            <div className="sd2-pi-row">
              <Hexagon className="sd2-pi-row-ic" size={18} strokeWidth={2} aria-hidden />
              <span className="sd2-pi-row-label">Xếp loại</span>
              <span className="sd2-pi-row-val" title="Ước lượng từ điểm TB điểm thi">
                {avgScore ? xepLoaiHocTap : '—'}
              </span>
            </div>
          </div>
        </article>
      </section>

      <footer className="spp-d2-foot">
        <button type="button" className="spp-d2-foot-toggle" onClick={() => setShowBeNotes((v) => !v)}>
          {showBeNotes ? 'Ẩn' : 'Hiện'} ghi chú phần chưa có API backend
        </button>
        {showBeNotes ? (
          <ul className="spp-d2-foot-list">
            {BE_DATA_GAP_ITEMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}
      </footer>
    </div>
  );
};

export default StudentProfilePage;
