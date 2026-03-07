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
      alert('Có lỗi xảy ra khi lưu chuyên cần');
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
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi chuyên cần này?')) {
      try {
        await api.delete(`/attendance/${attendanceId}`);
        fetchAttendance();
      } catch (error) {
        console.error('Error deleting attendance:', error);
        alert('Có lỗi xảy ra khi xóa chuyên cần');
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
      case 'PRESENT': return 'Có mặt';
      case 'ABSENT': return 'Vắng mặt';
      case 'LATE': return 'Đi muộn';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="attendance-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải d�?liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-management">
      <div className="common-page-header">
        <h2>Quản lý chuyên cần</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          �?Điểm danh
        </button>
      </div>

      <div className="common-table-container attendance-table-container">
        <table className="common-table attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Học sinh</th>
              <th>Lớp</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
              <th>Ngày</th>
              <th>Thao tác</th>
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
                      ✏️ Sửa
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      🗑�?Xóa
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
              <h3>{editingAttendance ? 'Sửa chuyên cần' : 'Điểm danh mới'}</h3>
              <button className="common-close-btn" onClick={resetForm}>�?</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Học sinh *</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                >
                  <option value="">Chọn học sinh</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} - {student.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Lớp</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Chọn lớp</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group">
                <label>Trạng thái *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="PRESENT">Có mặt</option>
                  <option value="ABSENT">Vắng mặt</option>
                  <option value="LATE">Đi muộn</option>
                </select>
              </div>
              <div className="common-form-group">
                <label>Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Nhập ghi chú"
                  rows="3"
                />
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAttendance ? 'Cập nhật' : 'Lưu điểm danh'}
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


