import React, { useEffect, useMemo, useState } from 'react';
import { Building2, GraduationCap, Lock, Mail, Phone, Shield, User, Users, School, ToggleLeft, CalendarDays, VenusAndMars, HeartHandshake } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../shared/lib/api';
import { isValidEmail } from '../../../shared/lib/emailFormat';
import { isValidOptionalVietnamMobile } from '../../../shared/lib/phoneFormat';
import { isTeachingActiveClass } from '../../../shared/lib/classStatus';

/** Lớp đã đủ sĩ số theo dữ liệu API (studentCount so với capacity). */
function isClassAtMaxCapacity(cls) {
  if (!cls) return false;
  const cap = cls.capacity;
  if (cap == null || Number(cap) <= 0) return false;
  const count = cls.studentCount ?? 0;
  return Number(count) >= Number(cap);
}

function getApiErrorMessage(err, fallback = 'Đã xảy ra lỗi') {
  const d = err?.response?.data;
  if (d == null) return err?.message || fallback;
  if (typeof d === 'string') return d;
  const msg = d.message;
  if (msg != null) return Array.isArray(msg) ? msg.join(', ') : String(msg);
  if (d.error != null) return typeof d.error === 'string' ? d.error : String(d.error);
  return fallback;
}

/**
 * Form tạo user dùng chung cho:
 * - Modal tạo user trong `UserListPage`
 *
 * Lưu ý: component này tự fetch roles/schools/classes/subjects/students theo schoolId.
 */
const UserCreateForm = ({
  onCancel,
  onCreated,
  submitLabel = 'Tạo người dùng',
  title = 'Tạo người dùng mới',
  description = 'Thêm người dùng mới vào hệ thống với vai trò phù hợp.',
  showContainer = true,
  hideHeader = false,
  mode = 'default'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    schoolId: '',
    classId: '',
    studentIds: [],
    dateOfBirth: '',
    gender: '',
    phone: '',
    department: '',
    subjectId: '',
    subjectIds: [],
    relationship: '',
    status: 'ACTIVE'
  });

  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ name: '', description: '' });
  const [creatingRole, setCreatingRole] = useState(false);
  /**
   * Role ADMIN dùng khi tạo quản trị trường: lấy từ GET /roles?userRole=SUPER_ADMIN (toàn hệ thống).
   * Khi chọn trường, GET /roles/school/{id} có thể không chứa bản ADMIN — khi đó vẫn cần roleId hợp lệ.
   */
  const [platformAdminRole, setPlatformAdminRole] = useState(null);

  const currentUserRole = useMemo(() => user?.role?.name?.toUpperCase(), [user]);
  const currentSchoolId = useMemo(() => user?.school?.id, [user]);
  const isAdminCreationMode = mode === 'create-admin' && currentUserRole === 'SUPER_ADMIN';

  const pickPlatformAdminRole = (arr) => {
    const candidates = (arr || []).filter((r) => {
      const rn = r?.name?.toUpperCase();
      return rn === 'ADMIN' || rn?.startsWith('ADMIN_');
    });
    const globalExact = candidates.find(
      (r) => r?.name?.toUpperCase() === 'ADMIN' && (r.school == null || r.school?.id == null)
    );
    return globalExact || candidates[0] || null;
  };

  useEffect(() => {
    // Admin: auto set schoolId từ context
    if (currentUserRole === 'ADMIN' && currentSchoolId) {
      setFormData((prev) => ({ ...prev, schoolId: String(currentSchoolId) }));
    }
  }, [currentUserRole, currentSchoolId]);

  useEffect(() => {
    const fetchInitialRoles = async () => {
      try {
        let rolesUrl = '/roles';
        if (currentUserRole === 'SUPER_ADMIN') {
          rolesUrl += '?userRole=SUPER_ADMIN';
        } else if (currentUserRole === 'ADMIN' && currentSchoolId) {
          rolesUrl += `?userRole=ADMIN&schoolId=${currentSchoolId}`;
        } else {
          toast.error('Không có quyền truy cập.');
          return;
        }

        const rolesResponse = await api.get(rolesUrl);
        let allRoles = rolesResponse.data.roles || [];

        if (currentUserRole === 'SUPER_ADMIN') {
          allRoles = allRoles.filter((role) => {
            const roleName = role.name?.toUpperCase();
            return roleName === 'ADMIN' || roleName?.startsWith('ADMIN_');
          });
        }

        if (currentUserRole === 'ADMIN') {
          allRoles = allRoles.filter((role) => {
            const roleName = role.name?.toUpperCase();
            return (
              roleName === 'STUDENT' ||
              roleName === 'TEACHER' ||
              roleName === 'PARENT' ||
              roleName?.startsWith('STUDENT') ||
              roleName?.startsWith('TEACHER') ||
              roleName?.startsWith('PARENT')
            );
          });
        }

        const cleaned = Array.isArray(allRoles) ? allRoles.filter((r) => r != null && r.id != null) : [];
        setRoles(cleaned);
        if (mode === 'create-admin' && currentUserRole === 'SUPER_ADMIN') {
          const pa = pickPlatformAdminRole(cleaned);
          if (pa) setPlatformAdminRole(pa);
        }
      } catch (err) {
        console.error('Error fetching initial roles:', err);
      }
    };

    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        await fetchInitialRoles();
        const schoolsResponse = await api.get('/schools');
        setSchools(schoolsResponse.data.schools || []);
      } catch (err) {
        toast.error('Không thể tải dữ liệu lựa chọn.');
        console.error('Error fetching options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [currentUserRole, currentSchoolId, mode]);

  useEffect(() => {
    const schoolId = formData.schoolId;
    if (!schoolId) {
      setClasses([]);
      setSubjects([]);
      setSchoolStudents([]);
      return;
    }

    const fetchRolesForSchool = async (schoolIdArg) => {
      try {
        setLoadingRoles(true);
        const rolesResponse = await api.get(`/roles/school/${schoolIdArg}`);
        let allRoles = rolesResponse.data.roles || [];

        if (currentUserRole === 'ADMIN') {
          allRoles = (allRoles || []).filter((role) => {
            const roleName = role?.name?.toUpperCase();
            return (
              roleName === 'STUDENT' ||
              roleName === 'TEACHER' ||
              roleName === 'PARENT' ||
              roleName?.startsWith('STUDENT') ||
              roleName?.startsWith('TEACHER') ||
              roleName?.startsWith('PARENT')
            );
          });
        }

        let list = Array.isArray(allRoles) ? allRoles.filter((r) => r != null && r.id != null) : [];
        if (isAdminCreationMode && platformAdminRole && !list.some((r) => r.id === platformAdminRole.id)) {
          list = [platformAdminRole, ...list];
        }
        setRoles(list);

        if (isAdminCreationMode) {
          let adminRole = list.find((r) => {
            const rn = r?.name?.toUpperCase();
            return rn === 'ADMIN' || rn?.startsWith('ADMIN_');
          });
          if (!adminRole && platformAdminRole) {
            adminRole = platformAdminRole;
          }
          setFormData((prev) => ({ ...prev, roleId: adminRole ? String(adminRole.id) : '' }));
        } else {
          setFormData((prev) => ({ ...prev, roleId: '' }));
        }
      } catch (err) {
        console.error('Error fetching roles for school:', err);
      } finally {
        setLoadingRoles(false);
      }
    };

    const fetchClassesForSchool = async (schoolIdArg) => {
      try {
        const response = await api.get(`/classes/school/${schoolIdArg}`);
        setClasses((response.data.classes || []).filter(isTeachingActiveClass));
      } catch (err) {
        console.error('Error fetching classes:', err);
        setClasses([]);
      }
    };

    const fetchSubjectsForSchool = async (schoolIdArg) => {
      try {
        const response = await api.get(`/subjects/school/${schoolIdArg}`);
        setSubjects(response.data.subjects || response.data || []);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setSubjects([]);
      }
    };

    const fetchSchoolStudents = async (schoolIdArg) => {
      try {
        const headers = currentUserRole === 'ADMIN' ? { 'X-User-Role': 'ADMIN' } : {};
        const response = await api.get(`/users?userRole=ADMIN&schoolId=${schoolIdArg}`, { headers });
        const all = response.data.users || [];
        const students = all.filter((u) => ((u.role?.name || '').toUpperCase() || '').includes('STUDENT'));
        setSchoolStudents(students);
      } catch (err) {
        console.error('Error fetching students for school:', err);
        setSchoolStudents([]);
      }
    };

    fetchRolesForSchool(schoolId);
    fetchClassesForSchool(schoolId);
    fetchSubjectsForSchool(schoolId);
    fetchSchoolStudents(schoolId);
  }, [formData.schoolId, currentUserRole, isAdminCreationMode, platformAdminRole]);

  // SUPER_ADMIN: auto chọn role ADMIN nếu có (kể cả ADMIN_* hoặc role lấy từ platform fallback)
  useEffect(() => {
    if (currentUserRole === 'SUPER_ADMIN' && formData.schoolId && roles.length > 0 && !formData.roleId) {
      const adminRole = pickPlatformAdminRole(roles);
      if (adminRole) setFormData((prev) => ({ ...prev, roleId: String(adminRole.id) }));
    }
  }, [roles, formData.schoolId, formData.roleId, currentUserRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'roleId') {
        next.studentIds = [];
        next.classId = '';
        next.subjectId = '';
        next.subjectIds = [];
      }
      return next;
    });
  };

  const toggleSubjectId = (id) => {
    setFormData((prev) => {
      const arr = prev.subjectIds || [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...prev, subjectIds: next };
    });
  };

  const toggleStudentId = (id) => {
    setFormData((prev) => {
      const arr = prev.studentIds || [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...prev, studentIds: next };
    });
  };

  const selectedRole = useMemo(() => {
    const roleIdNum = formData.roleId ? Number(formData.roleId) : NaN;
    return roles.find((r) => r.id === roleIdNum);
  }, [roles, formData.roleId]);

  const roleNameUpper = (selectedRole?.name || '').toUpperCase();
  const isRoleStudent = roleNameUpper.includes('STUDENT') || roleNameUpper.includes('HỌC SINH') || roleNameUpper.includes('HOC SINH');
  const isRoleTeacher = roleNameUpper.includes('TEACHER');
  const isRoleParent = roleNameUpper.includes('PARENT');
  const isRoleAdmin = roleNameUpper === 'ADMIN' || roleNameUpper.startsWith('ADMIN_');
  const adminRoleOption = useMemo(() => {
    const fromList = roles.find((r) => {
      const rn = r?.name?.toUpperCase();
      return rn === 'ADMIN' || rn?.startsWith('ADMIN_');
    });
    return fromList || (isAdminCreationMode ? platformAdminRole : null);
  }, [roles, isAdminCreationMode, platformAdminRole]);

  const validateForm = () => {
    if (showRoleModal) {
      toast.error('Vui lòng hoàn tất việc tạo vai trò mới trước khi tạo người dùng.');
      return false;
    }
    if (!formData.email?.trim()) {
      toast.error('Email là bắt buộc.');
      return false;
    }
    if (!isValidEmail(formData.email)) {
      toast.error('Email không hợp lệ');
      return false;
    }
    if (!isValidOptionalVietnamMobile(formData.phone ?? '')) {
      toast.error('Số điện thoại không hợp lệ');
      return false;
    }
    if (!formData.fullName?.trim()) {
      toast.error('Họ tên là bắt buộc.');
      return false;
    }
    if (!formData.password) {
      toast.error('Mật khẩu là bắt buộc.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return false;
    }
    if (!formData.roleId && !(isAdminCreationMode && adminRoleOption?.id)) {
      toast.error('Vui lòng chọn vai trò.');
      return false;
    }
    if (!formData.schoolId && currentUserRole !== 'SUPER_ADMIN') {
      toast.error('Vui lòng chọn trường.');
      return false;
    }
    if (isAdminCreationMode && !formData.schoolId) {
      toast.error('Tài khoản quản trị trường bắt buộc phải chọn trường.');
      return false;
    }
    if (isRoleAdmin && !formData.schoolId) {
      toast.error('Tài khoản Admin bắt buộc phải gán trường.');
      return false;
    }
    if (isRoleStudent && !formData.classId) {
      toast.error('Lớp là bắt buộc khi tạo học sinh.');
      return false;
    }
    if (isRoleStudent && formData.classId) {
      const cid = parseInt(formData.classId, 10);
      const cls = classes.find((c) => c.id === cid || String(c.id) === String(formData.classId));
      if (cls && isClassAtMaxCapacity(cls)) {
        toast.error(
          `Lớp "${cls.name}" đã đủ sĩ số (${cls.studentCount ?? 0}/${cls.capacity}). Không thể thêm học sinh — chọn lớp khác hoặc tăng sĩ số tối đa.`
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);

      const roleIdNum = isAdminCreationMode
        ? parseInt(formData.roleId || String(adminRoleOption?.id || ''), 10)
        : parseInt(formData.roleId, 10);
      if (isAdminCreationMode && Number.isNaN(roleIdNum)) {
        toast.error('Không tìm thấy vai trò ADMIN để tạo quản trị viên.');
        return;
      }
      const schoolIdNum = formData.schoolId ? parseInt(formData.schoolId, 10) : NaN;
      const effectiveSchoolId = Number.isInteger(schoolIdNum)
        ? schoolIdNum
        : currentUserRole === 'ADMIN' && currentSchoolId
          ? currentSchoolId
          : null;

      const userData = {
        email: formData.email?.trim() || '',
        fullName: formData.fullName?.trim() || '',
        password: formData.password || '',
        roleId: roleIdNum,
        status: formData.status || 'ACTIVE'
      };

      if (effectiveSchoolId != null) userData.schoolId = effectiveSchoolId;
      if (isRoleStudent) userData.classId = parseInt(formData.classId, 10);
      if (isRoleParent && Array.isArray(formData.studentIds) && formData.studentIds.length > 0) userData.studentIds = formData.studentIds;
      if (isRoleTeacher && Array.isArray(formData.subjectIds) && formData.subjectIds.length > 0) userData.subjectIds = formData.subjectIds;
      if (formData.dateOfBirth?.trim()) userData.dateOfBirth = formData.dateOfBirth.trim();
      if (formData.gender?.trim()) userData.gender = formData.gender.trim();
      if (formData.phone?.trim()) userData.phone = formData.phone.trim();
      if (formData.department?.trim()) userData.department = formData.department.trim();
      if (formData.relationship?.trim()) userData.relationship = formData.relationship.trim();

      let url = '/users';
      if (currentUserRole === 'SUPER_ADMIN') url += '?currentUserRole=SUPER_ADMIN';
      else if (currentUserRole === 'ADMIN' && currentSchoolId) url += `?currentUserRole=ADMIN&currentUserSchoolId=${currentSchoolId}`;
      else {
        toast.error('Không có quyền truy cập.');
        return;
      }

      const response = await api.post(url, userData);
      toast.success(isAdminCreationMode ? 'Tạo quản trị viên thành công!' : 'Tạo người dùng thành công!');
      if (typeof onCreated === 'function') onCreated(response.data);
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(getApiErrorMessage(err, 'Tạo người dùng thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.schoolId) return toast.error('Vui lòng chọn trường trước.');
    if (!newRoleData.name) return toast.error('Vui lòng nhập tên vai trò.');

    try {
      setCreatingRole(true);
      const response = await api.post('/roles', {
        name: newRoleData.name,
        description: newRoleData.description || '',
        schoolId: parseInt(formData.schoolId, 10)
      });

      const createdRole = response.data.role || response.data;
      if (!createdRole || !createdRole.id) {
        toast.error('Tạo vai trò thành công nhưng không lấy được ID. Vui lòng tải lại trang.');
        window.location.reload();
        return;
      }

      setRoles((prev) => [...prev, createdRole]);
      setFormData((prev) => ({ ...prev, roleId: String(createdRole.id) }));
      setShowRoleModal(false);
      setNewRoleData({ name: '', description: '' });
      toast.success('Tạo vai trò thành công.');
    } catch (err) {
      console.error('Error creating role:', err);
      toast.error(err.response?.data?.error || 'Không thể tạo vai trò.');
    } finally {
      setCreatingRole(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const content = (
    <>
      {!hideHeader && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="bg-white px-4 py-5 sm:rounded-3xl sm:p-6 border border-slate-200">
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email *
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700">
                  Họ tên *
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Mật khẩu *
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                  Xác nhận mật khẩu *
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="schoolId" className="block text-sm font-semibold text-slate-700">
                  Trường{' '}
                  {isAdminCreationMode || isRoleAdmin || currentUserRole !== 'SUPER_ADMIN' ? '*' : '(tùy chọn)'}
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <School size={18} />
                  </span>
                  <select
                    name="schoolId"
                    id="schoolId"
                    value={formData.schoolId}
                    onChange={handleChange}
                    className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                    required={currentUserRole !== 'SUPER_ADMIN' || isRoleAdmin || isAdminCreationMode}
                    disabled={currentUserRole === 'ADMIN'}
                  >
                    <option value="">Chọn trường</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.code})
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    ▾
                  </span>
                </div>
              </div>

              {isAdminCreationMode ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Vai trò</label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Shield size={18} />
                    </span>
                    <input
                      type="text"
                      value="Quản trị trường (ADMIN)"
                      disabled
                      readOnly
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 text-base shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="roleId" className="block text-sm font-semibold text-slate-700">
                      Vai trò *
                    </label>
                    {formData.schoolId && currentUserRole === 'SUPER_ADMIN' && (
                      <button
                        type="button"
                        onClick={() => setShowRoleModal(true)}
                        className="text-xs rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 font-semibold shadow-sm"
                      >
                        + Thêm role
                      </button>
                    )}
                  </div>

                  {!showRoleModal && (
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Shield size={18} />
                      </span>
                      <select
                        name="roleId"
                        id="roleId"
                        value={formData.roleId || ''}
                        onChange={handleChange}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                        required
                        disabled={loadingRoles}
                      >
                        <option value="">{loadingRoles ? 'Đang tải...' : 'Chọn vai trò'}</option>
                        {roles.map((role) => (
                          <option key={role.id} value={String(role.id)}>
                            {role.name || ''} {role.description ? `- ${role.description}` : ''}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        ▾
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

              {showRoleModal && formData.schoolId && currentUserRole === 'SUPER_ADMIN' && (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900">Thêm role mới</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleModal(false);
                        setNewRoleData({ name: '', description: '' });
                      }}
                      className="text-slate-500 hover:text-slate-700 text-xl leading-none"
                      aria-label="Đóng"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tên role *</label>
                      <input
                        type="text"
                        value={newRoleData.name}
                        onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                        className="block w-full rounded-xl border-slate-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="VD: ADMIN, TEACHER, STUDENT"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                      <textarea
                        value={newRoleData.description}
                        onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                        className="block w-full rounded-xl border-slate-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        rows={2}
                        placeholder="Mô tả role"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateRole}
                        disabled={creatingRole}
                        className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 px-4 disabled:opacity-50"
                      >
                        {creatingRole ? 'Đang tạo...' : 'Tạo role'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-slate-700">
                Trạng thái
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <ToggleLeft size={18} />
                </span>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngưng hoạt động</option>
                  <option value="SUSPENDED">Bị khóa</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            {isRoleAdmin && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Thông tin quản trị viên</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="adminPhone" className="block text-sm font-semibold text-slate-700">
                      Số điện thoại
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Phone size={18} />
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        id="adminPhone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="VD: 0912345678"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="adminGender" className="block text-sm font-semibold text-slate-700">
                      Giới tính
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <VenusAndMars size={18} />
                      </span>
                      <select
                        name="gender"
                        id="adminGender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">-- Chọn --</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="adminDateOfBirth" className="block text-sm font-semibold text-slate-700">
                      Ngày sinh
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <CalendarDays size={18} />
                      </span>
                      <input
                        type="date"
                        name="dateOfBirth"
                        id="adminDateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRoleStudent && formData.schoolId && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Học sinh</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label htmlFor="classId" className="block text-sm font-semibold text-slate-700">
                      Lớp *
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <GraduationCap size={18} />
                      </span>
                      <select
                        name="classId"
                        id="classId"
                        value={formData.classId}
                        onChange={handleChange}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        required
                      >
                        <option value="">Chọn lớp</option>
                        {classes.map((cls) => {
                          const full = isClassAtMaxCapacity(cls);
                          const cnt = cls.studentCount ?? 0;
                          const capLabel = cls.capacity != null && cls.capacity !== '' ? cls.capacity : '—';
                          return (
                            <option key={cls.id} value={cls.id} disabled={full}>
                              {cls.name} ({cnt}/{capLabel}){full ? ' — đã đủ sĩ số' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-slate-700">
                      Ngày sinh
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <CalendarDays size={18} />
                      </span>
                      <input
                        type="date"
                        name="dateOfBirth"
                        id="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-slate-700">
                      Giới tính
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <VenusAndMars size={18} />
                      </span>
                      <select
                        name="gender"
                        id="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">-- Chọn --</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRoleTeacher && formData.schoolId && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Giáo viên</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bộ môn (chọn nhiều)</label>
                    <div className="border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto bg-slate-50">
                      {subjects.length === 0 ? (
                        <p className="text-sm text-slate-500">Chưa có môn học nào trong trường.</p>
                      ) : (
                        subjects.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white rounded-xl px-2 -mx-2"
                          >
                            <input
                              type="checkbox"
                              checked={(formData.subjectIds || []).includes(s.id)}
                              onChange={() => toggleSubjectId(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">{s.name || s.code}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {(formData.subjectIds || []).length > 0 && (
                      <p className="text-xs text-emerald-700 mt-1">Đã chọn {(formData.subjectIds || []).length} môn</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                      Số điện thoại
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Phone size={18} />
                      </span>
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="VD: 0912345678"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="department" className="block text-sm font-semibold text-slate-700">
                      Phòng ban
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Building2 size={18} />
                      </span>
                      <input
                        type="text"
                        name="department"
                        id="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="VD: Tổ Toán"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRoleParent && formData.schoolId && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Phụ huynh</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Chọn học sinh (con)</label>
                    <div className="border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto bg-slate-50">
                      {schoolStudents.length === 0 ? (
                        <p className="text-sm text-slate-500">Chưa có học sinh nào trong trường.</p>
                      ) : (
                        schoolStudents.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white rounded-xl px-2 -mx-2"
                          >
                            <input
                              type="checkbox"
                              checked={(formData.studentIds || []).includes(s.id)}
                              onChange={() => toggleStudentId(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">
                              {s.fullName || s.email} {s.email ? `(${s.email})` : ''}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {(formData.studentIds || []).length > 0 && (
                      <p className="text-xs text-emerald-700 mt-1">Đã chọn {(formData.studentIds || []).length} con</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="parentPhone" className="block text-sm font-semibold text-slate-700">
                      Số điện thoại
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Phone size={18} />
                      </span>
                      <input
                        type="text"
                        name="phone"
                        id="parentPhone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="VD: 0912345678"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="relationship" className="block text-sm font-semibold text-slate-700">
                      Quan hệ
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <HeartHandshake size={18} />
                      </span>
                      <select
                        name="relationship"
                        id="relationship"
                        value={formData.relationship}
                        onChange={handleChange}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">-- Chọn --</option>
                        <option value="CHA">Cha</option>
                        <option value="ME">Mẹ</option>
                        <option value="KHAC">Khác</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : submitLabel}
          </button>
        </div>
      </form>
    </>
  );

  if (!showContainer) return content;

  return <div className="max-w-2xl mx-auto">{content}</div>;
};

export default UserCreateForm;

