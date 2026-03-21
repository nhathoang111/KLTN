import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './AttendanceManagement.css';
import { Pencil, Trash2 } from 'lucide-react';
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

  const toggleAbsent = (studentId, checked) => {
    setItems((prev) =>
      prev.map((it) =>
        it.studentId === studentId
          ? { ...it, status: checked ? "ABSENT" : "PRESENT" }
          : it
      )
    );
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

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Qu岷 l媒 chuy锚n c岷</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            鉃?膼i峄僲 danh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">H峄峜 sinh</th>
                  <th className="px-4 py-3 text-left">L峄沺</th>
                  <th className="px-4 py-3 text-left">Tr岷g th谩i</th>
                  <th className="px-4 py-3 text-left">Ghi ch煤</th>
                  <th className="px-4 py-3 text-left">Ng脿y</th>
                  <th className="px-4 py-3 text-center">Thao t谩c</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {attendance.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="student-info">
                        <span className="student-name">{item.student?.fullName}</span>
                        <span className="student-email">{item.student?.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.classEntity?.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex min-w-[96px] justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.note || '-'}</td>
                    <td className="px-4 py-3">{item.attendanceDate ? new Date(item.attendanceDate).toLocaleDateString('vi-VN') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '-')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                          onClick={() => handleEdit(item)}
                          aria-label="Sửa chuyên cần"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                          onClick={() => handleDelete(item.id)}
                          aria-label="Xóa chuyên cần"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;



