import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../../shared/lib/api';
import './AttendanceManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';

const AttendanceManagement = () => {
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

  const [items, setItems] = useState([]); // AttendanceItemDto list
  // Trạng thái lựa chọn trên UI (tri-state):
  // - null: chưa điểm danh (chưa chốt)
  // - true: PRESENT
  // - false: ABSENT
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
        // ưu tiên nếu user đã có class
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
        // STUDENT: chỉ hiển thị đúng lớp của học sinh, không ảnh hưởng role khác
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
            // fallback: nếu không có endpoint /classes/:id thì vẫn gọi /classes và lọc
            const res = await api.get("/classes");
            const all = res.data.classes || [];
            const filtered = all.filter((c) => String(c.id) === String(studentClassId));
            setClasses(filtered);
            setSelectedClassId(String(studentClassId));
          }
        } else {
          const res = await api.get("/classes");
          let allClasses = res.data.classes || [];
          const userRole = user?.role?.name?.toUpperCase();
          if ((userRole === "ADMIN" || userRole === "TEACHER") && user?.school?.id) {
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

        // Nghiệp vụ: giáo viên chỉ được điểm danh cho môn/lớp học phần mà họ phụ trách (classSection.teacher)
        const teacherId = user?.id;
        const isTeacherRole = userRole === "TEACHER" || userRole.startsWith("TEACHER") || userRole === "GIÁO VIÊN";
        if (isTeacherRole && teacherId != null) {
          list = (list || []).filter((cs) => String(cs.teacher?.id) === String(teacherId));
        }

        setClassSections(list);

        // STUDENT: auto chọn lớp học phần đầu tiên để khỏi phải thao tác nhiều
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
      // Nếu là Phụ huynh, chỉ giữ lại đúng con mình trong danh sách
      if (isParent && activeStudentId) {
        roster = roster.filter((it) => String(getRowStudentId(it)) === String(activeStudentId));
      } else if (isStudent && user?.id) {
        roster = roster.filter((it) => String(getRowStudentId(it)) === String(user.id));
      }
      setItems(roster);
      // init selection state from backend status
      const map = {};
      (roster || []).forEach((it) => {
        const sid = it?.studentId;
        const raw = it?.status == null ? null : String(it.status).toUpperCase();
        if (sid == null) return;
        if (raw === 'PRESENT') map[sid] = true;
        else if (raw === 'ABSENT') map[sid] = false;
        else if (raw == null) map[sid] = null;
        else {
          // LATE/EXCUSED/...: hiện tại UI không thao tác; map về "đã điểm danh" (coi như có mặt)
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
        status: it.status, // giữ nguyên dữ liệu gốc; trạng thái hiển thị/lưu dùng selectionByStudentId
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
        // Chỉ gửi những học sinh đã được giáo viên chọn PRESENT/ABSENT.
        // status=null (chưa điểm danh) sẽ KHÔNG bị ngầm map thành PRESENT/ABSENT.
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
        <h2 className="text-2xl font-bold text-slate-800">{isViewOnly ? 'Xem điểm danh của con' : 'Quản lý điểm danh'}</h2>

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
                                  // Tri-state: indeterminate khi chưa điểm danh
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
                                  // khi indeterminate thì không có peer-checked, giữ màu xám
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
};

export default AttendanceManagement;
