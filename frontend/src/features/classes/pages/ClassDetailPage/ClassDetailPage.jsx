import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../../shared/lib/api";
import { useAuth } from "../../../auth/context/AuthContext";

const tabs = [
  { id: "overview", label: "Thông tin lớp" },
  { id: "students", label: "Học sinh" },
  { id: "sections", label: "Lớp học phần" },
];

const safeText = (v, fallback = "N/A") => {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s ? s : fallback;
};

const isTeacherRole = (name) => {
  const n = (name || "").toString().toUpperCase();
  return n === "TEACHER" || n.startsWith("TEACHER") || n === "GIÁO VIÊN";
};

const ClassDetailPage = () => {
  const { id } = useParams();
  const classId = useMemo(() => Number(id), [id]);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [classEntity, setClassEntity] = useState(null);
  const [students, setStudents] = useState([]);
  const [classSections, setClassSections] = useState([]);

  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    subjectId: "",
    teacherId: "",
    semester: "HK1",
    schoolYear: "",
    status: "ACTIVE",
  });

  const userRole = user?.role?.name?.toUpperCase();
  const canManageSections = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [classRes, studentsRes, sectionsRes] = await Promise.all([
          api.get(`/classes/${classId}`),
          api.get(`/classes/${classId}/students`).catch(() => ({ data: { students: [] } })),
          api.get(`/class-sections/class/${classId}`).catch(() => ({ data: { classSections: [] } })),
        ]);

        if (cancelled) return;

        const cls = classRes.data || null;
        setClassEntity(cls);
        setStudents(studentsRes.data?.students || []);
        setClassSections(sectionsRes.data?.classSections || []);

        const syName = cls?.schoolYear?.name ? String(cls.schoolYear.name) : "";
        setCreateForm((prev) => ({
          ...prev,
          schoolYear: prev.schoolYear || syName,
        }));
      } catch (e) {
        if (cancelled) return;
        setError("Không tải được dữ liệu lớp học. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (Number.isFinite(classId)) fetchAll();
    else {
      setLoading(false);
      setError("ID lớp không hợp lệ.");
    }

    return () => {
      cancelled = true;
    };
  }, [classId]);

  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async () => {
      const schoolId = classEntity?.school?.id;
      if (!schoolId) return;
      try {
        const [subjectsRes, usersRes] = await Promise.all([
          api.get(`/subjects/school/${schoolId}`).catch(() => api.get("/subjects")),
          api.get(`/users?schoolId=${schoolId}`).catch(() => api.get("/users")),
        ]);
        if (cancelled) return;
        setSubjects(subjectsRes.data?.subjects || []);
        const allUsers = usersRes.data?.users || [];
        const teacherUsers = allUsers.filter((u) => isTeacherRole(u?.role?.name));
        setTeachers(teacherUsers);
      } catch (_) {
        if (!cancelled) return;
        setSubjects([]);
        setTeachers([]);
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, [classEntity?.school?.id]);

  const refreshSections = async () => {
    const sectionsRes = await api.get(`/class-sections/class/${classId}`).catch(() => ({ data: { classSections: [] } }));
    setClassSections(sectionsRes.data?.classSections || []);
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setCreateError("");
    try {
      setCreating(true);
      const payload = {
        classId,
        subjectId: Number(createForm.subjectId),
        teacherId: Number(createForm.teacherId),
        semester: createForm.semester,
        schoolYear: createForm.schoolYear,
        status: createForm.status,
      };
      await api.post("/class-sections", payload);
      await refreshSections();
      setCreateForm((prev) => ({
        ...prev,
        subjectId: "",
        teacherId: "",
        status: "ACTIVE",
      }));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message;
      setCreateError(msg ? String(msg) : "Tạo lớp học phần thất bại. Vui lòng thử lại.");
      // Trong trường hợp bản ghi đã tồn tại từ trước, vẫn reload danh sách để hiển thị
      try {
        await refreshSections();
      } catch (_) {
        // ignore
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!canManageSections) return;
    if (!sectionId) return;

    if (!window.confirm("Bạn có chắc muốn xóa lớp học phần này không?")) return;
    try {
      setDeletingId(sectionId);
      await api.delete(`/class-sections/${sectionId}`);
      await refreshSections();
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.response?.data?.message || "Xóa thất bại";
      alert(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="class-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="class-list-page">
        <div className="common-page-header">
          <h1>Chi tiết lớp</h1>
          <Link className="btn btn-secondary" to="/classes">
            Quay lại
          </Link>
        </div>
        <div style={{ padding: 16, background: "#fff", borderRadius: 8 }}>{error}</div>
      </div>
    );
  }

  const schoolName = classEntity?.school?.name;
  const schoolYearName = classEntity?.schoolYear?.name;
  const homeroomTeacherName = classEntity?.homeroomTeacher?.fullName;

  return (
    <div className="class-list-page">
      <div className="common-page-header">
        <div>
          <h1>Chi tiết lớp học</h1>
          <div style={{ color: "#6b7280", marginTop: 4 }}>
            {safeText(classEntity?.name)} · ID: {safeText(classEntity?.id)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn-secondary" to="/classes">
            Quay lại
          </Link>
          <Link className="btn btn-primary" to={`/classes/${classId}/edit`}>
            Sửa lớp
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? "#111827" : undefined,
              color: activeTab === t.id ? "#fff" : undefined,
              borderColor: activeTab === t.id ? "#111827" : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Trường</div>
              <div style={{ fontWeight: 600 }}>{safeText(schoolName)}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Năm học</div>
              <div style={{ fontWeight: 600 }}>{safeText(schoolYearName)}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>GVCN</div>
              <div style={{ fontWeight: 600 }}>{safeText(homeroomTeacherName)}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Phòng</div>
              <div style={{ fontWeight: 600 }}>{safeText(classEntity?.room, "Chưa có phòng")}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Sĩ số</div>
              <div style={{ fontWeight: 600 }}>
                {(classEntity?.studentCount ?? students.length ?? 0)}/{safeText(classEntity?.capacity, "0")}
              </div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Trạng thái</div>
              <div style={{ fontWeight: 600 }}>{safeText(classEntity?.status)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="common-table-container" style={{ marginTop: 0 }}>
          <div style={{ padding: "12px 16px", fontWeight: 700 }}>Danh sách học sinh ({students.length})</div>
          <table className="common-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 16, color: "#6b7280" }}>
                    Chưa có học sinh trong lớp.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>{safeText(s.fullName)}</td>
                    <td>{safeText(s.email)}</td>
                    <td>{safeText(s.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "sections" && (
        <div className="common-table-container" style={{ marginTop: 0 }}>
          <div style={{ padding: "12px 16px", fontWeight: 700 }}>Lớp học phần ({classSections.length})</div>

          <form onSubmit={handleCreateSection} style={{ padding: "0 16px 12px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div className="common-form-group">
                <label>Môn học *</label>
                <select
                  value={createForm.subjectId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, subjectId: e.target.value }))}
                  required
                >
                  <option value="">Chọn môn</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Giáo viên *</label>
                <select
                  value={createForm.teacherId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, teacherId: e.target.value }))}
                  required
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Học kỳ *</label>
                <select
                  value={createForm.semester}
                  onChange={(e) => setCreateForm((p) => ({ ...p, semester: e.target.value }))}
                  required
                >
                  <option value="HK1">HK1</option>
                  <option value="HK2">HK2</option>
                </select>
              </div>
              <div className="common-form-group">
                <label>Năm học *</label>
                <input
                  type="text"
                  value={createForm.schoolYear}
                  onChange={(e) => setCreateForm((p) => ({ ...p, schoolYear: e.target.value }))}
                  placeholder="VD: 2024-2025"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Trạng thái</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>
            </div>

            {createError && (
              <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>
                {createError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo lớp học phần"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setCreateError("");
                  setCreateForm((p) => ({
                    ...p,
                    subjectId: "",
                    teacherId: "",
                    semester: "HK1",
                    status: "ACTIVE",
                  }));
                }}
              >
                Làm mới form
              </button>
            </div>
          </form>

          <table className="common-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Giáo viên</th>
                <th>Học kỳ</th>
                <th>Năm học</th>
                <th>Trạng thái</th>
                {canManageSections && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {classSections.length === 0 ? (
                <tr>
                  <td colSpan={canManageSections ? 6 : 5} style={{ padding: 16, color: "#6b7280" }}>
                    Chưa có lớp học phần cho lớp này.
                  </td>
                </tr>
              ) : (
                classSections.map((cs) => (
                  <tr key={cs.id}>
                    <td>{safeText(cs.subject?.name)}</td>
                    <td>{safeText(cs.teacher?.fullName)}</td>
                    <td>{safeText(cs.semester)}</td>
                    <td>{safeText(cs.schoolYear)}</td>
                    <td>{safeText(cs.status)}</td>
                    {canManageSections && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={deletingId === cs.id}
                          onClick={() => handleDeleteSection(cs.id)}
                        >
                          {deletingId === cs.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClassDetailPage;

