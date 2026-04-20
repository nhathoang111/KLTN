import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../../../shared/lib/api';
import './SubjectListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';

/** Cùng pattern ClassCreatePage / ClassListPage: BE trả ErrorResponse { message } */
function getApiErrorMessage(err, fallback) {
  const d = err?.response?.data;
  const msg =
    (d && typeof d === 'object' && (d.message || d.error)) ||
    (typeof d === 'string' ? d : null) ||
    fallback;
  return typeof msg === 'string' ? msg : String(msg);
}

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
  const [formError, setFormError] = useState('');

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
    setFormError('');
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
      toast.success(editingSubject ? 'Cập nhật môn học thành công.' : 'Tạo môn học thành công.');
    } catch (error) {
      console.error('Error saving subject:', error);
      const text = getApiErrorMessage(error, 'Không lưu được môn học.');
      setFormError(text);
      toast.error(text);
    }
  };

  const handleEdit = (subject) => {
    setFormError('');
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
    setFormError('');
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
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu môn học...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý môn học</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormError('');
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

      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Tên môn học</th>
              <th className="px-4 py-3 text-left">Mã môn</th>
              <th className="px-4 py-3 text-left">Số lớp đang học</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {subjects.map((subject) => (
              <tr key={subject.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3">{subject.name}</td>
                <td className="px-4 py-3">{subject.code}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const count = subjectClassCounts[subject.id] ?? subjectClassCounts[String(subject.id)] ?? 0;
                    const n = Number(count);
                    const isAdmin = user?.role?.name?.toUpperCase() === 'ADMIN';
                    if (isAdmin && n > 0) {
                      return (
                        <button
                          type="button"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          onClick={() => handleOpenClassLinks(subject)}
                        >
                          {n}
                        </button>
                      );
                    }
                    return n;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                      onClick={() => handleEdit(subject)}
                      aria-label="Sửa môn học"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      onClick={() => handleDelete(subject.id)}
                      aria-label="Xóa môn học"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
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
              {formError && (
                <div
                  className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {formError}
                </div>
              )}
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

