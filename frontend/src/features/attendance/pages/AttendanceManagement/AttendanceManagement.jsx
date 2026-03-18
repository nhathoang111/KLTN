import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../../shared/lib/api";
import "./AttendanceManagement.css";
import { useAuth } from "../../../auth/context/AuthContext";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Có mặt" },
  { value: "ABSENT", label: "Vắng" },
  { value: "LATE", label: "Đi muộn" },
  { value: "EXCUSED", label: "Có phép" },
];

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
      <div className="attendance-management">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="attendance-management">
      <div className="common-page-header">
        <h2>Quản lý điểm danh</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit && (
            <>
              <button className="btn btn-secondary" type="button" onClick={markAllPresent} disabled={items.length === 0}>
                Mark all present
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving || items.length === 0}>
                {saving ? "Đang lưu..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="common-form-group">
            <label>Lớp *</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">Chọn lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="common-form-group">
            <label>Lớp học phần *</label>
            <select
              value={selectedClassSectionId}
              onChange={(e) => setSelectedClassSectionId(e.target.value)}
              disabled={!selectedClassId}
            >
              <option value="">{selectedClassId ? "Chọn lớp học phần" : "Chọn lớp trước"}</option>
              {classSections.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {(cs.subject?.name || "Môn?")} - {(cs.teacher?.fullName || "GV?")} ({cs.semester || "HK?"} / {cs.schoolYear || "Năm?"})
                </option>
              ))}
            </select>
          </div>

          <div className="common-form-group">
            <label>Ngày *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{error}</div>}
        {message && <div style={{ marginTop: 10, color: "#065f46", fontWeight: 700 }}>{message}</div>}
      </div>

      <div className="common-table-container attendance-table-container">
        {loadingRoster ? (
          <div className="loading">Đang tải danh sách học sinh...</div>
        ) : (
          <table className="common-table attendance-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vắng</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#6b7280" }}>
                    Chọn lớp học phần và ngày để xem danh sách điểm danh.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.studentId}>
                    <td style={{ fontWeight: 700 }}>{it.fullName}</td>
                    <td>{it.email}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={it.status === "ABSENT"}
                        onChange={(e) => toggleAbsent(it.studentId, e.target.checked)}
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <select
                        value={it.status || "PRESENT"}
                        onChange={(e) => updateStatus(it.studentId, e.target.value)}
                        disabled={!canEdit}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={it.note || ""}
                        onChange={(e) => updateNote(it.studentId, e.target.value)}
                        placeholder="Ghi chú..."
                        disabled={!canEdit}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;



