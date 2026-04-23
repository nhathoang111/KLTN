import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../../shared/lib/api';
import './ClassListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';
import { Archive, ArrowRightLeft, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import ClassFormModal from '../../components/ClassFormModal';
import ClassYearArchiveModal from '../../components/ClassYearArchiveModal';
import ClassRolloverModal from '../../components/ClassRolloverModal';
import { buildTeacherVisibleClasses } from '../../../../shared/lib/teacherScope';

/** Tên niên khóa từ object lớp (API có thể trả schoolYear là object hoặc chuỗi). */
function schoolYearLabel(c) {
  if (!c) return '';
  const sy = c.schoolYear;
  if (sy && typeof sy === 'object') return String(sy.name || '').trim();
  if (typeof c.schoolYear === 'string') return c.schoolYear.trim();
  return '';
}

/** Danh sách niên khóa duy nhất, mới nhất trước (so sánh chuỗi có numeric). */
function uniqueSortedSchoolYears(classList) {
  const set = new Set();
  (classList || []).forEach((cl) => {
    const y = schoolYearLabel(cl);
    if (y) set.add(y);
  });
  return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

const ClassListPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    gradeLevel: '',
    classNumber: '',
    schoolYear: '',
    capacity: '',
    status: 'ACTIVE',
    schoolId: '',
    homeroomTeacherId: '',
    room: ''
  });

  const [showArchived, setShowArchived] = useState(false);
  const [showYearArchiveModal, setShowYearArchiveModal] = useState(false);
  const [archiveYearSchoolId, setArchiveYearSchoolId] = useState('');
  const [yearArchiveSchoolYear, setYearArchiveSchoolYear] = useState('');
  const [yearArchiveLoading, setYearArchiveLoading] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverSchoolId, setRolloverSchoolId] = useState('');
  const [rolloverFromYear, setRolloverFromYear] = useState('');
  const [rolloverToYear, setRolloverToYear] = useState('');
  const [rolloverLoading, setRolloverLoading] = useState(false);
  /** Rỗng = hiện mọi niên khóa; có giá trị = chỉ lớp thuộc niên khóa đó. */
  const [filterSchoolYear, setFilterSchoolYear] = useState('');
  const yearInitRef = React.useRef(false);

  const displayedClasses = useMemo(() => {
    if (!classes || !Array.isArray(classes)) return [];
    if (showArchived) return classes;
    return classes.filter((c) => (c.status || '').toUpperCase() !== 'ARCHIVED');
  }, [classes, showArchived]);

  const yearOptions = useMemo(() => uniqueSortedSchoolYears(classes), [classes]);

  const tableClasses = useMemo(() => {
    let list = displayedClasses;
    if (filterSchoolYear) {
      list = list.filter((c) => schoolYearLabel(c) === filterSchoolYear);
    }
    return list;
  }, [displayedClasses, filterSchoolYear]);

  /** Lần đầu có dữ liệu: mặc định chọn niên khóa mới nhất (lớp chưa ARCHIVED) để xem theo năm học. */
  useEffect(() => {
    if (yearInitRef.current || !classes?.length) return;
    const active = classes.filter(
      (c) => (c.status || '').toUpperCase() !== 'ARCHIVED' && schoolYearLabel(c)
    );
    const labels = uniqueSortedSchoolYears(active);
    if (labels.length > 0) setFilterSchoolYear(labels[0]);
    yearInitRef.current = true;
  }, [classes]);

  useEffect(() => {
    fetchData();
    const userRole = user?.role?.name?.toUpperCase();
    if ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id) {
      setFormData(prev => ({
        ...prev,
        schoolId: user.school.id.toString()
      }));
    }
  }, [user]);

  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const fetchData = async () => {
    try {
      const [classesRes, schoolsRes, countsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/schools'),
        api.get('/classes/counts/students').catch(() => ({ data: {} }))
      ]);

      let allClasses = classesRes.data.classes || [];
      const studentCounts = countsRes.data || {};
      allClasses = allClasses.map((cls) => ({
        ...cls,
        studentCount: studentCounts[String(cls.id)] ?? cls.studentCount ?? 0
      }));

      // Filter for admin and teacher users
      const userRole = user?.role?.name?.toUpperCase();

      // Filter classes for admin - only show classes from their own school
      if (userRole === 'ADMIN' && user?.school?.id) {
        allClasses = allClasses.filter(cls => cls.school?.id === user.school.id);
      }

      // Filter classes for teacher - source of teaching permission is class_sections.
      if (userRole === 'TEACHER' && user?.id) {
        try {
          const sectionRes = await api.get(`/class-sections/teacher/${user.id}`);
          const teacherSections = sectionRes.data.classSections || [];
          allClasses = buildTeacherVisibleClasses({
            allClasses,
            classSections: teacherSections,
            teacherId: Number(user.id),
            schoolId: Number(user.school?.id),
            includeHomeroom: true,
          });
        } catch (sectionError) {
          console.error('Error fetching teacher class sections:', sectionError);
          // Fallback to homeroom teacher only if class-section fetch fails
          allClasses = allClasses.filter(cls => {
            const homeroomTeacherId = cls.homeroomTeacher?.id || cls.homeroomTeacherId;
            const isHomeroomTeacher = homeroomTeacherId === user.id;
            const isSameSchool = cls.school?.id === user.school?.id;
            return isHomeroomTeacher && isSameSchool;
          });
        }
      }

      setClasses(allClasses);

      // Filter schools for admin and teacher - only show their own school
      let allSchools = schoolsRes.data.schools || [];
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id) {
        allSchools = allSchools.filter(school => school.id === user.school.id);
      }
      setSchools(allSchools);

      // Fetch teachers based on user role
      const fetchTeachers = async () => {
        try {
          const userRole = user?.role?.name?.toUpperCase();
          const schoolId = user?.school?.id;

          let url = '/users';
          if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
            url += `?userRole=ADMIN&schoolId=${schoolId}`;
          }

          const usersRes = await api.get(url);
          const allUsers = usersRes.data.users || [];
          const teacherUsers = allUsers.filter(user => {
            const roleName = user.role?.name?.toUpperCase();
            return roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIÁO VIÊN';
          });
          setTeachers(teacherUsers);
        } catch (error) {
          console.error('Error fetching teachers:', error);
        }
      };

      await fetchTeachers();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const gradeLevel = parseInt(formData.gradeLevel, 10);
      const classNumber = parseInt(formData.classNumber, 10);
      const capacity = parseInt(formData.capacity, 10);
      if (Number.isNaN(capacity) || capacity < 1 || capacity > 50) {
        toast.error('Sĩ số tối đa chỉ được nhập từ 1 đến 50.');
        return;
      }
      const schoolYearStr = (typeof formData.schoolYear === 'string' ? formData.schoolYear : (formData.schoolYear?.name ?? '')).trim();
      const name = schoolYearStr ? `${gradeLevel}/${classNumber} (${schoolYearStr})` : `Khối ${gradeLevel} - Lớp ${classNumber}`;
      const submitData = {
        ...formData,
        name,
        gradeLevel,
        classNumber,
        capacity,
        schoolId: parseInt(formData.schoolId, 10),
        homeroomTeacherId: formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId, 10) : null,
        room: formData.room || null
      };

      const headers = {
        'X-User-Role': user?.role?.name || ''
      };

      let response;
      if (editingClass) {
        response = await api.put(`/classes/${editingClass.id}`, submitData, { headers });
      } else {
        response = await api.post('/classes', submitData, { headers });
      }

      console.log('📥 Response from backend:', response.data);
      if (response.data.class) {
        console.log('📥 Created/Updated class room:', response.data.class.room);
      }

      const wasEditing = !!editingClass;
      toast.success(wasEditing ? 'Cập nhật lớp học thành công.' : 'Thêm lớp học thành công.');
      setShowModal(false);
      setEditingClass(null);
      const userRole = user?.role?.name?.toUpperCase();
      const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
        ? user.school.id.toString()
        : '';
      setFormData({
        gradeLevel: '',
        classNumber: '',
        schoolYear: '',
        capacity: '',
        status: 'ACTIVE',
        schoolId: defaultSchoolId,
        homeroomTeacherId: '',
        room: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving class:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Lưu lớp học thất bại.';
      if (error.response?.status === 403) {
        toast.error('Bạn không có quyền thêm/sửa lớp học');
      } else {
        toast.error(msg);
      }
    }
  };

  const parseClassNumberFromName = (name) => {
    if (!name || typeof name !== 'string') return '';
    const match = name.match(/^\d+\/(\d+)\s*\(/);
    return match ? match[1] : '';
  };

  const handleEdit = async (classItem) => {
    try {
      const res = await api.get(`/classes/${classItem.id}`);
      const c = res.data;
      const userRole = user?.role?.name?.toUpperCase();
      const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
        ? user.school.id.toString()
        : (c.school?.id ?? classItem.school?.id)?.toString() || '';
      const schoolYearStr = (c.schoolYear && typeof c.schoolYear === 'object' ? c.schoolYear.name : c.schoolYear)
        || (classItem.schoolYear && typeof classItem.schoolYear === 'object' ? classItem.schoolYear.name : classItem.schoolYear)
        || '';
      const rawClassNumber = c.classNumber ?? classItem.classNumber;
      const classNumberStr = rawClassNumber != null ? String(rawClassNumber) : (parseClassNumberFromName(c.name || classItem.name) || '');
      setEditingClass({ ...classItem, ...c });
      setFormData({
        gradeLevel: (c.gradeLevel ?? classItem.gradeLevel)?.toString() || '',
        classNumber: classNumberStr,
        schoolYear: schoolYearStr,
        capacity: (c.capacity ?? classItem.capacity)?.toString() || '',
        status: c.status || classItem.status || 'ACTIVE',
        schoolId: (c.school?.id ?? classItem.school?.id)?.toString() || defaultSchoolId,
        homeroomTeacherId: (c.homeroomTeacher?.id ?? classItem.homeroomTeacher?.id)?.toString() || '',
        room: (c.room ?? classItem.room) || ''
      });
      setShowModal(true);
    } catch (err) {
      console.error('Error loading class for edit:', err);
      setEditingClass(classItem);
      const userRole = user?.role?.name?.toUpperCase();
      const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
        ? user.school.id.toString()
        : classItem.school?.id?.toString() || '';
      const classNumberStr = classItem.classNumber != null ? String(classItem.classNumber) : parseClassNumberFromName(classItem.name);
      setFormData({
        gradeLevel: classItem.gradeLevel?.toString() || '',
        classNumber: classNumberStr,
        schoolYear: (classItem.schoolYear && typeof classItem.schoolYear === 'object' ? classItem.schoolYear.name : classItem.schoolYear) || '',
        capacity: classItem.capacity?.toString() || '',
        status: classItem.status || 'ACTIVE',
        schoolId: defaultSchoolId,
        homeroomTeacherId: classItem.homeroomTeacher?.id?.toString() || '',
        room: classItem.room || ''
      });
      setShowModal(true);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        'Lưu trữ lớp này? Học sinh sẽ được gỡ khỏi lớp đang hoạt động (enrollment chuyển INACTIVE). Dữ liệu điểm, lịch sử… được giữ lại.'
      )
    ) {
      try {
        const headers = {
          'X-User-Role': user?.role?.name || ''
        };
        await api.delete(`/classes/${id}`, { headers });
        toast.success('Đã lưu trữ lớp học (dữ liệu được giữ lại).');
        fetchData();
      } catch (error) {
        console.error('Error deleting class:', error);
        const delMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Xóa lớp học thất bại.';
        if (error.response?.status === 403) {
          toast.error('Bạn không có quyền xóa lớp học');
        } else {
          toast.error(typeof delMsg === 'string' ? delMsg : String(delMsg));
        }
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
    const userRole = user?.role?.name?.toUpperCase();
    const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
      ? user.school.id.toString()
      : '';
    setFormData({
      gradeLevel: '',
      classNumber: '',
      schoolYear: '',
      capacity: '',
      status: 'ACTIVE',
      schoolId: defaultSchoolId,
      homeroomTeacherId: '',
      room: ''
    });
  };

  const openYearArchiveModal = () => {
    const ur = user?.role?.name?.toUpperCase();
    const def =
      (ur === 'ADMIN' || ur === 'TEACHER') && user?.school?.id
        ? String(user.school.id)
        : formData.schoolId || '';
    setArchiveYearSchoolId(def);
    setYearArchiveSchoolYear('');
    setShowYearArchiveModal(true);
  };

  const handleYearArchiveSubmit = async (e) => {
    e.preventDefault();
    const sid = parseInt(archiveYearSchoolId, 10);
    if (Number.isNaN(sid)) {
      toast.error('Vui lòng chọn trường.');
      return;
    }
    if (!yearArchiveSchoolYear.trim()) {
      toast.error('Nhập tên niên khóa (ví dụ 2024-2025).');
      return;
    }
    try {
      setYearArchiveLoading(true);
      const headers = { 'X-User-Role': user?.role?.name || '' };
      const res = await api.post(
        '/classes/actions/archive-school-year',
        { schoolId: sid, schoolYear: yearArchiveSchoolYear.trim() },
        { headers }
      );
      toast.success(res.data?.message || `Đã lưu trữ ${res.data?.archivedCount ?? 0} lớp.`);
      setShowYearArchiveModal(false);
      fetchData();
    } catch (err) {
      const m = err.response?.data?.message || err.response?.data?.error || 'Lưu trữ niên khóa thất bại';
      toast.error(typeof m === 'string' ? m : String(m));
    } finally {
      setYearArchiveLoading(false);
    }
  };

  const openRolloverModal = () => {
    const ur = user?.role?.name?.toUpperCase();
    const def =
      (ur === 'ADMIN' || ur === 'TEACHER') && user?.school?.id
        ? String(user.school.id)
        : archiveYearSchoolId || formData.schoolId || '';
    setRolloverSchoolId(def);
    setRolloverFromYear(filterSchoolYear || '');
    setRolloverToYear('');
    setShowRolloverModal(true);
  };

  const handleRolloverSubmit = async (e) => {
    e.preventDefault();
    const sid = parseInt(rolloverSchoolId, 10);
    if (Number.isNaN(sid)) {
      toast.error('Vui lòng chọn trường.');
      return;
    }
    if (!rolloverFromYear.trim() || !rolloverToYear.trim()) {
      toast.error('Nhập đủ niên khóa nguồn và đích.');
      return;
    }
    try {
      setRolloverLoading(true);
      const headers = { 'X-User-Role': user?.role?.name || '' };
      const res = await api.post(
        '/classes/actions/rollover-school-year',
        {
          schoolId: sid,
          fromSchoolYear: rolloverFromYear.trim(),
          toSchoolYear: rolloverToYear.trim(),
        },
        { headers }
      );
      const d = res.data || {};
      toast.success(
        d.message ||
          `Khối 12: ${d.archivedGrade12Classes ?? 0} lớp lưu trữ. Khối 10–11: ${d.sourceClassesArchivedAfterRollover ?? 0} lớp nguồn đã chuyển xong; tạo ${d.createdTargetClasses ?? 0} lớp mới; ${d.movedStudentSlots ?? 0} lượt ghi danh.`
      );
      if (Array.isArray(d.errors) && d.errors.length > 0) {
        toast.warn(d.errors.slice(0, 5).join(' | ') + (d.errors.length > 5 ? ' …' : ''));
      }
      setShowRolloverModal(false);
      setFilterSchoolYear(rolloverToYear.trim());
      fetchData();
    } catch (err) {
      const m = err.response?.data?.message || err.response?.data?.error || 'Chuyển niên khóa thất bại';
      toast.error(typeof m === 'string' ? m : String(m));
    } finally {
      setRolloverLoading(false);
    }
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.fullName : 'Chưa có';
  };

  const availableHomeroomTeachers = React.useMemo(() => {
    const schoolId = parseInt(formData.schoolId, 10);
    if (!schoolId) return [];

    const currentEditingClassId = editingClass?.id ?? null;
    const selectedTeacherId = formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId, 10) : null;

    // Những giáo viên đã là GVCN của lớp khác trong cùng trường sẽ bị loại khỏi dropdown.
    const assignedTeacherIds = new Set(
      (classes || [])
        .filter((cls) => (cls?.school?.id ?? cls?.school_id) === schoolId)
        .filter((cls) => (currentEditingClassId == null ? true : cls.id !== currentEditingClassId))
        .map((cls) => cls?.homeroomTeacher?.id ?? cls?.homeroomTeacherId)
        .filter(Boolean)
    );

    return (teachers || []).filter((teacher) => {
      const tSchoolId = teacher?.school?.id ?? teacher?.school_id;
      if (tSchoolId !== schoolId) return false;
      if (selectedTeacherId != null && teacher.id === selectedTeacherId) return true;
      return !assignedTeacherIds.has(teacher.id);
    });
  }, [teachers, classes, formData.schoolId, formData.homeroomTeacherId, editingClass]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu lớp học...</p>
          </div>
        </div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const isTeacher = userRole === 'TEACHER';
  const isAdmin = userRole === 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const canManageClasses = isAdmin || isSuperAdmin; // Chỉ ADMIN và SUPER_ADMIN mới có thể quản lý lớp
  const canArchiveSchoolYear = isSuperAdmin;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Quản lý lớp học</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchData()}
              style={{ marginRight: canManageClasses ? 0 : undefined }}
            >
              Làm mới
            </button>
            {canManageClasses && (
              <>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Hiện lớp đã lưu trữ
                </label>
                {canArchiveSchoolYear && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={openYearArchiveModal}
                  >
                    <Archive size={16} />
                    Kết thúc niên khóa
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={openRolloverModal}
                >
                  <ArrowRightLeft size={16} />
                  Chuyển niên khóa
                </button>
              </>
            )}
            {canManageClasses && (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
                onClick={() => {
                  const defaultSchoolId = (isAdmin || isTeacher) && user?.school?.id
                    ? user.school.id.toString()
                    : '';
                  setFormData({
                    gradeLevel: '',
                    classNumber: '',
                    schoolYear: '',
                    capacity: '',
                    status: 'ACTIVE',
                    schoolId: defaultSchoolId,
                    homeroomTeacherId: '',
                    room: ''
                  });
                  setShowModal(true);
                }}
              >
                <Plus size={16} />
                Thêm lớp học
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap" htmlFor="class-filter-school-year">
            Niên khóa
          </label>
          <select
            id="class-filter-school-year"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 min-w-[200px]"
            value={filterSchoolYear}
            onChange={(e) => setFilterSchoolYear(e.target.value)}
          >
            <option value="">Tất cả niên khóa</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {filterSchoolYear
              ? `Đang hiển thị ${tableClasses.length} lớp thuộc ${filterSchoolYear}`
              : `Đang hiển thị ${tableClasses.length} lớp (mọi niên khóa)`}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tên lớp</th>
                  <th className="px-4 py-3 text-left">Niên khóa</th>
                  <th className="px-4 py-3 text-left">Sĩ số tối đa</th>
                  <th className="px-4 py-3 text-left">Phòng học</th>
                  <th className="px-4 py-3 text-left">Trường</th>
                  <th className="px-4 py-3 text-left">GVCN</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {tableClasses.map((classItem) => {
                  const isArchived = (classItem.status || '').toUpperCase() === 'ARCHIVED';

                  return (
                    <tr key={classItem.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{classItem.name}</td>
                      <td className="px-4 py-3 text-slate-600">{schoolYearLabel(classItem) || '—'}</td>
                      <td className="px-4 py-3">{(classItem.studentCount ?? 0)}/{(classItem.capacity ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: classItem.room ? '#e0f2fe' : '#fee2e2',
                          color: classItem.room ? '#0369a1' : '#991b1b',
                          borderRadius: '4px',
                          fontWeight: '500',
                          fontSize: '13px'
                        }}>
                          {classItem.room || 'Chưa có phòng'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getSchoolName(classItem.school?.id)}</td>
                      <td className="px-4 py-3">{getTeacherName(classItem.homeroomTeacher?.id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex min-w-[84px] justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            classItem.status?.toUpperCase() === 'ACTIVE'
                              ? 'bg-sky-500 text-white'
                              : classItem.status?.toUpperCase() === 'ARCHIVED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {classItem.status?.toUpperCase() === 'ACTIVE' ? 'Đang học' : classItem.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/classes/${classItem.id}`}
                            className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                            aria-label={`Xem chi tiết lớp ${classItem.name}`}
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </Link>
                          {canManageClasses && (
                            <>
                              <button
                                type="button"
                                className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => (isArchived ? toast.error('Lớp đã lưu trữ, không thể sửa.') : handleEdit(classItem))}
                                aria-label="Sửa lớp học"
                                title={isArchived ? 'Đã lưu trữ' : 'Sửa'}
                                disabled={isArchived}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => (isArchived ? toast.error('Lớp đã được lưu trữ.') : handleDelete(classItem.id))}
                                aria-label="Lưu trữ lớp học"
                                title={isArchived ? 'Đã lưu trữ' : 'Lưu trữ'}
                                disabled={isArchived}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ClassFormModal
        open={showModal}
        editingClass={editingClass}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        handleCloseModal={handleCloseModal}
        user={user}
        schools={schools}
        availableHomeroomTeachers={availableHomeroomTeachers}
      />

      {canArchiveSchoolYear && (
        <ClassYearArchiveModal
          open={showYearArchiveModal}
          yearArchiveLoading={yearArchiveLoading}
          setShowYearArchiveModal={setShowYearArchiveModal}
          handleYearArchiveSubmit={handleYearArchiveSubmit}
          user={user}
          archiveYearSchoolId={archiveYearSchoolId}
          setArchiveYearSchoolId={setArchiveYearSchoolId}
          schools={schools}
          yearArchiveSchoolYear={yearArchiveSchoolYear}
          setYearArchiveSchoolYear={setYearArchiveSchoolYear}
        />
      )}

      <ClassRolloverModal
        open={showRolloverModal}
        rolloverLoading={rolloverLoading}
        setShowRolloverModal={setShowRolloverModal}
        handleRolloverSubmit={handleRolloverSubmit}
        user={user}
        rolloverSchoolId={rolloverSchoolId}
        setRolloverSchoolId={setRolloverSchoolId}
        schools={schools}
        rolloverFromYear={rolloverFromYear}
        setRolloverFromYear={setRolloverFromYear}
        yearOptions={yearOptions}
        rolloverToYear={rolloverToYear}
        setRolloverToYear={setRolloverToYear}
      />
    </div>
  );
};

export default ClassListPage;

