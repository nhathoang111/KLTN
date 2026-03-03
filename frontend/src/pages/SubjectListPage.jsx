import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './SubjectListPage.css';
import { useAuth } from '../contexts/AuthContext';

const SubjectListPage = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    schoolId: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [subjectsRes, schoolsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/schools')
      ]);
      
      // Filter subjects for admin - only show subjects from their own school
      let allSubjects = subjectsRes.data.subjects || [];
      const userRole = user?.role?.name?.toUpperCase();
      if (userRole === 'ADMIN' && user?.school?.id) {
        allSubjects = allSubjects.filter(subject => subject.school?.id === user.school.id);
      }
      setSubjects(allSubjects);
      
      // Filter schools for admin - only show their own school
      let allSchools = schoolsRes.data.schools || [];
      if (userRole === 'ADMIN' && user?.school?.id) {
        allSchools = allSchools.filter(school => school.id === user.school.id);
      }
      setSchools(allSchools);
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
        schoolId: parseInt(formData.schoolId)
      };

      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, submitData);
      } else {
        await api.post('/subjects', submitData);
      }
      
      setShowModal(false);
      setEditingSubject(null);
      const defaultSchoolId = user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id 
        ? user.school.id.toString() 
        : '';
      setFormData({
        name: '',
        code: '',
        schoolId: defaultSchoolId
      });
      fetchData();
    } catch (error) {
      console.error('Error saving subject:', error);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      schoolId: subject.school?.id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      try {
        await api.delete(`/subjects/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting subject:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    const defaultSchoolId = user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id 
      ? user.school.id.toString() 
      : '';
    setFormData({
      name: '',
      code: '',
      schoolId: defaultSchoolId
    });
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  };

  if (loading) {
    return (
      <div className="subject-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="subject-list-page">
      <div className="common-page-header">
        <h1>Quản lý môn học</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            const defaultSchoolId = user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id 
              ? user.school.id.toString() 
              : '';
            setFormData({
              name: '',
              code: '',
              schoolId: defaultSchoolId
            });
            setShowModal(true);
          }}
        >
          Thêm môn học
        </button>
      </div>

      <div className="common-table-container subjects-table-container">
        <table className="common-table subjects-table">
          <thead>
            <tr>
              <th>Tên môn học</th>
              <th>Mã môn</th>
              <th>Trường</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.name}</td>
                <td>{subject.code}</td>
                <td>{getSchoolName(subject.school?.id)}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(subject)}
                    >
                      Sửa
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(subject.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingSubject ? 'Sửa môn học' : 'Thêm môn học'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Tên môn học *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Mã môn học *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Trường *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({...formData, schoolId: e.target.value})}
                  disabled={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id}
                  required
                  style={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Chọn trường</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubject ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectListPage;