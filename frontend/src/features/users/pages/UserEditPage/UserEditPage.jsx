import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';

const UserEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const currentUserRole = currentUser?.role?.name?.toUpperCase();
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';
  const isSchoolAdmin = currentUserRole === 'ADMIN';

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    schoolId: '',
    classId: '',
    studentIds: [],
    subjectIds: [],
    dateOfBirth: '',
    gender: '',
    phone: '',
    department: '',
    relationship: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchUserData();
    fetchOptions();
  }, [id]);

  useEffect(() => {
    if (formData.schoolId) {
      fetchRolesForSchool(formData.schoolId);
      fetchClassesForSchool(formData.schoolId);
      fetchSubjectsForSchool(formData.schoolId);
      fetchSchoolStudents(formData.schoolId);
    }
  }, [formData.schoolId]);

  const fetchUserData = async () => {
    try {
      setLoadingData(true);
      setError('');
      const response = await api.get(`/users/${id}`);
      const user = response?.data;
      if (!user) {
        setError('Kh么ng t岷 膽瓢峄 th么ng tin ng瓢峄漣 d霉ng');
        setLoadingData(false);
        return;
      }

      const schoolId = user.school?.id;
      if (schoolId) {
        try {
          const rolesRes = await api.get(`/roles/school/${schoolId}`);
          let allRoles = rolesRes.data.roles || [];
          if (isSchoolAdmin) {
            allRoles = (allRoles || []).filter(r => isAllowedRoleForSchoolAdmin(r?.name));
          }
          setRoles(allRoles);
        } catch (_) { }
      }

      let classId = '';
      if (user.role?.name?.toUpperCase()?.startsWith('STUDENT')) {
        try {
          const enrollmentResponse = await api.get(`/users/${id}/enrollment`);
          const enrollment = enrollmentResponse?.data?.enrollment ?? enrollmentResponse?.data?.enrollments?.[0];
          if (enrollment?.classId) classId = String(enrollment.classId);
        } catch (_) { }
      }

      let studentIds = [];
      if (user.role?.name?.toUpperCase()?.includes('PARENT')) {
        try {
          const res = await api.get(`/users/${id}/parent-students`);
          studentIds = (res.data.studentIds || []).map(String);
        } catch (_) { }
      }

      let subjectIds = [];
      if (isRoleTeacher(user.role?.name)) {
        try {
          const res = await api.get(`/users/${id}/teacher-subjects`);
          subjectIds = (res.data.subjectIds || []).map(String);
        } catch (_) { }
      }

      setFormData({
        email: user.email || '',
        fullName: user.fullName || '',
        password: '',
        confirmPassword: '',
        roleId: user.role?.id != null ? String(user.role.id) : '',
        schoolId: schoolId != null ? String(schoolId) : '',
        classId,
        studentIds,
        subjectIds,
        dateOfBirth: user.dateOfBirth ? (typeof user.dateOfBirth === 'string' ? user.dateOfBirth : user.dateOfBirth.toString?.() ?? '') : '',
        gender: user.gender || '',
        phone: user.phone || '',
        department: user.department || '',
        relationship: user.relationship || '',
        status: user.status || 'ACTIVE'
      });
    } catch (err) {
      setError('Kh么ng t岷 膽瓢峄 th么ng tin ng瓢峄漣 d霉ng');
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const isRoleTeacher = (name) => {
    const u = (name || '').toUpperCase();
    return u.includes('TEACHER') || u.includes('GI脕O VI脢N') || u.includes('GIAO VIEN') || u.includes('GV');
  };
  const isRoleStudent = (name) => {
    const u = (name || '').toUpperCase();
    return u.startsWith('STUDENT') || u.includes('H峄孋 SINH') || u.includes('HOC SINH');
  };
  const isRoleParent = (name) => {
    const u = (name || '').toUpperCase();
    return u.includes('PARENT') || u.includes('PH峄?HUYNH') || u.includes('PHU HUYNH');
  };
  const isAllowedRoleForSchoolAdmin = (roleName) => {
    return isRoleStudent(roleName) || isRoleTeacher(roleName) || isRoleParent(roleName);
  };

  const fetchRolesForSchool = async (schoolId) => {
    try {
      setLoadingRoles(true);
      const res = await api.get(`/roles/school/${schoolId}`);
      let allRoles = res.data.roles || [];
      if (isSchoolAdmin) {
        allRoles = (allRoles || []).filter(r => isAllowedRoleForSchoolAdmin(r?.name));
      }
      setRoles(allRoles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchClassesForSchool = async (schoolId) => {
    try {
      const res = await api.get('/classes');
      const all = res.data.classes || [];
      setClasses(all.filter(cls => (cls.school?.id || cls.school_id) === parseInt(schoolId)));
    } catch (err) {
      setClasses([]);
    }
  };

  const fetchSubjectsForSchool = async (schoolId) => {
    try {
      const res = await api.get(`/subjects/school/${schoolId}`);
      setSubjects(res.data.subjects || res.data || []);
    } catch (err) {
      setSubjects([]);
    }
  };

  const fetchSchoolStudents = async (schoolId) => {
    try {
      const headers = isAdmin ? { 'X-User-Role': 'ADMIN' } : {};
      const res = await api.get(`/users?userRole=ADMIN&schoolId=${schoolId}`, { headers });
      const all = res.data.users || [];
      setSchoolStudents(all.filter(u => (u.role?.name || '').toUpperCase().includes('STUDENT')));
    } catch (err) {
      setSchoolStudents([]);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data.schools || []);
    } catch (err) {
      setError('Kh么ng t岷 膽瓢峄 danh s谩ch tr瓢峄漬g');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const currentRoleId = String(formData.roleId ?? '');
    if (name === 'roleId' && isAdmin && currentRoleId !== '' && String(value) !== currentRoleId) {
      setPendingRoleId(value);
      setShowRoleChangeConfirm(true);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const confirmRoleChange = () => {
    if (pendingRoleId) {
      setFormData(prev => ({ ...prev, roleId: pendingRoleId }));
      setPendingRoleId(null);
    }
    setShowRoleChangeConfirm(false);
  };

  const toggleStudentId = (studentId) => {
    setFormData(prev => {
      const ids = prev.studentIds || [];
      const key = String(studentId);
      const next = ids.includes(key) ? ids.filter(i => i !== key) : [...ids, key];
      return { ...prev, studentIds: next };
    });
  };

  const toggleSubjectId = (subjectId) => {
    setFormData(prev => {
      const ids = prev.subjectIds || [];
      const key = String(subjectId);
      const next = ids.includes(key) ? ids.filter(i => i !== key) : [...ids, key];
      return { ...prev, subjectIds: next };
    });
  };

  const validateForm = () => {
    if (!formData.email) { setError('Email l脿 b岷痶 bu峄檆'); return false; }
    if (!formData.fullName) { setError('H峄?t锚n l脿 b岷痶 bu峄檆'); return false; }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('M岷璽 kh岷﹗ x谩c nh岷璶 kh么ng kh峄沺'); return false;
    }
    if (!formData.roleId) { setError('Vai tr貌 l脿 b岷痶 bu峄檆'); return false; }
    if (!formData.schoolId) { setError('Tr瓢峄漬g l脿 b岷痶 bu峄檆'); return false; }
    const selectedRole = roles.find(r => r.id === parseInt(formData.roleId, 10) || r.id === formData.roleId);
    if (isSchoolAdmin && !isAllowedRoleForSchoolAdmin(selectedRole?.name)) {
      setError('Admin ch峄?膽瓢峄 g谩n vai tr貌: Ph峄?huynh / H峄峜 sinh / Gi谩o vi锚n');
      return false;
    }
    if (isRoleStudent(selectedRole?.name) && !formData.classId) {
      setError('H峄峜 sinh b岷痶 bu峄檆 ph岷 ch峄峮 l峄沺'); return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setError('');
      const roleIdNum = parseInt(formData.roleId, 10);
      const schoolIdNum = parseInt(formData.schoolId, 10);
      if (Number.isNaN(roleIdNum) || Number.isNaN(schoolIdNum)) {
        setError('Vai trò và tr??ng kh?ng h?p l?');
        setLoading(false);
        return;
      }
      const userData = {
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        roleId: roleIdNum,
        schoolId: schoolIdNum,
        status: formData.status || 'ACTIVE'
      };
      if (formData.password && formData.password.trim()) userData.password = formData.password;
      if (formData.dateOfBirth && formData.dateOfBirth.trim()) userData.dateOfBirth = formData.dateOfBirth;
      if (formData.gender && formData.gender.trim()) userData.gender = formData.gender.trim();
      if (formData.phone != null && String(formData.phone).trim()) userData.phone = String(formData.phone).trim();
      if (formData.department != null && String(formData.department).trim()) userData.department = String(formData.department).trim();
      if (formData.relationship != null && String(formData.relationship).trim()) userData.relationship = String(formData.relationship).trim();

      const selectedRole = roles.find(r => r.id === roleIdNum || r.id === parseInt(formData.roleId, 10));
      const isStudent = isRoleStudent(selectedRole?.name);
      const isParent = isRoleParent(selectedRole?.name);
      const isTeacher = isRoleTeacher(selectedRole?.name);

      if (isStudent && formData.classId) {
        const classIdNum = parseInt(formData.classId, 10);
        if (!Number.isNaN(classIdNum)) userData.classId = classIdNum;
      }
      if (isParent && Array.isArray(formData.studentIds)) userData.studentIds = formData.studentIds.map(Number).filter(n => !Number.isNaN(n));
      if (isTeacher) {
        userData.subjectIds = Array.isArray(formData.subjectIds) ? formData.subjectIds.map(Number).filter(n => !Number.isNaN(n)) : [];
      }

      await api.put(`/users/${id}`, userData);
      setSuccess('C岷璸 nh岷璽 ng瓢峄漣 d霉ng th脿nh c么ng!');
      setTimeout(() => navigate('/users'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'C岷璸 nh岷璽 th岷 b岷');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const selectedRole = roles.find(r => r.id === parseInt(formData.roleId, 10) || r.id === formData.roleId);
  const isStudent = isRoleStudent(selectedRole?.name);
  const isParent = isRoleParent(selectedRole?.name);
  const isTeacher = isRoleTeacher(selectedRole?.name);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ch峄塶h s峄璦 ng瓢峄漣 d霉ng</h1>
        <p className="mt-1 text-sm text-gray-500">C岷璸 nh岷璽 th么ng tin theo t峄玭g vai tr貌 (h峄峜 sinh / ph峄?huynh / gi谩o vi锚n).</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>
      )}

      {showRoleChangeConfirm && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="text-amber-800 font-medium">膼峄昳 vai tr貌?</p>
          <p className="text-amber-700 text-sm mt-1">Khi l瓢u form: d峄?li峄噓 c农 (l峄沺 h峄峜, danh s谩ch con, b峄?m么n) s岷?膽瓢峄 x峄?l媒 t峄?膽峄檔g theo vai tr貌 m峄沬.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={confirmRoleChange} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm font-medium">X谩c nh岷璶 膽峄昳 vai tr貌</button>
            <button type="button" onClick={() => { setPendingRoleId(null); setShowRoleChangeConfirm(false); }} className="px-3 py-1.5 border border-gray-300 rounded text-sm">H峄 (gi峄?vai tr貌 c农)</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">H峄?t锚n *</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">M岷璽 kh岷﹗ m峄沬 (膽峄?tr峄憂g n岷縰 gi峄?nguy锚n)</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">X谩c nh岷璶 m岷璽 kh岷﹗ m峄沬</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tr瓢峄漬g</label>
            <input type="text" value={schools.find(s => s.id === parseInt(formData.schoolId))?.name || 'Không có'} disabled className="mt-1 block w-full border border-gray-300 rounded-md bg-gray-100 sm:text-sm" readOnly />
            <input type="hidden" name="schoolId" value={formData.schoolId} />
          </div>

          {/* Vai tr貌 鈥?Admin c贸 th峄?膽峄昳 (popup x谩c nh岷璶 khi 膽峄昳) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Vai tr貌 *</label>
            {isAdmin ? (
              <>
                <select
                  name="roleId"
                  value={formData.roleId != null && formData.roleId !== '' ? String(formData.roleId) : ''}
                  onChange={handleChange}
                  disabled={loadingRoles}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  required
                >
                  <option value="">{loadingRoles ? '膼ang t岷...' : 'Ch峄峮 vai tr貌'}</option>
                  {roles.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.name} - {r.description}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">B岷 c贸 th峄?膽峄昳 vai tr貌 (H峄峜 sinh / Gi谩o vi锚n / Ph峄?huynh). Khi l瓢u, d峄?li峄噓 c农 s岷?膽瓢峄 x峄?l媒 t峄?膽峄檔g.</p>
              </>
            ) : (
              <>
                <input type="text" value={selectedRole ? `${selectedRole.name} - ${selectedRole.description}` : 'Không có'} disabled className="mt-1 block w-full border border-gray-300 rounded-md bg-gray-100 sm:text-sm" />
                <p className="text-xs text-gray-500 mt-1">Ch峄?Admin m峄沬 c贸 th峄?膽峄昳 vai tr貌.</p>
              </>
            )}
          </div>

          {/* STUDENT: L峄沺 b岷痶 bu峄檆 */}
          {isStudent && formData.schoolId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">L峄沺 *</label>
              <select name="classId" value={formData.classId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" required>
                <option value="">Ch峄峮 l峄沺</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {typeof cls.schoolYear === 'object' && cls.schoolYear != null ? (cls.schoolYear?.name ?? '') : (cls.schoolYear ?? '')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PARENT: Danh s谩ch h峄峜 sinh (multi-select) */}
          {isParent && formData.schoolId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Danh s谩ch con (h峄峜 sinh)</label>
              <div className="mt-1 border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {schoolStudents.length === 0 ? (
                  <p className="text-sm text-gray-500">Ch瓢a c贸 h峄峜 sinh n脿o trong tr瓢峄漬g.</p>
                ) : (
                  schoolStudents.map(s => (
                    <label key={s.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded px-2 -mx-2">
                      <input type="checkbox" checked={(formData.studentIds || []).includes(String(s.id))} onChange={() => toggleStudentId(s.id)} className="rounded border-gray-300 text-blue-600" />
                      <span className="text-sm">{s.fullName || s.email} ({s.email})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TEACHER: B峄?m么n (multi-select) */}
          {isTeacher && formData.schoolId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">B峄?m么n</label>
              <div className="mt-1 border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-500">Ch瓢a c贸 m么n n脿o trong tr瓢峄漬g.</p>
                ) : (
                  subjects.map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded px-2 -mx-2">
                      <input type="checkbox" checked={(formData.subjectIds || []).includes(String(sub.id))} onChange={() => toggleSubjectId(sub.id)} className="rounded border-gray-300 text-blue-600" />
                      <span className="text-sm">{sub.name} {sub.code ? `(${sub.code})` : ''}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Th么ng tin c谩 nh芒n chung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ng脿y sinh</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gi峄沬 t铆nh</label>
              <input type="text" name="gender" value={formData.gender} onChange={handleChange} placeholder="Nam/N峄?kh谩c" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">S膼T</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>
            {isTeacher && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Ph貌ng ban</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              </div>
            )}
            {isParent && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Quan h峄?v峄沬 con</label>
                <input type="text" name="relationship" value={formData.relationship} onChange={handleChange} placeholder="Cha/M岷?..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tr岷g th谩i</label>
            <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm">
              <option value="ACTIVE">Ho岷 膽峄檔g</option>
              <option value="INACTIVE">Kh么ng ho岷 膽峄檔g</option>
              <option value="SUSPENDED">T岷 kh贸a</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/users')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            H峄
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? '膼ang l瓢u...' : 'C岷璸 nh岷璽'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditPage;



