import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ClassListPage.css';
import { useAuth } from '../contexts/AuthContext';

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
    room: '' // Phòng học cố định
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
      console.log('📋 Classes data:', allClasses);
      if (allClasses.length > 0) {
        console.log('📋 First class:', allClasses[0]);
        console.log('📋 First class room:', allClasses[0].room);
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
            return roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIÁO VIÊN';
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
        room: formData.room || null // Đảm bảo gửi room (có thể null)
      };

      console.log('📤 Submitting class data:', submitData);
      console.log('📤 Room value:', submitData.room);

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
        alert('Bạn không có quyền thêm/sửa lớp học');
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
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      try {
        const headers = {
          'X-User-Role': user?.role?.name || ''
        };
        await api.delete(`/classes/${id}`, { headers });
        fetchData();
      } catch (error) {
        console.error('Error deleting class:', error);
        if (error.response?.status === 403) {
          alert('Bạn không có quyền xóa lớp học');
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
    return school ? school.name : 'N/A';
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.fullName : 'N/A';
  };

  if (loading) {
    return (
      <div className="class-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const isTeacher = userRole === 'TEACHER';
  const isAdmin = userRole === 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const canManageClasses = isAdmin || isSuperAdmin; // Chỉ ADMIN và SUPER_ADMIN mới có thể quản lý lớp

  return (
    <div className="class-list-page">
      <div className="common-page-header">
        <h1>Quản lý lớp học</h1>
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
            Thêm lớp học
          </button>
        )}
      </div>

      <div className="common-table-container classes-table-container">
        <table className="common-table classes-table">
          <thead>
            <tr>
              <th>Tên lớp</th>
              <th>Khối</th>
              <th>Năm học</th>
              <th>Sĩ số</th>
              <th>Phòng học</th>
              <th>Trường</th>
              <th>GVCN</th>
              <th>Trạng thái</th>
              {canManageClasses && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => {
              // Debug: Log room value for each class
              if (!classItem.room) {
                console.log(`⚠️ Class ${classItem.name} (ID: ${classItem.id}) has no room field or room is empty`);
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
                    {classItem.room || 'Chưa có phòng'}
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
                        Sửa
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(classItem.id)}
                      >
                        Xóa
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
              <h2>{editingClass ? 'Sửa lớp học' : 'Thêm lớp học'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Tên lớp *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Khối *</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                  required
                >
                  <option value="">Chọn khối</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
              </div>
              <div className="common-form-group">
                <label>Năm học *</label>
                <input
                  type="text"
                  value={typeof formData.schoolYear === 'string' ? formData.schoolYear : (formData.schoolYear?.name ?? '')}
                  onChange={(e) => setFormData({...formData, schoolYear: e.target.value})}
                  placeholder="VD: 2024-2025"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Sĩ số *</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  min="1"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Phòng học</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  placeholder="VD: A101, B205"
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Phòng học cố định của lớp (tất cả các tiết học sẽ diễn ra tại phòng này)
                </small>
              </div>
              <div className="common-form-group">
                <label>Trường *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({...formData, schoolId: e.target.value, homeroomTeacherId: ''})}
                  disabled={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id}
                  required
                  style={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Chọn trường</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Giáo viên chủ nhiệm</label>
                <select
                  value={formData.homeroomTeacherId}
                  onChange={(e) => setFormData({...formData, homeroomTeacherId: e.target.value})}
                  disabled={!formData.schoolId}
                >
                  <option value="">{formData.schoolId ? "Chọn giáo viên" : "Chọn trường trước"}</option>
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
                <label>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Cập nhật' : 'Tạo mới'}
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