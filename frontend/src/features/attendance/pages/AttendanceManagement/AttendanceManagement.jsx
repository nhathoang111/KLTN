import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './AttendanceManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    status: 'PRESENT',
    note: ''
  });

  useEffect(() => {
    fetchAttendance();
    fetchStudents();
    fetchClasses();
  }, [user]);

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/attendance');
      let allAttendance = response.data.attendance || [];

      // Filter attendance for admin and teacher - only show attendance from their own school
      const userRole = user?.role?.name?.toUpperCase();
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id) {
        allAttendance = allAttendance.filter(att => att.student?.school?.id === user.school.id);
      }
      setAttendance(allAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      let url = '/users';
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
      }

      const response = await api.get(url);
      let allUsers = response.data.users || [];

      // Filter students and filter by admin/teacher's school
      let studentUsers = allUsers.filter(user => {
        const roleName = user.role?.name?.toUpperCase();
        return roleName === 'STUDENT' || roleName?.startsWith('STUDENT');
      });

      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        studentUsers = studentUsers.filter(student => student.school?.id === schoolId);
      }

      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      let allClasses = response.data.classes || [];

      // Filter classes for admin and teacher - only show classes from their own school
      const userRole = user?.role?.name?.toUpperCase();
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id) {
        allClasses = allClasses.filter(cls => cls.school?.id === user.school.id);
      }
      setClasses(allClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        studentId: formData.studentId ? parseInt(formData.studentId) : null,
        classId: formData.classId ? parseInt(formData.classId) : null
      };

      console.log('Submitting attendance data:', submitData);
      console.log('Editing attendance:', editingAttendance);

      if (editingAttendance) {
        console.log('Updating attendance ID:', editingAttendance.id);
        const response = await api.put(`/attendance/${editingAttendance.id}`, submitData);
        console.log('Update response:', response.data);
      } else {
        console.log('Creating new attendance');
        const response = await api.post('/attendance', submitData);
        console.log('Create response:', response.data);
      }
      fetchAttendance();
      resetForm();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('C贸 l峄梚 x岷 ra khi l瓢u chuy锚n c岷');
    }
  };

  const handleEdit = (attendanceItem) => {
    console.log('Editing attendance item:', attendanceItem);
    console.log('Student ID:', attendanceItem.student?.id);
    console.log('Class ID:', attendanceItem.classEntity?.id);
    setEditingAttendance(attendanceItem);
    setFormData({
      studentId: attendanceItem.student?.id?.toString() || '',
      classId: attendanceItem.classEntity?.id?.toString() || '',
      status: attendanceItem.status || 'PRESENT',
      note: attendanceItem.note || ''
    });
    console.log('Form data set to:', {
      studentId: attendanceItem.student?.id?.toString() || '',
      classId: attendanceItem.classEntity?.id?.toString() || '',
      status: attendanceItem.status || 'PRESENT',
      note: attendanceItem.note || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (attendanceId) => {
    if (window.confirm('B岷 c贸 ch岷痗 ch岷痭 mu峄憂 x贸a b岷 ghi chuy锚n c岷 n脿y?')) {
      try {
        await api.delete(`/attendance/${attendanceId}`);
        fetchAttendance();
      } catch (error) {
        console.error('Error deleting attendance:', error);
        alert('C贸 l峄梚 x岷 ra khi x贸a chuy锚n c岷');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      classId: '',
      status: 'PRESENT',
      note: ''
    });
    setEditingAttendance(null);
    setShowModal(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return '#28a745';
      case 'ABSENT': return '#dc3545';
      case 'LATE': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PRESENT': return 'C贸 m岷穞';
      case 'ABSENT': return 'V岷痭g m岷穞';
      case 'LATE': return '膼i mu峄檔';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="attendance-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>膼ang t岷 d峄?li峄噓...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-management">
      <div className="common-page-header">
        <h2>Qu岷 l媒 chuy锚n c岷</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          鉃?膼i峄僲 danh
        </button>
      </div>

      <div className="common-table-container attendance-table-container">
        <table className="common-table attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>H峄峜 sinh</th>
              <th>L峄沺</th>
              <th>Tr岷g th谩i</th>
              <th>Ghi ch煤</th>
              <th>Ng脿y</th>
              <th>Thao t谩c</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <div className="student-info">
                    <span className="student-name">{item.student?.fullName}</span>
                    <span className="student-email">{item.student?.email}</span>
                  </div>
                </td>
                <td>{item.classEntity?.name}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {getStatusText(item.status)}
                  </span>
                </td>
                <td>{item.note || '-'}</td>
                <td>{item.attendanceDate ? new Date(item.attendanceDate).toLocaleDateString('vi-VN') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '-')}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-edit"
                      onClick={() => handleEdit(item)}
                    >
                      鉁忥笍 S峄璦
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      馃棏锔?X贸a
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="common-modal-overlay" onClick={resetForm}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()}>
            <div className="common-modal-header">
              <h3>{editingAttendance ? 'S峄璦 chuy锚n c岷' : '膼i峄僲 danh m峄沬'}</h3>
              <button className="common-close-btn" onClick={resetForm}>鉁?</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>H峄峜 sinh *</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                >
                  <option value="">Ch峄峮 h峄峜 sinh</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} - {student.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>L峄沺</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Ch峄峮 l峄沺</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Tr岷g th谩i *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="PRESENT">C贸 m岷穞</option>
                  <option value="ABSENT">V岷痭g m岷穞</option>
                  <option value="LATE">膼i mu峄檔</option>
                </select>
              </div>
              <div className="common-form-group">
                <label>Ghi ch煤</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Nh岷璸 ghi ch煤"
                  rows="3"
                />
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  H峄
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAttendance ? 'C岷璸 nh岷璽' : 'L瓢u 膽i峄僲 danh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;



