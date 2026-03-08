import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './SubjectListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';

const SubjectListPage = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [subjectClassCounts, setSubjectClassCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [linkModal, setLinkModal] = useState(null); // { subject, classes: [] }
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
      const [subjectsRes, schoolsRes, countsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/schools'),
        api.get('/subjects/counts/classes').catch(() => ({ data: {} }))
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

      setSubjectClassCounts(countsRes.data || {});
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

  const handleOpenClassLinks = async (subject) => {
    const count = subjectClassCounts[subject.id] ?? subjectClassCounts[String(subject.id)] ?? 0;
    if (Number(count) === 0) return;
    setLinkModal({ subject, classes: null });
    try {
      const res = await api.get(`/subjects/${subject.id}/classes`);
      const classes = res.data?.classes || [];
      setLinkModal(prev => prev ? { ...prev, classes } : null);
    } catch (err) {
      console.error('Error fetching classes for subject:', err);
      setLinkModal(prev => prev ? { ...prev, classes: [] } : null);
    }
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
              <th>Số lớp đang học</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.name}</td>
                <td>{subject.code}</td>
                <td>
                  {(() => {
                    const count = subjectClassCounts[subject.id] ?? subjectClassCounts[String(subject.id)] ?? 0;
                    const n = Number(count);
                    const isAdmin = user?.role?.name?.toUpperCase() === 'ADMIN';
                    if (isAdmin && n > 0) {
                      return (
                        <button
                          type="button"
                          className="subject-class-count-link"
                          onClick={() => handleOpenClassLinks(subject)}
                        >
                          {n}
                        </button>
                      );
                    }
                    return n;
                  })()}
                </td>
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

      {linkModal && (
        <div className="common-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="common-modal" onClick={e => e.stopPropagation()}>
            <div className="common-modal-header">
              <h2>Lớp đang học môn: {linkModal.subject?.name}</h2>
              <button className="common-close-btn" onClick={() => setLinkModal(null)} type="button">×</button>
            </div>
            <div className="common-modal-body" style={{ padding: '1rem 1.5rem' }}>
              {linkModal.classes === null ? (
                <p className="text-muted">Đang tải...</p>
              ) : linkModal.classes.length === 0 ? (
                <p className="text-muted">Chưa có lớp nào.</p>
              ) : (
                <ul className="subject-class-links-list">
                  {linkModal.classes.map(cls => (
                    <li key={cls.id}>{cls.name || `Lớp #${cls.id}`}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Mã môn học *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Trường *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
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

