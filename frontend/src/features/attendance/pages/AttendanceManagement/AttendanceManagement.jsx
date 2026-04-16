import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../../shared/lib/api';
import './AttendanceManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';

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

// COMPONENT ĐIỀU HƯỚNG THEO ROLE
export default function AttendanceManagementWrapper() {
  const { user } = useAuth();
  const userRole = (user?.role?.name || "").toString().toUpperCase();
  const isParent = userRole === "PARENT";

  if (isParent) {
    return <AttendanceParentView />;
  }

  return <AttendanceDefaultLegacy />;
}

// =========================================================================
// LUỒNG DÀNH RIÊNG CHO PHỤ HUYNH — Xem điểm danh theo ngày
// =========================================================================
function AttendanceParentView() {
  const activeStudentId = localStorage.getItem('activeStudentId');

  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState(null);

  // Bước 1: Resolve classId một lần duy nhất khi mount
  useEffect(() => {
    if (!activeStudentId) return;
    const resolveClass = async () => {
      try {
        const res = await api.get(`/users/${activeStudentId}`);
        let cId = res.data?.class?.id || null;
        if (!cId) {
          const enrRes = await api.get(`/users/${activeStudentId}/enrollment`);
          cId = enrRes.data?.enrollment?.classId || null;
        }
        setClassId(cId);
      } catch (e) {
        console.error('Không lấy được classId của học sinh', e);
      }
    };
    resolveClass();
  }, [activeStudentId]);

  // Bước 2: Fetch TKB + điểm danh khi classId hoặc date thay đổi
  useEffect(() => {
    if (!activeStudentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch TKB — ưu tiên theo classId để có đủ classSectionId
        let allSchedules = [];
        if (classId) {
          try {
            const schRes = await api.get(`/schedules/class/${classId}`);
            allSchedules = schRes.data?.schedules || [];
          } catch (e) {}
        }
        if (!allSchedules.length) {
          const schRes = await api.get(`/schedules/student/${activeStudentId}`).catch(() => ({ data: { schedules: [] } }));
          allSchedules = schRes.data?.schedules || [];
        }

        // Filter TKB theo ngày chọn
        const targetDateObj = new Date(date);
        const targetDow = targetDateObj.getDay() === 0 ? 7 : targetDateObj.getDay();

        const getDateStr = (s) => {
          if (!s.date) return null;
          if (typeof s.date === 'string') return s.date.slice(0, 10);
          if (Array.isArray(s.date) && s.date.length >= 3) {
            const [y, m, d] = s.date;
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
          if (s.date?.year != null) {
            const mo = s.date.monthValue ?? s.date.month ?? 1;
            const dy = s.date.dayOfMonth ?? s.date.day ?? 1;
            return `${s.date.year}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
          }
          return null;
        };

        const checkDate = (s) => {
          const ds = getDateStr(s);
          if (ds && ds === date) return true;
          const raw = s.dayOfWeek ?? s.day_of_week;
          if (raw == null || raw === '') return false;
          const n = Number(raw);
          if (Number.isNaN(n)) return false;
          return (n === 0 ? 7 : n) === targetDow;
        };

        const filtered = allSchedules.filter(checkDate).sort((a, b) => (a.period || 0) - (b.period || 0));

        // Fetch điểm danh theo từng classSectionId
        const csIds = [...new Set(filtered.map(s => s.classSection?.id || s.classSectionId).filter(Boolean))];
        const attPromises = csIds.map(async (csid) => {
          try {
            const res = await api.get('/attendance', { params: { classSectionId: csid, date } });
            const items = res.data?.items || [];
            const rec = items.find(it => String(it.studentId) === String(activeStudentId));
            if (rec) return { ...rec, boundClassSectionId: csid };
          } catch (e) {}
          return null;
        });

        const attResults = (await Promise.all(attPromises)).filter(Boolean);
        setSchedules(filtered);
        setAttendance(attResults);
      } catch (err) {
        console.error('Lỗi fetch dữ liệu điểm danh:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeStudentId, date, classId]);

  if (!activeStudentId) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', borderRadius: '20px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📋</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Thông tin điểm danh</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
            Vui lòng chọn một học sinh tại màn hình <strong>Tổng quan</strong> để xem thông tin điểm danh.
          </p>
          <button
            style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}
            onClick={() => window.location.href = '/dashboard'}
          >
            Về trang Tổng quan
          </button>
        </div>
      </div>
    );
  }

  const combinedRows = schedules.map(s => {
    const sid = String(s.classSectionId || s.classSection?.id);
    const rec = attendance.find(a => String(a.boundClassSectionId) === sid);
    let status = 'pending'; let statusText = 'Chưa điểm danh';
    if (rec?.status) {
      const st = String(rec.status).toUpperCase();
      if (st === 'PRESENT') { status = 'present'; statusText = 'Đã điểm danh'; }
      if (st === 'ABSENT')  { status = 'absent';  statusText = 'Vắng mặt'; }
      if (st === 'LATE')    { status = 'late';    statusText = 'Đi trễ'; }
    }
    return { schedule: s, status, statusText };
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>📋 Điểm danh theo ngày</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>Theo dõi sự chuyên cần của con bạn</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', fontSize: '0.88rem', color: '#475569' }}>Chọn ngày:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '8px 14px', fontSize: '0.9rem', fontWeight: '500', color: '#334155', outline: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Bảng */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiết học</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Môn học</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giáo viên</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                    Đang tải dữ liệu...
                  </div>
                </td></tr>
              ) : combinedRows.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Không có môn học nào trong thời khóa biểu ngày đã chọn.
                </td></tr>
              ) : combinedRows.map((row, idx) => {
                const subj = scheduleSubjectDisplayName(row.schedule, '—');
                const tchr = row.schedule.teacher?.fullName || row.schedule.teacher?.full_name || '—';
                const badgeStyle = {
                  padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-block',
                  ...(row.status === 'present' ? { background: '#dcfce7', color: '#15803d' }
                    : row.status === 'absent'  ? { background: '#fee2e2', color: '#dc2626' }
                    : row.status === 'late'    ? { background: '#ffedd5', color: '#ea580c' }
                    : { background: '#f1f5f9', color: '#64748b' }),
                };
                return (
                  <tr key={row.schedule.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '500', color: '#1e293b' }}>
                      Tiết {row.schedule.period}
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '6px' }}>
                        ({periodTimeRange(row.schedule.period)})
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}>{subj}</td>
                    <td style={{ padding: '16px 20px', color: '#475569' }}>{tchr}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={badgeStyle}>{row.statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// =========================================================================

// =========================================================================
function AttendanceDefaultLegacy() {
  const { user } = useAuth();
  const userRole = (user?.role?.name || "").toString().toUpperCase();
  const isParent = userRole === "PARENT";
  const isStudent = userRole === "STUDENT";
  const isViewOnly = isParent || isStudent;
  const canEdit = (userRole === "TEACHER" || userRole.startsWith("TEACHER") || userRole === "GIÁO VIÊN") && !isViewOnly;

  const [classes, setClasses] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassSectionId, setSelectedClassSectionId] = useState("");
  const [studentClassId, setStudentClassId] = useState(null);
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [items, setItems] = useState([]); 
  const [selectionByStudentId, setSelectionByStudentId] = useState({});
  const classIdNum = useMemo(() => (selectedClassId ? Number(selectedClassId) : null), [selectedClassId]);

  const getRowStudentId = useCallback((row) => {
    const v = row?.studentId ?? row?.student_id ?? row?.userId ?? row?.user_id ?? row?.id;
    if (v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n;
  }, []);

  // STUDENT: xác định lớp từ enrollment giống dashboard/profile
  useEffect(() => {
    const resolveStudentClassId = async () => {
      if (!isStudent || !user?.id) {
        setStudentClassId(null);
        return;
      }
      try {
        let cId = user?.class?.id ?? null;
        if (!cId) {
          const enrRes = await api.get(`/users/${user.id}/enrollment`);
          const enr = enrRes.data?.enrollment;
          if (enr?.classId) cId = enr.classId;
        }
        setStudentClassId(cId ? Number(cId) : null);
      } catch {
        setStudentClassId(null);
      }
    };
    resolveStudentClassId();
  }, [isStudent, user?.id]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError("");
        
        if (isStudent) {
          if (!studentClassId) {
            setClasses([]);
            setSelectedClassId("");
            setSelectedClassSectionId("");
            setItems([]);
            return;
          }
          try {
            const classRes = await api.get(`/classes/${studentClassId}`);
            const raw = classRes.data?.class ?? classRes.data;
            setClasses(raw ? [raw] : []);
            setSelectedClassId(String(studentClassId));
          } catch {
            const res = await api.get("/classes");
            const all = res.data.classes || [];
            const filtered = all.filter((c) => String(c.id) === String(studentClassId));
            setClasses(filtered);
            setSelectedClassId(String(studentClassId));
          }
        } else {
          const res = await api.get("/classes");
          let allClasses = res.data.classes || [];
          const roleUpper = user?.role?.name?.toUpperCase();
          if ((roleUpper === "ADMIN" || roleUpper === "TEACHER") && user?.school?.id) {
            allClasses = allClasses.filter((c) => c.school?.id === user.school.id);
          }
          setClasses(allClasses);
        }
      } catch (e) {
        setError("Không tải được danh sách lớp.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [user, isStudent, studentClassId]);

  useEffect(() => {
    const fetchSections = async () => {
      setClassSections([]);
      setSelectedClassSectionId("");
      setItems([]);
      setMessage("");
      setError("");
      if (!classIdNum) return;
      try {
        const res = await api.get(`/class-sections/class/${classIdNum}`);
        let list = res.data.classSections || [];
        const teacherId = user?.id;
        const isTeacherRole = userRole === "TEACHER" || userRole.startsWith("TEACHER") || userRole === "GIÁO VIÊN";
        if (isTeacherRole && teacherId != null) {
          list = (list || []).filter((cs) => String(cs.teacher?.id) === String(teacherId));
        }

        setClassSections(list);

        if (isStudent && (list || []).length > 0) {
          setSelectedClassSectionId((prev) => (prev ? prev : String(list[0].id)));
        }
      } catch (e) {
        setError("Không tải được danh sách lớp học phần.");
      }
    };
    fetchSections();
  }, [classIdNum, user?.id, userRole, isStudent]);

  const selectedClassSection = useMemo(() => {
    if (!selectedClassSectionId) return null;
    return (classSections || []).find((cs) => String(cs.id) === String(selectedClassSectionId)) || null;
  }, [classSections, selectedClassSectionId]);

  const attendanceTeacherName = selectedClassSection?.teacher?.fullName || "—";

  const loadRoster = useCallback(async () => {
    if (!selectedClassSectionId || !date) return;
    try {
      setLoadingRoster(true);
      setError("");
      setMessage("");
      const res = await api.get(`/attendance`, {
        params: { classSectionId: Number(selectedClassSectionId), date },
      });
      
      let roster = res.data.items || [];
      const activeStudentId = localStorage.getItem('activeStudentId');
      
      if (isParent && activeStudentId) {
        roster = roster.filter((it) => String(getRowStudentId(it)) === String(activeStudentId));
      } else if (isStudent && user?.id) {
        roster = roster.filter((it) => String(getRowStudentId(it)) === String(user.id));
      }
      setItems(roster);
      
      const map = {};
      (roster || []).forEach((it) => {
        const sid = it?.studentId;
        const raw = it?.status == null ? null : String(it.status).toUpperCase();
        if (sid == null) return;
        if (raw === 'PRESENT') map[sid] = true;
        else if (raw === 'ABSENT') map[sid] = false;
        else if (raw == null) map[sid] = null;
        else {
          map[sid] = true;
        }
      });
      setSelectionByStudentId(map);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message;
      setError(msg ? String(msg) : "Không tải được dữ liệu điểm danh.");
    } finally {
      setLoadingRoster(false);
    }
  }, [date, selectedClassSectionId, getRowStudentId, isParent, isStudent, user?.id]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const markAllPresent = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: it.status,
      }))
    );
    setSelectionByStudentId((prev) => {
      const next = { ...(prev || {}) };
      (items || []).forEach((it) => {
        if (it?.studentId != null) next[it.studentId] = true;
      });
      return next;
    });
    setMessage("Đã đánh dấu tất cả có mặt (chưa lưu).");
  };

  const updateStatus = (studentId, status) => {
    setItems((prev) => prev.map((it) => (it.studentId === studentId ? { ...it, status } : it)));
  };

  const togglePresent = (studentId, checked) => {
    setSelectionByStudentId((prev) => ({
      ...(prev || {}),
      [studentId]: checked ? true : false,
    }));
  };

  const updateNote = (studentId, note) => {
    setItems((prev) => prev.map((it) => (it.studentId === studentId ? { ...it, note } : it)));
  };

  const handleSave = async () => {
    if (!selectedClassSectionId) {
      alert("Vui lòng chọn lớp học phần.");
      return;
    }
    if (!date) {
      alert("Vui lòng chọn ngày.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        classSectionId: Number(selectedClassSectionId),
        attendanceDate: date,
        items: items
          .filter((it) => {
            const sid = it?.studentId;
            if (sid == null) return false;
            const sel = Object.prototype.hasOwnProperty.call(selectionByStudentId || {}, sid)
              ? selectionByStudentId[sid]
              : null;
            return sel === true || sel === false;
          })
          .map((it) => {
            const sid = it.studentId;
            const sel = selectionByStudentId[sid];
            return {
              studentId: sid,
              status: sel === true ? "PRESENT" : "ABSENT",
              note: it.note || null,
            };
          }),
      };
      const res = await api.post("/attendance/bulk", payload);
      setMessage(`Đã lưu điểm danh (${res.data.savedCount || 0} bản ghi).`);
      await loadRoster();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message;
      setError(msg ? String(msg) : "Lưu điểm danh thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu chuyên cần...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">{isViewOnly ? 'Xem điểm danh' : 'Quản lý điểm danh'}</h2>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
        )}

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex min-w-[200px] flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Lớp</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[220px] flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Lớp học phần</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              value={selectedClassSectionId}
              onChange={(e) => setSelectedClassSectionId(e.target.value)}
              disabled={!classIdNum || classSections.length === 0}
            >
              <option value="">-- Chọn lớp học phần --</option>
              {classSections.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {(s.subject?.name || s.name || s.sectionName || `Học phần #${s.id}`) +
                    (s.teacher?.fullName ? ` - ${s.teacher.fullName}` : '')}
                </option>
              ))}
            </select>
          </label>

          {userRole === "ADMIN" && (
            <label className="flex min-w-[240px] flex-col gap-1 text-sm">
              <span className="font-medium text-slate-600">Giáo viên điểm danh</span>
              <div className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800">
                {attendanceTeacherName}
              </div>
            </label>
          )}
          <label className="flex min-w-[160px] flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Ngày</span>
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {canEdit && items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
                onClick={markAllPresent}
              >
                Tất cả có mặt
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
              </button>
            </div>
          )}
        </div>

        {loadingRoster && (
          <p className="text-sm text-slate-600">Đang tải danh sách điểm danh...</p>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Học sinh</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {items.length === 0 && !loadingRoster && selectedClassSectionId && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Không có học sinh trong lớp học phần hoặc chưa có dữ liệu cho ngày đã chọn.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.studentId} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium">{it.fullName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{it.email || '—'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const sid = it?.studentId;
                        const sel = sid != null && Object.prototype.hasOwnProperty.call(selectionByStudentId || {}, sid)
                          ? selectionByStudentId[sid]
                          : null;
                        const isUnmarked = sel == null;
                        const checked = sel === true;
                        const label = isUnmarked ? 'Chưa điểm danh' : (sel === false ? 'Vắng' : 'Có mặt');
                        const labelClass = isUnmarked ? 'text-slate-500' : 'text-slate-900';
                        return (
                          <div className="inline-flex items-center gap-3">
                            <label className={`relative inline-flex items-center ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={checked}
                                ref={(el) => {
                                  if (el) el.indeterminate = isUnmarked;
                                }}
                                onChange={(e) => togglePresent(it.studentId, e.target.checked)}
                                disabled={!canEdit}
                                aria-label="Bật: có mặt, tắt: vắng"
                              />
                              <span
                                className={[
                                  "w-11 h-6 rounded-full transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300",
                                  isUnmarked ? "bg-slate-200" : "",
                                  "peer-checked:bg-emerald-500",
                                ].join(" ")}
                              />
                              <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                            </label>
                            <span className={`text-[0.85rem] font-semibold ${labelClass}`}>
                              {label}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full min-w-[200px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={it.note || ''}
                        onChange={(e) => updateNote(it.studentId, e.target.value)}
                        placeholder="Ghi chú"
                        disabled={!canEdit}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!canEdit && !isViewOnly && (
          <p className="text-sm text-slate-600">Chỉ giáo viên mới chỉnh sửa điểm danh.</p>
        )}
      </div>
    </div>
  );
}
