import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../shared/lib/api";
import { useAuth } from "../../../auth/context/AuthContext";
import ClassFormModal from "../../components/ClassFormModal";

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

const toStudyStatus = (status, fallback = "Đang học") => {
  const s = (status || "").toString().trim().toUpperCase();
  if (!s) return fallback;
  if (s === "ACTIVE") return "Đang học";
  if (s === "INACTIVE") return "Ngưng học";
  if (s === "ARCHIVED") return "Đã lưu trữ";
  return status;
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
  const [teachersForSelectedSubject, setTeachersForSelectedSubject] = useState([]);
  const [teachersBySubjectLoading, setTeachersBySubjectLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createError, setCreateError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    gradeLevel: "",
    classNumber: "",
    schoolYear: "",
    capacity: "",
    status: "ACTIVE",
    schoolId: "",
    homeroomTeacherId: "",
    room: "",
  });
  const [createForm, setCreateForm] = useState({
    subjectId: "",
    teacherId: "",
    semester: "HK1",
    schoolYear: "",
    status: "ACTIVE",
  });

  const userRole = user?.role?.name?.toUpperCase();
  const canManageSections = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const canEditClass = !isTeacherRole(user?.role?.name);
  const canViewSectionsTab = !isTeacherRole(user?.role?.name);
  const visibleTabs = useMemo(
    () => tabs.filter((t) => (t.id === "sections" ? canViewSectionsTab : true)),
    [canViewSectionsTab]
  );

  useEffect(() => {
    if (activeTab === "sections" && !canViewSectionsTab) {
      setActiveTab("overview");
    }
  }, [activeTab, canViewSectionsTab]);

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
        // Mặc định: chưa chọn môn thì hiển thị toàn bộ giáo viên đã lọc theo trường
        setTeachersForSelectedSubject(teacherUsers);
      } catch (_) {
        if (!cancelled) return;
        setSubjects([]);
        setTeachers([]);
        setTeachersForSelectedSubject([]);
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, [classEntity?.school?.id]);

  // Khi chọn môn trong form tạo lớp học phần:
  // chỉ hiển thị giáo viên dạy đúng môn đó (dựa trên teacher_subjects).
  useEffect(() => {
    const schoolId = classEntity?.school?.id;
    const subjectId = createForm.subjectId ? Number(createForm.subjectId) : null;

    // Chưa chọn môn -> dùng danh sách giáo viên của trường
    if (!subjectId || !schoolId) {
      setTeachersForSelectedSubject(teachers || []);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setTeachersBySubjectLoading(true);
        const res = await api.get(`/subjects/${subjectId}/teachers`);
        if (cancelled) return;
        const list = res.data?.teachers || [];
        setTeachersForSelectedSubject(list);

        const currentTeacherId = createForm.teacherId ? String(createForm.teacherId) : '';
        if (currentTeacherId) {
          const exists = list.some((t) => String(t.id) === currentTeacherId);
          if (!exists) {
            setCreateForm((p) => ({ ...p, teacherId: '' }));
          }
        }
      } catch (e) {
        if (cancelled) return;
        // Fallback: nếu BE chưa có endpoint/hoặc lỗi -> hiển thị toàn bộ giáo viên theo trường
        setTeachersForSelectedSubject(teachers || []);
      } finally {
        if (!cancelled) setTeachersBySubjectLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [createForm.subjectId, classEntity?.school?.id, teachers]);

  const refreshSections = async () => {
    const sectionsRes = await api.get(`/class-sections/class/${classId}`).catch(() => ({ data: { classSections: [] } }));
    setClassSections(sectionsRes.data?.classSections || []);
  };

  const openEditModal = () => {
    if (!classEntity) return;
    setEditFormData({
      gradeLevel: classEntity.gradeLevel ? String(classEntity.gradeLevel) : "",
      classNumber: classEntity.classNumber ? String(classEntity.classNumber) : "",
      schoolYear: classEntity?.schoolYear?.name || classEntity?.schoolYear || "",
      capacity: classEntity.capacity ? String(classEntity.capacity) : "",
      status: classEntity.status || "ACTIVE",
      schoolId: classEntity?.school?.id ? String(classEntity.school.id) : "",
      homeroomTeacherId: classEntity?.homeroomTeacher?.id ? String(classEntity.homeroomTeacher.id) : "",
      room: classEntity.room || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      const gradeLevel = parseInt(editFormData.gradeLevel, 10);
      const classNumber = parseInt(editFormData.classNumber, 10);
      const capacity = parseInt(editFormData.capacity, 10);
      if (Number.isNaN(capacity) || capacity < 1 || capacity > 50) {
        toast.error("Sĩ số tối đa chỉ được nhập từ 1 đến 50.");
        return;
      }
      const schoolYearStr = (editFormData.schoolYear || "").trim();
      const name = schoolYearStr
        ? `${gradeLevel}/${classNumber} (${schoolYearStr})`
        : `Khối ${gradeLevel} - Lớp ${classNumber}`;

      const submitData = {
        ...editFormData,
        name,
        gradeLevel,
        classNumber,
        capacity,
        schoolId: parseInt(editFormData.schoolId, 10),
        homeroomTeacherId: editFormData.homeroomTeacherId ? parseInt(editFormData.homeroomTeacherId, 10) : null,
        room: editFormData.room || null,
      };

      const headers = { "X-User-Role": user?.role?.name || "" };
      const response = await api.put(`/classes/${classId}`, submitData, { headers });
      const updatedClass = response?.data?.class || response?.data || null;
      if (updatedClass) {
        setClassEntity(updatedClass);
      }
      setShowEditModal(false);
      toast.success("Cập nhật lớp học thành công.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Cập nhật lớp học thất bại.";
      toast.error(String(msg));
    }
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
      toast.success("Đã thêm lớp học phần.");
      setCreateForm((prev) => ({
        ...prev,
        subjectId: "",
        teacherId: "",
        status: "ACTIVE",
      }));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message;
      const text = msg ? String(msg) : "Tạo lớp học phần thất bại. Vui lòng thử lại.";
      setCreateError(text);
      toast.error(text);
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
      toast.success("Đã xóa lớp học phần.");
      await refreshSections();
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.response?.data?.message || "Xóa thất bại";
      toast.error(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-6 text-center text-slate-600 shadow-xl shadow-slate-900/5">
            Đang tải...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5">
            <h1 className="text-xl font-bold text-slate-900">Chi tiết lớp</h1>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
          <Link className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/classes">
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const schoolName = classEntity?.school?.name;
  const schoolYearName = classEntity?.schoolYear?.name;
  const homeroomTeacherName = classEntity?.homeroomTeacher?.fullName || "Chưa có";
  const schoolOptions = classEntity?.school ? [classEntity.school] : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Chi tiết lớp học</h1>
              <div className="mt-1 text-sm text-slate-500">
                Lớp: {safeText(classEntity?.name)} - Niên khóa: {safeText(schoolYearName)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/classes">
                Quay lại
              </Link>
              {canEditClass && (
                <button
                  type="button"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
                  onClick={openEditModal}
                >
                  Sửa lớp
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === t.id
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

      {activeTab === "overview" && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-900/5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">Trường</div>
              <div className="font-semibold text-slate-800">{safeText(schoolName)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Năm học</div>
              <div className="font-semibold text-slate-800">{safeText(schoolYearName)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">GVCN</div>
              <div className="font-semibold text-slate-800">{safeText(homeroomTeacherName)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Phòng</div>
              <div className="font-semibold text-slate-800">{safeText(classEntity?.room, "Chưa có phòng")}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Sĩ số</div>
              <div className="font-semibold text-slate-800">
                {(classEntity?.studentCount ?? students.length ?? 0)}/{safeText(classEntity?.capacity, "0")}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Trạng thái</div>
              <div className="font-semibold text-slate-800">{toStudyStatus(classEntity?.status)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="px-4 py-3 font-semibold text-slate-800">Danh sách học sinh ({students.length})</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Họ tên</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-slate-500">
                      Chưa có học sinh trong lớp.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{safeText(s.fullName)}</td>
                      <td className="px-4 py-3">{safeText(s.email)}</td>
                      <td className="px-4 py-3">{toStudyStatus(s.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sections" && canViewSectionsTab && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="px-4 py-3 font-semibold text-slate-800">Lớp học phần ({classSections.length})</div>

          <form onSubmit={handleCreateSection} className="px-4 pb-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Môn học *</label>
                <select
                  value={createForm.subjectId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, subjectId: e.target.value }))}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Chọn môn</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Giáo viên *</label>
                <select
                  value={createForm.teacherId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, teacherId: e.target.value }))}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Chọn giáo viên</option>
                  {(teachersBySubjectLoading ? teachers : teachersForSelectedSubject).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Học kỳ *</label>
                <select
                  value={createForm.semester}
                  onChange={(e) => setCreateForm((p) => ({ ...p, semester: e.target.value }))}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="HK1">HK1</option>
                  <option value="HK2">HK2</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Năm học *</label>
                <input
                  type="text"
                  value={createForm.schoolYear}
                  onChange={(e) => setCreateForm((p) => ({ ...p, schoolYear: e.target.value }))}
                  placeholder="VD: 2024-2025"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>
            </div>

            {createError && <div className="mt-2 text-sm font-semibold text-rose-700">{createError}</div>}

            <div className="mt-3 flex gap-2">
              <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500" type="submit" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo lớp học phần"}
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Môn học</th>
                  <th className="px-4 py-3 text-left">Giáo viên</th>
                  <th className="px-4 py-3 text-left">Học kỳ</th>
                  <th className="px-4 py-3 text-left">Năm học</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  {canManageSections && <th className="px-4 py-3 text-left">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {classSections.length === 0 ? (
                  <tr>
                    <td colSpan={canManageSections ? 6 : 5} className="px-4 py-4 text-slate-500">
                      Chưa có lớp học phần cho lớp này.
                    </td>
                  </tr>
                ) : (
                  classSections.map((cs) => (
                    <tr key={cs.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{safeText(cs.subject?.name)}</td>
                      <td className="px-4 py-3">{safeText(cs.teacher?.fullName)}</td>
                      <td className="px-4 py-3">{safeText(cs.semester)}</td>
                      <td className="px-4 py-3">{safeText(cs.schoolYear)}</td>
                      <td className="px-4 py-3">{safeText(cs.status)}</td>
                      {canManageSections && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
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
        </div>
      )}
      </div>
      <ClassFormModal
        open={showEditModal}
        editingClass={classEntity}
        formData={editFormData}
        setFormData={setEditFormData}
        handleSubmit={handleUpdateClass}
        handleCloseModal={() => setShowEditModal(false)}
        user={user}
        schools={schoolOptions}
        availableHomeroomTeachers={teachers}
      />
    </div>
  );
};

export default ClassDetailPage;

