import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../../shared/lib/api';
import './AttendanceManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const userRole = (user?.role?.name || "").toString().toUpperCase();
  const canEdit = userRole === "TEACHER" || userRole.startsWith("TEACHER") || userRole === "GIÁO VIÊN";

  const [classes, setClasses] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassSectionId, setSelectedClassSectionId] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [items, setItems] = useState([]); // AttendanceItemDto list
  const classIdNum = useMemo(() => (selectedClassId ? Number(selectedClassId) : null), [selectedClassId]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/classes");
        let allClasses = res.data.classes || [];
        const userRole = user?.role?.name?.toUpperCase();
        if ((userRole === "ADMIN" || userRole === "TEACHER") && user?.school?.id) {
          allClasses = allClasses.filter((c) => c.school?.id === user.school.id);
        }
        setClasses(allClasses);
      } catch (e) {
        setError("Không tải được danh sách lớp.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [user]);

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
        setClassSections(res.data.classSections || []);
      } catch (e) {
        setError("Không tải được danh sách lớp học phần.");
      }
    };
    fetchSections();
  }, [classIdNum]);

  const loadRoster = useCallback(async () => {
    if (!selectedClassSectionId || !date) return;
    try {
      setLoadingRoster(true);
      setError("");
      setMessage("");
      const res = await api.get(`/attendance`, {
        params: { classSectionId: Number(selectedClassSectionId), date },
      });
      setItems(res.data.items || []);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message;
      setError(msg ? String(msg) : "Không tải được dữ liệu điểm danh.");
    } finally {
      setLoadingRoster(false);
    }
  }, [date, selectedClassSectionId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const markAllPresent = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: "PRESENT",
      }))
    );
    setMessage("Đã đánh dấu tất cả có mặt (chưa lưu).");
  };

  const updateStatus = (studentId, status) => {
    setItems((prev) => prev.map((it) => (it.studentId === studentId ? { ...it, status } : it)));
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
        items: items.map((it) => ({
          studentId: it.studentId,
          status: it.status,
          note: it.note || null,
        })),
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

  const statusOptions = [
    { value: 'PRESENT', label: 'Có mặt' },
    { value: 'ABSENT', label: 'Vắng' },
    { value: 'LATE', label: 'Muộn' },
    { value: 'EXCUSED', label: 'Có phép' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý điểm danh</h2>

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
                  {s.subject?.name || s.name || s.sectionName || `Học phần #${s.id}`}
                </option>
              ))}
            </select>
          </label>
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
                      <select
                        className="w-full max-w-[180px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={it.status || 'PRESENT'}
                        onChange={(e) => updateStatus(it.studentId, e.target.value)}
                        disabled={!canEdit}
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
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

        {!canEdit && (
          <p className="text-sm text-slate-600">Chỉ giáo viên mới chỉnh sửa điểm danh.</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;



