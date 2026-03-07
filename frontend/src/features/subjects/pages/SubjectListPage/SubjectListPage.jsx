import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './SubjectListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';

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
    if (window.confirm('B岷 c贸 ch岷痗 ch岷痭 mu峄憂 x贸a m么n h峄峜 n脿y?')) {
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
    return school ? school.name : 'Không có';
  };

  if (loading) {
    return (
      <div className="subject-list-page">
        <div className="loading">膼ang t岷...</div>
      </div>
    );
  }

  return (
    <div className="subject-list-page">
      <div className="common-page-header">
        <h1>Qu岷 l媒 m么n h峄峜</h1>
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
          Th锚m m么n h峄峜
        </button>
      </div>

      <div className="common-table-container subjects-table-container">
        <table className="common-table subjects-table">
          <thead>
            <tr>
              <th>T锚n m么n h峄峜</th>
              <th>M茫 m么n</th>
              <th>Tr瓢峄漬g</th>
              <th>Thao t谩c</th>
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
                      S峄璦
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(subject.id)}
                    >
                      X贸a
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
              <h2>{editingSubject ? 'S峄璦 m么n h峄峜' : 'Th锚m m么n h峄峜'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>脳</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>T锚n m么n h峄峜 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>M茫 m么n h峄峜 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Tr瓢峄漬g *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  disabled={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id}
                  required
                  style={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Ch峄峮 tr瓢峄漬g</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  H峄
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubject ? 'C岷璸 nh岷璽' : 'T岷 m峄沬'}
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

