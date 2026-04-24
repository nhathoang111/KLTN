import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import { isValidSchoolYearFormat } from '../../../../shared/lib/schoolYearFormat';

function getApiErrorMessage(err, fallback) {
  const d = err?.response?.data;
  if (d == null) return err?.message || fallback;
  if (typeof d === 'string') return d;
  const msg = d.message;
  if (msg != null) return Array.isArray(msg) ? msg.join(', ') : String(msg);
  if (d.error != null) return typeof d.error === 'string' ? d.error : String(d.error);
  return fallback;
}

const parseClassNumberFromName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const match = name.match(/^\d+\/(\d+)\s*\(/);
  return match ? match[1] : '';
};

const ClassEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const classId = parseInt(id, 10);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Lớp ARCHIVED: chỉ xem, không cho sửa (đồng bộ với backend). */
  const [archivedLock, setArchivedLock] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classesInSchool, setClassesInSchool] = useState([]);

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

  const userRoleUpper = (user?.role?.name || '').toUpperCase();

  useEffect(() => {
    if (Number.isNaN(classId)) {
      setError('ID lớp không hợp lệ.');
      setLoadingData(false);
      return;
    }

    const load = async () => {
      setLoadingData(true);
      setError('');
      try {
        const [classRes, schoolsRes] = await Promise.all([
          api.get(`/classes/${classId}`),
          api.get('/schools')
        ]);
        const c = classRes.data;
        let allSchools = schoolsRes.data.schools || [];
        if (userRoleUpper === 'ADMIN' && user?.school?.id) {
          allSchools = allSchools.filter((s) => s.id === user.school.id);
        }
        setSchools(allSchools);

        const schoolYearStr =
          c.schoolYear && typeof c.schoolYear === 'object' ? c.schoolYear.name || '' : c.schoolYear || '';
        const rawCn = c.classNumber;
        const classNumberStr =
          rawCn != null ? String(rawCn) : parseClassNumberFromName(c.name) || '';

        const sid = c.school?.id;
        const defaultSchoolId =
          userRoleUpper === 'ADMIN' && user?.school?.id ? String(user.school.id) : sid != null ? String(sid) : '';

        setFormData({
          gradeLevel: c.gradeLevel != null ? String(c.gradeLevel) : '',
          classNumber: classNumberStr,
          schoolYear: schoolYearStr,
          capacity: c.capacity != null ? String(c.capacity) : '',
          status: c.status || 'ACTIVE',
          schoolId: defaultSchoolId || (sid != null ? String(sid) : ''),
          homeroomTeacherId: c.homeroomTeacher?.id != null ? String(c.homeroomTeacher.id) : '',
          room: c.room || ''
        });
        setArchivedLock(String(c.status || '').toUpperCase() === 'ARCHIVED');

        if (sid) {
          try {
            const clsRes = await api.get(`/classes/school/${sid}`);
            setClassesInSchool(clsRes.data.classes || []);
          } catch (_) {
            setClassesInSchool([]);
          }
          try {
            const usersRes = await api.get(`/users?userRole=ADMIN&schoolId=${sid}`);
            const allUsers = usersRes.data.users || [];
            const teacherUsers = allUsers.filter((u) => {
              const rn = (u.role?.name || '').toUpperCase();
              return rn === 'TEACHER' || rn.startsWith('TEACHER') || rn === 'GIÁO VIÊN';
            });
            setTeachers(teacherUsers);
          } catch (_) {
            setTeachers([]);
          }
        } else {
          setClassesInSchool([]);
          setTeachers([]);
        }
      } catch (err) {
        const t = getApiErrorMessage(err, 'Không tải được thông tin lớp.');
        setError(t);
        toast.error(t);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [classId, user?.school?.id, userRoleUpper]);

  useEffect(() => {
    const sid = parseInt(formData.schoolId, 10);
    if (!sid || Number.isNaN(sid)) {
      setClassesInSchool([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const clsRes = await api.get(`/classes/school/${sid}`);
        if (!cancelled) setClassesInSchool(clsRes.data.classes || []);
      } catch (_) {
        if (!cancelled) setClassesInSchool([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.schoolId]);

  useEffect(() => {
    const sid = parseInt(formData.schoolId, 10);
    if (!sid || Number.isNaN(sid)) {
      setTeachers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const usersRes = await api.get(`/users?userRole=ADMIN&schoolId=${sid}`);
        if (cancelled) return;
        const allUsers = usersRes.data.users || [];
        const teacherUsers = allUsers.filter((u) => {
          const rn = (u.role?.name || '').toUpperCase();
          return rn === 'TEACHER' || rn.startsWith('TEACHER') || rn === 'GIÁO VIÊN';
        });
        setTeachers(teacherUsers);
      } catch (_) {
        if (!cancelled) setTeachers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.schoolId]);

  const availableHomeroomTeachers = useMemo(() => {
    const schoolId = parseInt(formData.schoolId, 10);
    if (!schoolId || Number.isNaN(schoolId)) return [];
    const selectedTeacherId = formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId, 10) : null;
    const assignedTeacherIds = new Set(
      (classesInSchool || [])
        .filter((cls) => (cls?.school?.id ?? cls?.school_id) === schoolId)
        .filter((cls) => cls.id !== classId)
        .map((cls) => cls?.homeroomTeacher?.id ?? cls?.homeroomTeacherId)
        .filter(Boolean)
    );
    return (teachers || []).filter((t) => {
      const tSchoolId = t?.school?.id ?? t?.school_id;
      if (tSchoolId !== schoolId) return false;
      if (selectedTeacherId != null && t.id === selectedTeacherId) return true;
      return !assignedTeacherIds.has(t.id);
    });
  }, [teachers, classesInSchool, formData.schoolId, formData.homeroomTeacherId, classId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'schoolId') next.homeroomTeacherId = '';
      return next;
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (archivedLock) {
      toast.error('Lớp đã lưu trữ, không thể chỉnh sửa.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const gradeLevel = parseInt(formData.gradeLevel, 10);
      const classNumber = parseInt(formData.classNumber, 10);
      const capacity = parseInt(formData.capacity, 10);
      if (Number.isNaN(capacity) || capacity < 1 || capacity > 50) {
        setError('Sĩ số tối đa chỉ được nhập từ 1 đến 50.');
        return;
      }
      const schoolYearStr = (formData.schoolYear || '').trim();
      if (!isValidSchoolYearFormat(schoolYearStr)) {
        setError('Niên khóa phải đúng định dạng YYYY-YYYY (ví dụ 2024-2025).');
        return;
      }
      const name = schoolYearStr
        ? `${gradeLevel}/${classNumber} (${schoolYearStr})`
        : `Khối ${gradeLevel} - Lớp ${classNumber}`;
      const submitData = {
        name,
        gradeLevel,
        classNumber,
        schoolYear: schoolYearStr,
        capacity,
        schoolId: parseInt(formData.schoolId, 10),
        homeroomTeacherId: formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId, 10) : null,
        room: formData.room?.trim() || null,
        status: formData.status || 'ACTIVE'
      };
      const headers = { 'X-User-Role': user?.role?.name || '' };
      await api.put(`/classes/${classId}`, submitData, { headers });
      toast.success('Cập nhật lớp học thành công.');
      navigate(`/classes/${classId}`);
    } catch (err) {
      const errText = getApiErrorMessage(err, 'Cập nhật lớp thất bại.');
      setError(errText);
      toast.error(errText);
    } finally {
      setSaving(false);
    }
  };

  if (Number.isNaN(classId)) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">ID lớp không hợp lệ.</p>
        <Link to="/classes" className="text-indigo-600 mt-4 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto p-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sửa lớp học</h1>
          <p className="mt-1 text-sm text-gray-500">Cập nhật thông tin lớp (ID: {classId})</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/classes/${classId}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Chi tiết lớp
          </Link>
          <Link
            to="/classes"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Danh sách lớp
          </Link>
        </div>
      </div>

      {archivedLock && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lớp đang ở trạng thái <strong>lưu trữ (ARCHIVED)</strong> — không thể chỉnh sửa qua form này. Dùng liên kết bên trên để xem chi tiết hoặc quay lại danh sách lớp.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset
          disabled={archivedLock}
          className="space-y-6 border-0 p-0 m-0 min-w-0"
          style={{ minWidth: 0 }}
        >
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
                Khối *
              </label>
              <select
                name="gradeLevel"
                id="gradeLevel"
                required
                value={formData.gradeLevel}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Chọn khối</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </select>
            </div>
            <div>
              <label htmlFor="classNumber" className="block text-sm font-medium text-gray-700">
                Số lớp *
              </label>
              <input
                type="number"
                name="classNumber"
                id="classNumber"
                required
                min={1}
                value={formData.classNumber}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="schoolYear" className="block text-sm font-medium text-gray-700">
                Năm học *
              </label>
              <input
                type="text"
                name="schoolYear"
                id="schoolYear"
                required
                placeholder="VD: 2024-2025"
                pattern="\d{4}-\d{4}"
                title="Niên khóa phải đúng định dạng YYYY-YYYY (ví dụ 2024-2025)"
                value={formData.schoolYear}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          {formData.gradeLevel && formData.classNumber && (
            <p className="mt-3 text-sm text-gray-500">
              Tên lớp sẽ là:{' '}
              <strong>
                {formData.gradeLevel}/{formData.classNumber}
                {formData.schoolYear?.trim() ? ` (${formData.schoolYear.trim()})` : ''}
              </strong>
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                Sĩ số tối đa *
              </label>
              <input
                type="number"
                name="capacity"
                id="capacity"
                required
                min={1}
                max={50}
                value={formData.capacity}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngưng hoạt động</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="room" className="block text-sm font-medium text-gray-700">
              Phòng học
            </label>
            <input
              type="text"
              name="room"
              id="room"
              value={formData.room}
              onChange={handleChange}
              placeholder="VD: A101"
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mt-6">
            <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
              Trường *
            </label>
            <select
              name="schoolId"
              id="schoolId"
              required
              value={formData.schoolId}
              onChange={handleChange}
              disabled={userRoleUpper === 'ADMIN' && !!user?.school?.id}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Chọn trường</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <label htmlFor="homeroomTeacherId" className="block text-sm font-medium text-gray-700">
              Giáo viên chủ nhiệm
            </label>
            <select
              name="homeroomTeacherId"
              id="homeroomTeacherId"
              value={formData.homeroomTeacherId}
              onChange={handleChange}
              disabled={!formData.schoolId}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">{formData.schoolId ? '— Không chọn —' : 'Chọn trường trước'}</option>
              {availableHomeroomTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Giáo viên đã làm GVCN lớp khác trong cùng trường sẽ không hiện trong danh sách (trừ GVCN hiện tại của lớp này).
            </p>
          </div>
        </div>
        </fieldset>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/classes/${classId}`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || archivedLock}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassEditPage;
