import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './RecordListPage.css';
import { useAuth } from '../../contexts/AuthContext';

const RecordListPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    value: '',
    note: '',
    status: 'ACTIVE',
    schoolId: '',
    classId: '',
    studentId: '',
    subjectId: '',
    actorId: ''
  });

  const recordTypes = [
    { value: 'EXAM', label: 'Điểm thi' },
    { value: 'ATTENDANCE', label: 'Điểm danh' },
    { value: 'BEHAVIOR', label: 'Hạnh kiểm' },
    { value: 'HOMEWORK', label: 'Bài tập về nhà' },
    { value: 'PARTICIPATION', label: 'Tham gia' }
  ];

  const recordStatuses = [
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'INACTIVE', label: 'Không hoạt động' },
    { value: 'PENDING', label: 'Chờ duyệt' }
  ];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      const isStudent = userRole === 'STUDENT';

      // Fetch data with filtering for admin and student
      const promises = [
        api.get('/records'),
        api.get('/schools'),
        api.get('/classes'),
        api.get('/subjects')
      ];

      // Only fetch users if not student (to avoid 403 error)
      if (!isStudent) {
        let url = '/users';
        if (userRole === 'ADMIN' && schoolId) {
          url += `?userRole=ADMIN&schoolId=${schoolId}`;
        }
        promises.push(api.get(url));
      }

      const results = await Promise.all(promises);
      const recordsRes = results[0];
      const schoolsRes = results[1];
      const classesRes = results[2];
      const subjectsRes = results[3];
      const usersRes = !isStudent ? results[4] : { data: { users: [] } };

      // Filter records for admin and student - only show records from their own school
      let allRecords = recordsRes.data.records || [];
      if ((userRole === 'ADMIN' || userRole === 'STUDENT') && schoolId) {
        allRecords = allRecords.filter(record => {
          const recordSchoolId = record.student?.school?.id || record.school?.id;
          return recordSchoolId === schoolId;
        });
      }

      // For students, only show their own records
      if (isStudent && user?.id) {
        allRecords = allRecords.filter(record => record.student?.id === user.id);
      }

      setRecords(allRecords);

      // Filter schools for admin - only show their own school
      let allSchools = schoolsRes.data.schools || [];
      if (userRole === 'ADMIN' && schoolId) {
        allSchools = allSchools.filter(school => school.id === schoolId);
      }
      setSchools(allSchools);

      // Filter classes for admin - only show classes from their own school
      let allClasses = classesRes.data.classes || [];
      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter(cls => cls.school?.id === schoolId);
      }
      setClasses(allClasses);

      // Filter subjects for admin - only show subjects from their own school
      let allSubjects = subjectsRes.data.subjects || [];
      if (userRole === 'ADMIN' && schoolId) {
        allSubjects = allSubjects.filter(subject => subject.school?.id === schoolId);
      }
      setSubjects(allSubjects);

      // Filter students and actors from users
      const allUsers = usersRes.data.users || [];

      let studentUsers = [];
      let actorUsers = [];

      if (isStudent) {
        // For students, just set empty arrays
        studentUsers = [];
        actorUsers = [];
      } else {
        studentUsers = allUsers.filter(user => {
          const roleName = user.role?.name?.toUpperCase();
          return roleName === 'STUDENT' || roleName?.startsWith('STUDENT');
        });
        if (userRole === 'ADMIN' && schoolId) {
          studentUsers = studentUsers.filter(student => student.school?.id === schoolId);
        }

        actorUsers = allUsers.filter(user => {
          const roleName = user.role?.name?.toUpperCase();
          return roleName === 'TEACHER' || roleName?.startsWith('TEACHER') ||
            roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
        });
        if (userRole === 'ADMIN' && schoolId) {
          actorUsers = actorUsers.filter(actor => actor.school?.id === schoolId);
        }
      }

      setStudents(studentUsers);
      setActors(actorUsers);
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
        value: formData.value ? parseFloat(formData.value) : null,
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : null,
        classId: formData.classId ? parseInt(formData.classId) : null,
        studentId: formData.studentId ? parseInt(formData.studentId) : null,
        subjectId: formData.subjectId ? parseInt(formData.subjectId) : null,
        actorId: formData.actorId ? parseInt(formData.actorId) : null
      };

      if (editingRecord) {
        await api.put(`/records/${editingRecord.id}`, submitData);
      } else {
        await api.post('/records', submitData);
      }

      setShowModal(false);
      setEditingRecord(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      type: record.type || '',
      value: record.value?.toString() || '',
      note: record.note || '',
      status: record.status || 'ACTIVE',
      schoolId: record.school?.id?.toString() || '',
      classId: record.classEntity?.id?.toString() || '',
      studentId: record.student?.id?.toString() || '',
      subjectId: record.subject?.id?.toString() || '',
      actorId: record.actor?.id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hồ sơ này?')) {
      try {
        await api.delete(`/records/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const resetForm = () => {
    const defaultSchoolId = user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id
      ? user.school.id.toString()
      : '';
    setFormData({
      type: '',
      value: '',
      note: '',
      status: 'ACTIVE',
      schoolId: defaultSchoolId,
      classId: '',
      studentId: '',
      subjectId: '',
      actorId: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    resetForm();
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  };

  const getClassName = (classId) => {
    const classEntity = classes.find(c => c.id === classId);
    return classEntity ? classEntity.name : 'N/A';
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.fullName : 'N/A';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'N/A';
  };

  const getActorName = (actorId) => {
    const actor = actors.find(a => a.id === actorId);
    return actor ? actor.fullName : 'N/A';
  };

  const getTypeLabel = (type) => {
    const typeObj = recordTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getStatusLabel = (status) => {
    const statusObj = recordStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isStudent = user?.role?.name?.toUpperCase() === 'STUDENT';

  return (
    <div className="record-list-page">
      <div className="common-page-header">
        <h1>{isStudent ? 'Xem điểm và nhận xét' : 'Quản lý Hồ sơ Học sinh'}</h1>
        {!isStudent && (
          <button
            onClick={() => {
              const defaultSchoolId = user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id
                ? user.school.id.toString()
                : '';
              setFormData({
                type: '',
                value: '',
                note: '',
                status: 'ACTIVE',
                schoolId: defaultSchoolId,
                classId: '',
                studentId: '',
                subjectId: '',
                actorId: ''
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            Thêm Hồ sơ
          </button>
        )}
      </div>

      <div className="common-table-container" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <ul className="divide-y divide-gray-200">
          {records.map((record) => (
            <li key={record.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {getTypeLabel(record.type)} - {record.value !== null ? record.value : 'N/A'}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          record.status === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {getStatusLabel(record.status)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex text-sm text-gray-500">
                      <p className="mr-4">
                        <span className="font-medium">Trường:</span> {getSchoolName(record.school?.id)}
                      </p>
                      <p className="mr-4">
                        <span className="font-medium">Lớp:</span> {getClassName(record.classEntity?.id)}
                      </p>
                      <p className="mr-4">
                        <span className="font-medium">Học sinh:</span> {getStudentName(record.student?.id)}
                      </p>
                    </div>
                    <div className="flex text-sm text-gray-500 mt-1">
                      <p className="mr-4">
                        <span className="font-medium">Môn học:</span> {getSubjectName(record.subject?.id)}
                      </p>
                      <p className="mr-4">
                        <span className="font-medium">Người thực hiện:</span> {getActorName(record.actor?.id)}
                      </p>
                      <p className="mr-4">
                        <span className="font-medium">Ngày:</span> {record.date ? new Date(record.date).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                    {record.note && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Ghi chú:</span> {record.note}
                      </p>
                    )}
                  </div>
                </div>
                {!isStudent && (
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(record)}
                      className="btn btn-sm btn-secondary"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && !isStudent && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingRecord ? 'Sửa Hồ sơ' : 'Thêm Hồ sơ'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Loại hồ sơ</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">Chọn loại hồ sơ</option>
                  {recordTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Giá trị</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Nhập giá trị (điểm số, v.v.)"
                />
              </div>

              <div className="common-form-group">
                <label>Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows="3"
                  placeholder="Nhập ghi chú"
                />
              </div>

              <div className="common-form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {recordStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Trường học</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  disabled={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id}
                  style={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Chọn trường học</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Lớp học</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Chọn lớp học</option>
                  {classes.map(classEntity => (
                    <option key={classEntity.id} value={classEntity.id}>{classEntity.name}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Học sinh</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                >
                  <option value="">Chọn học sinh</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Môn học</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">Chọn môn học</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div className="common-form-group">
                <label>Người thực hiện</label>
                <select
                  value={formData.actorId}
                  onChange={(e) => setFormData({ ...formData, actorId: e.target.value })}
                >
                  <option value="">Chọn người thực hiện</option>
                  {actors.map(actor => (
                    <option key={actor.id} value={actor.id}>{actor.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="common-modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingRecord ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordListPage;
