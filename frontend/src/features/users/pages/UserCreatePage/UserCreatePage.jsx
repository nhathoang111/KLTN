import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';

const UserCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
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
    subjectIds: [], // gi谩o vi锚n: nhi峄乽 m么n
    relationship: '',
    status: 'ACTIVE'
  });

  // Options for dropdowns
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    description: ''
  });
  const [creatingRole, setCreatingRole] = useState(false);

  useEffect(() => {
    fetchOptions();

    // Set default school for Admin users
    if (user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id) {
      setFormData(prev => ({
        ...prev,
        schoolId: user.school.id.toString()
      }));
    }
  }, []);

  // Fetch roles, classes, subjects, students khi school thay 膽峄昳
  useEffect(() => {
    if (formData.schoolId) {
      fetchRolesForSchool(formData.schoolId);
      fetchClassesForSchool(formData.schoolId);
      fetchSubjectsForSchool(formData.schoolId);
      fetchSchoolStudents(formData.schoolId);
    } else {
      fetchInitialRoles();
      setClasses([]);
      setSubjects([]);
      setSchoolStudents([]);
    }
  }, [formData.schoolId]);

  // Auto-select Admin role when roles are loaded for Super Admin
  useEffect(() => {
    if (user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' && formData.schoolId && roles.length > 0 && !formData.roleId) {
      const adminRole = roles.find(r => r.name?.toUpperCase() === 'ADMIN');
      if (adminRole) {
        setFormData(prev => ({
          ...prev,
          roleId: adminRole.id.toString()
        }));
      }
    }
  }, [roles, formData.schoolId, formData.roleId, user]);

  const fetchInitialRoles = async () => {
    try {
      // X谩c 膽峄媙h ph芒n quy峄乶 t峄?user context
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      // Fetch roles v峄沬 ph芒n quy峄乶
      let rolesUrl = '/roles';
      if (userRole === 'SUPER_ADMIN') {
        // Super Admin fetch all roles
        rolesUrl += '?userRole=SUPER_ADMIN';
      } else if (userRole === 'ADMIN' && schoolId) {
        rolesUrl += `?userRole=ADMIN&schoolId=${schoolId}`;
      } else {
        setError('Không có quyền truy cập.');
        return;
      }

      const rolesResponse = await api.get(rolesUrl);
      let allRoles = rolesResponse.data.roles || [];

      // For SUPER_ADMIN, only show ADMIN roles
      if (userRole === 'SUPER_ADMIN') {
        allRoles = allRoles.filter(role => {
          const roleName = role.name?.toUpperCase();
          return roleName === 'ADMIN' || roleName.startsWith('ADMIN_');
        });
      }

      // Filter roles for Admin users: show STUDENT, TEACHER, PARENT
      if (userRole === 'ADMIN') {
        allRoles = allRoles.filter(role => {
          const roleName = role.name?.toUpperCase();
          return roleName === 'STUDENT' || roleName === 'TEACHER' || roleName === 'PARENT' ||
            roleName?.startsWith('STUDENT') || roleName?.startsWith('TEACHER') || roleName?.startsWith('PARENT');
        });
      }

      setRoles(Array.isArray(allRoles) ? allRoles.filter(r => r != null && r.id != null) : []);
    } catch (err) {
      console.error('Error fetching initial roles:', err);
    }
  };

  const fetchRolesForSchool = async (schoolId) => {
    try {
      setLoadingRoles(true);
      const userRole = user?.role?.name?.toUpperCase();

      // For SUPER_ADMIN, fetch all roles for the specific school
      if (userRole === 'SUPER_ADMIN') {
        // Fetch roles for the specific school
        const rolesResponse = await api.get(`/roles/school/${schoolId}`);
        let allRoles = rolesResponse.data.roles || [];

        console.log('Super Admin - All roles for school:', allRoles);

        // No filter - show all roles of the school
        console.log('Super Admin - Roles to set (no filter):', allRoles);

        console.log('Super Admin - Final roles to set:', allRoles);
        setRoles(allRoles);
      } else {
        // For ADMIN, fetch roles for specific school
        const rolesResponse = await api.get(`/roles/school/${schoolId}`);
        let allRoles = rolesResponse.data.roles || [];

        // Filter roles for Admin users: only show STUDENT and TEACHER
        console.log('All roles before filter:', allRoles);
        if (userRole === 'ADMIN') {
          allRoles = (allRoles || []).filter(role => {
            const roleName = role?.name?.toUpperCase();
            return roleName === 'STUDENT' || roleName === 'TEACHER' || roleName === 'PARENT' ||
              roleName?.startsWith('STUDENT') || roleName?.startsWith('TEACHER') || roleName?.startsWith('PARENT');
          });
        }
        setRoles(Array.isArray(allRoles) ? allRoles.filter(r => r != null && r.id != null) : []);
      }

      // Clear role selection when school changes
      setFormData(prev => ({ ...prev, roleId: '' }));
    } catch (err) {
      console.error('Error fetching roles for school:', err);
      // Fallback to initial roles on error
      fetchInitialRoles();
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchClassesForSchool = async (schoolId) => {
    try {
      const response = await api.get(`/classes/school/${schoolId}`);
      setClasses(response.data.classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
    }
  };

  const fetchSchoolStudents = async (schoolId) => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const headers = userRole === 'ADMIN' ? { 'X-User-Role': 'ADMIN' } : {};
      const response = await api.get(`/users?userRole=ADMIN&schoolId=${schoolId}`, { headers });
      const all = response.data.users || [];
      const students = all.filter(u => {
        const r = (u.role?.name || '').toUpperCase();
        return r.includes('STUDENT');
      });
      setSchoolStudents(students);
    } catch (err) {
      console.error('Error fetching students for school:', err);
      setSchoolStudents([]);
    }
  };

  const fetchSubjectsForSchool = async (schoolId) => {
    try {
      const response = await api.get(`/subjects/school/${schoolId}`);
      setSubjects(response.data.subjects || response.data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjects([]);
    }
  };

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);

      // Fetch initial roles
      await fetchInitialRoles();

      // Fetch schools
      const schoolsResponse = await api.get('/schools');
      setSchools(schoolsResponse.data.schools || []);

    } catch (err) {
      setError('Failed to load options');
      console.error('Error fetching options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'roleId') {
        next.studentIds = [];
        next.classId = '';
        next.subjectId = '';
        next.subjectIds = [];
      }
      return next;
    });
    if (error) setError('');
  };

  const toggleSubjectId = (id) => {
    setFormData(prev => {
      const arr = prev.subjectIds || [];
      const next = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
      return { ...prev, subjectIds: next };
    });
  };

  const toggleStudentId = (id) => {
    setFormData(prev => {
      const arr = prev.studentIds || [];
      const next = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
      return { ...prev, studentIds: next };
    });
  };

  const validateForm = () => {
    // Prevent form submission if currently creating new role
    if (showRoleModal) {
      setError('Vui l貌ng ho脿n t岷 vi峄嘽 t岷 role m峄沬 tr瓢峄沜 khi t岷 user');
      return false;
    }

    if (!formData.email) {
      setError('Email is required');
      return false;
    }
    if (!formData.fullName) {
      setError('Full name is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    // Validate role selection
    if (!formData.roleId) {
      setError('Role is required');
      return false;
    }
    // Super Admin c贸 th峄?t岷 user kh么ng thu峄檆 tr瓢峄漬g n脿o
    const userRole = user?.role?.name;
    if (!formData.schoolId && userRole !== 'SUPER_ADMIN') {
      setError('School is required');
      return false;
    }

    // Validate class selection for STUDENT role
    const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));
    const isStudent = selectedRole && (selectedRole.name?.toUpperCase() === 'STUDENT' || selectedRole.name?.toUpperCase().startsWith('STUDENT'));
    if (isStudent && !formData.classId) {
      setError('L峄沺 l脿 b岷痶 bu峄檆 khi t岷 h峄峜 sinh');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      // L岷 th么ng tin ph芒n quy峄乶 t峄?user context
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      const roleIdNum = formData.roleId !== '' && formData.roleId != null ? parseInt(formData.roleId, 10) : NaN;
      const schoolIdNum = formData.schoolId !== '' && formData.schoolId != null ? parseInt(formData.schoolId, 10) : NaN;
      if (!Number.isInteger(roleIdNum)) {
        setError('Vui l貌ng ch峄峮 vai tr貌');
        setLoading(false);
        return;
      }
      if (userRole === 'ADMIN' && !Number.isInteger(schoolIdNum) && !schoolId) {
        setError('Vui l貌ng ch峄峮 tr瓢峄漬g');
        setLoading(false);
        return;
      }

      // ADMIN b岷痶 bu峄檆 ph岷 c贸 schoolId trong body; d霉ng t峄?form ho岷穋 t峄?context
      const effectiveSchoolId = Number.isInteger(schoolIdNum) ? schoolIdNum : (userRole === 'ADMIN' && schoolId ? schoolId : null);
      const userData = {
        email: formData.email?.trim() || '',
        fullName: formData.fullName?.trim() || '',
        password: formData.password || '',
        roleId: roleIdNum,
        status: formData.status || 'ACTIVE'
      };
      if (effectiveSchoolId != null) {
        userData.schoolId = effectiveSchoolId;
      }

      // Th锚m classId (b岷痶 bu峄檆 cho h峄峜 sinh)
      const selectedRole = roles.find(r => r.id === roleIdNum || r.id === formData.roleId);
      const isStudent = selectedRole && (selectedRole.name?.toUpperCase() === 'STUDENT' || selectedRole.name?.toUpperCase().startsWith('STUDENT'));

      if (isStudent) {
        if (!formData.classId) {
          setError('L峄沺 l脿 b岷痶 bu峄檆 khi t岷 h峄峜 sinh');
          setLoading(false);
          return;
        }
        userData.classId = parseInt(formData.classId, 10);
      }
      const isParent = selectedRole && (selectedRole.name?.toUpperCase() === 'PARENT' || selectedRole.name?.toUpperCase().startsWith('PARENT'));
      if (isParent && Array.isArray(formData.studentIds) && formData.studentIds.length > 0) {
        userData.studentIds = formData.studentIds;
      }
      if (formData.dateOfBirth?.trim()) userData.dateOfBirth = formData.dateOfBirth.trim();
      if (formData.gender?.trim()) userData.gender = formData.gender.trim();
      if (formData.phone?.trim()) userData.phone = formData.phone.trim();
      if (formData.department?.trim()) userData.department = formData.department.trim();
      if (formData.relationship?.trim()) userData.relationship = formData.relationship.trim();
      const isTeacher = selectedRole && (selectedRole.name?.toUpperCase() === 'TEACHER' || selectedRole.name?.toUpperCase().startsWith('TEACHER'));
      if (isTeacher && Array.isArray(formData.subjectIds) && formData.subjectIds.length > 0) {
        userData.subjectIds = formData.subjectIds;
      }

      console.log('Creating user with data:', userData);

      // Th锚m th么ng tin ph芒n quy峄乶 v脿o request
      let url = '/users';
      if (userRole === 'SUPER_ADMIN') {
        url += '?currentUserRole=SUPER_ADMIN';
      } else if (userRole === 'ADMIN' && schoolId) {
        url += `?currentUserRole=ADMIN&currentUserSchoolId=${schoolId}`;
      } else {
        setError('Không có quyền truy cập.');
        return;
      }

      console.log('Posting to URL:', url);
      const response = await api.post(url, userData);
      console.log('User created successfully:', response.data);

      setSuccess('User created successfully!');
      setTimeout(() => {
        navigate('/users');
      }, 1500);

    } catch (err) {
      console.error('Error creating user:', err);
      const res = err.response?.data;
      if (res) console.warn('Server 400 response:', res);
      const errorMessage = res?.message || res?.error || 'T岷 ng瓢峄漣 d霉ng th岷 b岷';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.schoolId) {
      alert('Vui l貌ng ch峄峮 tr瓢峄漬g tr瓢峄沜');
      return;
    }

    if (!newRoleData.name) {
      alert('Vui l貌ng nh岷璸 t锚n role');
      return;
    }

    try {
      setCreatingRole(true);
      const response = await api.post('/roles', {
        name: newRoleData.name,
        description: newRoleData.description || '',
        schoolId: parseInt(formData.schoolId)
      });

      console.log('Create role response:', response.data);

      // Get the created role from response
      let createdRole = response.data.role;
      if (!createdRole && response.data) {
        // Try to find role in response data
        createdRole = response.data;
      }

      console.log('Created role:', createdRole);

      if (!createdRole || !createdRole.id) {
        alert('T岷 role th脿nh c么ng nh瓢ng kh么ng th峄?l岷 ID c峄 role. Vui l貌ng t岷 l岷 trang.');
        setShowRoleModal(false);
        setNewRoleData({ name: '', description: '' });
        // Refresh the page
        window.location.reload();
        return;
      }

      // Add the new role to the roles list immediately
      const newRole = {
        id: createdRole.id,
        name: newRoleData.name,
        description: newRoleData.description || '',
        school: { id: parseInt(formData.schoolId) }
      };

      setRoles(prev => [...prev, newRole]);

      // Auto-select the newly created role
      setFormData(prev => ({
        ...prev,
        roleId: createdRole.id.toString()
      }));

      // Close modal and reset form
      setShowRoleModal(false);
      setNewRoleData({ name: '', description: '' });

      alert('T岷 role th脿nh c么ng v脿 膽茫 t峄?膽峄檔g ch峄峮!');
    } catch (err) {
      console.error('Error creating role:', err);

      // Check if it's a duplicate error
      const errorMessage = err.response?.data?.error || '';
      const isDuplicateError = errorMessage.includes('Duplicate entry') || errorMessage.includes('already exists');

      if (isDuplicateError) {
        // Try to fetch the existing role and auto-select it
        try {
          console.log('Role already exists, fetching existing role...');

          // Try to fetch roles for the specific school
          const rolesRes = await api.get(`/roles/school/${formData.schoolId}`);
          const allRoles = rolesRes.data.roles || [];

          // Find the existing role by name
          const existingRole = allRoles.find(role =>
            role.name?.toUpperCase() === newRoleData.name.toUpperCase()
          );

          if (existingRole) {
            console.log('Found existing role:', existingRole);

            // Add to roles list if not already there
            setRoles(prev => {
              const alreadyExists = prev.find(r => r.id === existingRole.id);
              if (alreadyExists) return prev;
              return [...prev, existingRole];
            });

            // Auto-select the existing role
            setFormData(prev => ({
              ...prev,
              roleId: existingRole.id.toString()
            }));

            // Close modal and reset form
            setShowRoleModal(false);
            setNewRoleData({ name: '', description: '' });

            alert(`Role "${newRoleData.name}" 膽茫 t峄搉 t岷 v脿 膽茫 膽瓢峄 t峄?膽峄檔g ch峄峮!`);
          } else {
            alert(`Role "${newRoleData.name}" 膽茫 t峄搉 t岷 trong h峄?th峄憂g.`);
          }
        } catch (fetchErr) {
          console.error('Error fetching existing role:', fetchErr);
          alert(`Role "${newRoleData.name}" 膽茫 t峄搉 t岷 trong h峄?th峄憂g.`);
        }
      } else {
        alert(errorMessage || 'Kh么ng th峄?t岷 role');
      }
    } finally {
      setCreatingRole(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new user to the system with appropriate role and school assignment.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-6">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* H峄?t锚n */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                H峄?t锚n *
              </label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="John Doe"
                required
              />
            </div>

            {/* M岷璽 kh岷﹗ */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                M岷璽 kh岷﹗ *
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter password"
                required
              />
            </div>

            {/* X谩c nh岷璶 m岷璽 kh岷﹗ */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                X谩c nh岷璶 m岷璽 kh岷﹗ *
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm password"
                required
              />
            </div>

            {/* Tr瓢峄漬g */}
            <div>
              <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
                Tr瓢峄漬g *
              </label>
              <select
                name="schoolId"
                id="schoolId"
                value={formData.schoolId}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                disabled={user?.role?.name?.toUpperCase() === 'ADMIN'}
              >
                <option value="">Select a school</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Vai tr貌 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">
                  Vai tr貌 *
                </label>
                {formData.schoolId && user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(true)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-medium shadow-sm"
                  >
                    + Th锚m role
                  </button>
                )}
              </div>

              {!showRoleModal && (
                <>
                  {roles.length === 0 ? (
                    <div className="mt-1 block w-full border-2 border-yellow-400 rounded-md p-4 bg-yellow-50">
                      <p className="text-sm text-yellow-800">
                        鈿狅笍 Kh么ng c贸 role ph霉 h峄 cho tr瓢峄漬g n脿y.
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {user?.role?.name?.toUpperCase() === 'SUPER_ADMIN'
                          ? 'Vui l貌ng click n煤t "+ Th锚m role" b锚n tr锚n 膽峄?t岷 role ADMIN'
                          : 'Vui l貌ng click n煤t "+ Th锚m role" b锚n tr锚n 膽峄?t岷 role STUDENT, TEACHER'
                        }
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        name="roleId"
                        id="roleId"
                        value={formData.roleId != null && formData.roleId !== '' ? String(formData.roleId) : ''}
                        onChange={handleChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        required
                        disabled={loadingRoles}
                      >
                        <option value="">{loadingRoles ? '膼ang t岷...' : 'Ch峄峮 vai tr貌'}</option>
                        {roles.map(role => (
                          <option key={role.id} value={String(role.id)}>
                            {role.name || ''} {role.description ? `- ${role.description}` : ''}
                          </option>
                        ))}
                      </select>
                      {roles.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {roles.length} role(s) available
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Show add role form inline - Only for SUPER_ADMIN */}
              {showRoleModal && formData.schoolId && user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' && (
                <div className="mt-4 border border-gray-300 rounded-md p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">Th锚m role m峄沬</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleModal(false);
                        setNewRoleData({ name: '', description: '' });
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      脳
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        T锚n role *
                      </label>
                      <input
                        type="text"
                        value={newRoleData.name}
                        onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="VD: ADMIN, TEACHER, STUDENT"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        M么 t岷?
                      </label>
                      <textarea
                        value={newRoleData.description}
                        onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        rows="2"
                        placeholder="M么 t岷?role"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={handleCreateRole}
                        disabled={creatingRole}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingRole ? '膼ang t岷...' : 'T岷 role'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tr岷g th谩i */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Tr岷g th谩i
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="ACTIVE">膼ang ho岷 膽峄檔g</option>
                <option value="INACTIVE">Ng瓢ng ho岷 膽峄檔g</option>
                <option value="SUSPENDED">B峄?kh贸a</option>
              </select>
            </div>

            {/* ========== Field ri锚ng theo role ========== */}
            {/* 馃鈥嶐煄?STUDENT: M茫 l峄沺, Ng脿y sinh, Gi峄沬 t铆nh */}
            {(() => {
              const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));
              const isStudent = selectedRole && (selectedRole.name?.toUpperCase() === 'STUDENT' || selectedRole.name?.toUpperCase().startsWith('STUDENT'));
              if (!isStudent || !formData.schoolId) return null;
              return (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">馃鈥嶐煄?H峄峜 sinh</h4>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="classId" className="block text-sm font-medium text-gray-700">M茫 l峄沺 *</label>
                      <select
                        name="classId"
                        id="classId"
                        value={formData.classId}
                        onChange={handleChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      >
                        <option value="">Ch峄峮 l峄沺</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} - {typeof cls.schoolYear === 'string' ? cls.schoolYear : (cls.schoolYear?.name ?? '')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Ng脿y sinh (t霉y ch峄峮)</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        id="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gi峄沬 t铆nh (t霉y ch峄峮)</label>
                      <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="">-- Ch峄峮 --</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">N峄?</option>
                        <option value="OTHER">Kh谩c</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 馃懇鈥嶐煆?TEACHER: B峄?m么n (nhi峄乽 m么n), S膼T, Ph貌ng ban */}
            {(() => {
              const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));
              const isTeacher = selectedRole && (selectedRole.name?.toUpperCase() === 'TEACHER' || selectedRole.name?.toUpperCase().startsWith('TEACHER'));
              if (!isTeacher || !formData.schoolId) return null;
              return (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">馃懇鈥嶐煆?Gi谩o vi锚n</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">B峄?m么n 鈥?膽谩nh d岷 tick ch峄峮 nhi峄乽 m么n</label>
                      <div className="mt-1 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                        {subjects.length === 0 ? (
                          <p className="text-sm text-gray-500">Ch瓢a c贸 m么n h峄峜 n脿o trong tr瓢峄漬g.</p>
                        ) : (
                          subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded px-2 -mx-2">
                              <input
                                type="checkbox"
                                checked={(formData.subjectIds || []).includes(s.id)}
                                onChange={() => toggleSubjectId(s.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{s.name || s.code}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {(formData.subjectIds || []).length > 0 && <p className="text-xs text-green-600 mt-1">膼茫 ch峄峮 {(formData.subjectIds || []).length} m么n</p>}
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">S峄?膽i峄噉 tho岷 (t霉y ch峄峮)</label>
                      <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} placeholder="0912345678" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">Ph貌ng ban (t霉y ch峄峮)</label>
                      <input type="text" name="department" id="department" value={formData.department} onChange={handleChange} placeholder="VD: T峄?To谩n" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 馃懆鈥嶐煈┾€嶐煈?PARENT: Danh s谩ch h峄峜 sinh, S膼T, Quan h峄?*/}
            {(() => {
              const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));
              const isParent = selectedRole && (selectedRole.name?.toUpperCase() === 'PARENT' || selectedRole.name?.toUpperCase().startsWith('PARENT'));
              if (!isParent || !formData.schoolId) return null;
              return (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">馃懆鈥嶐煈┾€嶐煈?Ph峄?huynh</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Danh s谩ch h峄峜 sinh (con) 鈥?膽谩nh d岷 tick ch峄峮 nhi峄乽 con</label>
                      <div className="mt-1 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                        {schoolStudents.length === 0 ? (
                          <p className="text-sm text-gray-500">Ch瓢a c贸 h峄峜 sinh n脿o trong tr瓢峄漬g.</p>
                        ) : (
                          schoolStudents.map(s => (
                            <label key={s.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded px-2 -mx-2">
                              <input
                                type="checkbox"
                                checked={(formData.studentIds || []).includes(s.id)}
                                onChange={() => toggleStudentId(s.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{s.fullName || s.email} ({s.email})</span>
                            </label>
                          ))
                        )}
                      </div>
                      {(formData.studentIds || []).length > 0 && <p className="text-xs text-green-600 mt-1">膼茫 ch峄峮 {(formData.studentIds || []).length} con</p>}
                    </div>
                    <div>
                      <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">S峄?膽i峄噉 tho岷 (t霉y ch峄峮)</label>
                      <input type="text" name="phone" id="parentPhone" value={formData.phone} onChange={handleChange} placeholder="0912345678" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label htmlFor="relationship" className="block text-sm font-medium text-gray-700">Quan h峄?(t霉y ch峄峮)</label>
                      <select name="relationship" id="relationship" value={formData.relationship} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="">-- Ch峄峮 --</option>
                        <option value="CHA">Cha</option>
                        <option value="ME">M岷?</option>
                        <option value="KHAC">Kh谩c</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserCreatePage;






