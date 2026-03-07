import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './ClassListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';

const ClassListPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    gradeLevel: '',
    schoolYear: '',
    capacity: '',
    status: 'ACTIVE',
    schoolId: '',
    homeroomTeacherId: '',
    room: '' // Ph貌ng h峄峜 c峄?膽峄媙h
  });

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

  const fetchData = async () => {
    try {
      const [classesRes, schoolsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/schools')
      ]);

      let allClasses = classesRes.data.classes || [];

      // Debug: Log class data to check room field
      console.log('馃搵 Classes data:', allClasses);
      if (allClasses.length > 0) {
        console.log('馃搵 First class:', allClasses[0]);
        console.log('馃搵 First class room:', allClasses[0].room);
      }

      // Filter for admin and teacher users
      const userRole = user?.role?.name?.toUpperCase();

      // Filter classes for admin - only show classes from their own school
      if (userRole === 'ADMIN' && user?.school?.id) {
        allClasses = allClasses.filter(cls => cls.school?.id === user.school.id);
      }

      // Filter classes for teacher - show all classes they teach (from schedules) + classes they are homeroom teacher for
      if (userRole === 'TEACHER' && user?.id) {
        try {
          // Fetch schedules for this teacher to get all classes they teach
          const schedulesRes = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesRes.data.schedules || [];

          // Get unique class IDs from schedules
          const taughtClassIds = new Set();
          teacherSchedules.forEach(schedule => {
            const classId = schedule.classEntity?.id || schedule.class_id;
            if (classId) {
              taughtClassIds.add(classId);
            }
          });

          console.log('Teacher schedules:', teacherSchedules.length);
          console.log('Classes taught by teacher (from schedules):', Array.from(taughtClassIds));

          // Filter classes: show classes they teach OR classes they are homeroom teacher for
          allClasses = allClasses.filter(cls => {
            const isSameSchool = cls.school?.id === user.school?.id;
            if (!isSameSchool) return false;

            // Check if teacher is homeroom teacher
            const homeroomTeacherId = cls.homeroomTeacher?.id || cls.homeroomTeacherId;
            const isHomeroomTeacher = homeroomTeacherId === user.id;

            // Check if teacher teaches this class (from schedules)
            const isTeachingClass = taughtClassIds.has(cls.id);

            return isHomeroomTeacher || isTeachingClass;
          });

          console.log('Filtered classes for teacher (all classes they teach):', allClasses.length);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // Fallback to homeroom teacher only if schedule fetch fails
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
            return roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GI脕O VI脢N';
          });
          console.log('All teachers loaded:', teacherUsers);
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
      const submitData = {
        ...formData,
        gradeLevel: parseInt(formData.gradeLevel),
        capacity: parseInt(formData.capacity),
        schoolId: parseInt(formData.schoolId),
        homeroomTeacherId: formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId) : null,
        room: formData.room || null // 膼岷 b岷 g峄璱 room (c贸 th峄?null)
      };

      console.log('馃摛 Submitting class data:', submitData);
      console.log('馃摛 Room value:', submitData.room);

      const headers = {
        'X-User-Role': user?.role?.name || ''
      };

      let response;
      if (editingClass) {
        response = await api.put(`/classes/${editingClass.id}`, submitData, { headers });
      } else {
        response = await api.post('/classes', submitData, { headers });
      }

      console.log('馃摜 Response from backend:', response.data);
      if (response.data.class) {
        console.log('馃摜 Created/Updated class room:', response.data.class.room);
      }

      setShowModal(false);
      setEditingClass(null);
      const userRole = user?.role?.name?.toUpperCase();
      const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
        ? user.school.id.toString()
        : '';
      setFormData({
        name: '',
        gradeLevel: '',
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
      if (error.response?.status === 403) {
        alert('B岷 kh么ng c贸 quy峄乶 th锚m/s峄璦 l峄沺 h峄峜');
      }
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    const userRole = user?.role?.name?.toUpperCase();
    const defaultSchoolId = (userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id
      ? user.school.id.toString()
      : classItem.school?.id?.toString() || '';
    setFormData({
      name: classItem.name || '',
      gradeLevel: classItem.gradeLevel?.toString() || '',
      schoolYear: (classItem.schoolYear && typeof classItem.schoolYear === 'object' ? classItem.schoolYear.name : classItem.schoolYear) || '',
      capacity: classItem.capacity?.toString() || '',
      status: classItem.status || 'ACTIVE',
      schoolId: defaultSchoolId,
      homeroomTeacherId: classItem.homeroomTeacher?.id?.toString() || '',
      room: classItem.room || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('B岷 c贸 ch岷痗 ch岷痭 mu峄憂 x贸a l峄沺 h峄峜 n脿y?')) {
      try {
        const headers = {
          'X-User-Role': user?.role?.name || ''
        };
        await api.delete(`/classes/${id}`, { headers });
        fetchData();
      } catch (error) {
        console.error('Error deleting class:', error);
        if (error.response?.status === 403) {
          alert('B岷 kh么ng c贸 quy峄乶 x贸a l峄沺 h峄峜');
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
      name: '',
      gradeLevel: '',
      schoolYear: '',
      capacity: '',
      status: 'ACTIVE',
      schoolId: defaultSchoolId,
      homeroomTeacherId: '',
      room: ''
    });
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Không có';
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.fullName : 'Không có';
  };

  if (loading) {
    return (
      <div className="class-list-page">
        <div className="loading">膼ang t岷...</div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const isTeacher = userRole === 'TEACHER';
  const isAdmin = userRole === 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const canManageClasses = isAdmin || isSuperAdmin; // Ch峄?ADMIN v脿 SUPER_ADMIN m峄沬 c贸 th峄?qu岷 l媒 l峄沺

  return (
    <div className="class-list-page">
      <div className="common-page-header">
        <h1>Qu岷 l媒 l峄沺 h峄峜</h1>
        {canManageClasses && (
          <button
            className="btn btn-primary"
            onClick={() => {
              const defaultSchoolId = (isAdmin || isTeacher) && user?.school?.id
                ? user.school.id.toString()
                : '';
              setFormData({
                name: '',
                gradeLevel: '',
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
            Th锚m l峄沺 h峄峜
          </button>
        )}
      </div>

      <div className="common-table-container classes-table-container">
        <table className="common-table classes-table">
          <thead>
            <tr>
              <th>T锚n l峄沺</th>
              <th>Kh峄慽</th>
              <th>N膬m h峄峜</th>
              <th>S末 s峄?</th>
              <th>Ph貌ng h峄峜</th>
              <th>Tr瓢峄漬g</th>
              <th>GVCN</th>
              <th>Tr岷g th谩i</th>
              {canManageClasses && <th>Thao t谩c</th>}
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => {
              // Debug: Log room value for each class
              if (!classItem.room) {
                console.log(`鈿狅笍 Class ${classItem.name} (ID: ${classItem.id}) has no room field or room is empty`);
                console.log('   Full classItem:', classItem);
              }

              return (
                <tr key={classItem.id}>
                  <td>{classItem.name}</td>
                  <td>{classItem.gradeLevel}</td>
                  <td>{classItem.schoolYear && typeof classItem.schoolYear === 'object' ? classItem.schoolYear.name : classItem.schoolYear}</td>
                  <td>{classItem.capacity}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: classItem.room ? '#e0f2fe' : '#fee2e2',
                      color: classItem.room ? '#0369a1' : '#991b1b',
                      borderRadius: '4px',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      {classItem.room || 'Ch瓢a c贸 ph貌ng'}
                    </span>
                  </td>
                  <td>{getSchoolName(classItem.school?.id)}</td>
                  <td>{getTeacherName(classItem.homeroomTeacher?.id)}</td>
                  <td>
                    <span className={`status-badge ${classItem.status?.toLowerCase()}`}>
                      {classItem.status}
                    </span>
                  </td>
                  {canManageClasses && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(classItem)}
                        >
                          S峄璦
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(classItem.id)}
                        >
                          X贸a
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingClass ? 'S峄璦 l峄沺 h峄峜' : 'Th锚m l峄沺 h峄峜'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>脳</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>T锚n l峄沺 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Kh峄慽 *</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  required
                >
                  <option value="">Ch峄峮 kh峄慽</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
              </div>
              <div className="common-form-group">
                <label>N膬m h峄峜 *</label>
                <input
                  type="text"
                  value={typeof formData.schoolYear === 'string' ? formData.schoolYear : (formData.schoolYear?.name ?? '')}
                  onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                  placeholder="VD: 2024-2025"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>S末 s峄?*</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Ph貌ng h峄峜</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="VD: A101, B205"
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Ph貌ng h峄峜 c峄?膽峄媙h c峄 l峄沺 (t岷 c岷?c谩c ti岷縯 h峄峜 s岷?di峄卬 ra t岷 ph貌ng n脿y)
                </small>
              </div>
              <div className="common-form-group">
                <label>Tr瓢峄漬g *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value, homeroomTeacherId: '' })}
                  disabled={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id}
                  required
                  style={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Ch峄峮 tr瓢峄漬g</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Gi谩o vi锚n ch峄?nhi峄噈</label>
                <select
                  value={formData.homeroomTeacherId}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                  disabled={!formData.schoolId}
                >
                  <option value="">{formData.schoolId ? "Ch峄峮 gi谩o vi锚n" : "Ch峄峮 tr瓢峄漬g tr瓢峄沜"}</option>
                  {teachers
                    .filter(teacher => teacher.school?.id === parseInt(formData.schoolId))
                    .map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Tr岷g th谩i</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">Ho岷 膽峄檔g</option>
                  <option value="INACTIVE">Kh么ng ho岷 膽峄檔g</option>
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  H峄
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'C岷璸 nh岷璽' : 'T岷 m峄沬'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassListPage;


