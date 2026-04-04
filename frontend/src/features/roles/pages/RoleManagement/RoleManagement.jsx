import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import '../../../../styles/CommonPageStyles.css';
import './RoleManagement.css';
import { Pencil, Trash2 } from 'lucide-react';

const RoleManagement = () => {
  const { user } = useAuth();
  const currentUserRole = user?.role?.name?.toUpperCase();
  const isSchoolAdmin = currentUserRole === 'ADMIN';
  const ADMIN_ALLOWED_ROLE_NAMES = ['PARENT', 'STUDENT', 'TEACHER'];
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schoolId: ''
  });

  useEffect(() => {
    fetchRoles();
    fetchSchools();

    if (user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id) {
      setFormData(prev => ({
        ...prev,
        schoolId: user.school.id.toString()
      }));
    }
  }, []);

  const fetchRoles = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      let url = '/roles';
      if (userRole === 'SUPER_ADMIN') {
        url += '?userRole=SUPER_ADMIN';
      } else if (userRole === 'ADMIN' && schoolId) {
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
      } else {
        console.error('Access denied to view roles');
        setRoles([]);
        return;
      }

      const response = await api.get(url);
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSchoolAdmin) {
      const inputNameUpper = (formData.name || '').toUpperCase().trim();
      if (!ADMIN_ALLOWED_ROLE_NAMES.includes(inputNameUpper)) {
        alert('Admin chỉ được tạo phân quyền: PHỤ HUYNH (PARENT), HỌC SINH (STUDENT), GIÁO VIÊN (TEACHER).');
        return;
      }
    }

    if (!editingRole) {
      const existingRole = roles.find(r => {
        const roleName = r.name?.toUpperCase();
        const inputName = formData.name?.toUpperCase();
        const sameSchool = formData.schoolId
          ? (r.school?.id?.toString() === formData.schoolId.toString())
          : (!r.school || r.school.id === null);
        return roleName === inputName && sameSchool;
      });

      if (existingRole) {
        const schoolName = existingRole.school?.name || 'Toàn hệ thống';
        alert(`Tên phân quyền "${formData.name}" đã tồn tại trong ${schoolName}. Vui lòng chọn tên khác.`);
        return;
      }
    }

    setLoading(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, formData);
      } else {
        await api.post('/roles', {
          ...formData,
          name: (formData.name || '').toUpperCase().trim()
        });
      }
      await fetchRoles();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving role:', error);
      let errorMsg = 'Có lỗi xảy ra khi lưu phân quyền';

      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
        if (errorMsg.includes('Duplicate entry') || errorMsg.includes('UKofx66keruapi6vyqpv6f2or37')) {
          errorMsg = `Tên phân quyền "${formData.name}" đã tồn tại trong hệ thống. Vui lòng chọn tên khác.`;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      schoolId: role.school?.id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (roleId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phân quyền này?')) {
      try {
        await api.delete(`/roles/${roleId}`);
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('Có lỗi xảy ra khi xóa phân quyền');
      }
    }
  };

  const resetForm = () => {
    if (user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id) {
      setFormData({ name: '', description: '', schoolId: user.school.id.toString() });
    } else {
      setFormData({ name: '', description: '', schoolId: '' });
    }
    setEditingRole(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu phân quyền...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý phân quyền</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Thêm phân quyền
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
        {roles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Chưa có phân quyền nào</div>
            <div className="empty-state-description">
              Nhấn &quot;Thêm phân quyền&quot; để tạo phân quyền mới
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Tên phân quyền</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-left">Trường</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {roles.map((role) => (
                <tr key={role.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">{role.id}</td>
                  <td className="px-4 py-3">
                    <span className="role-name">{role.name}</span>
                  </td>
                  <td className="px-4 py-3">{role.description}</td>
                  <td className="px-4 py-3">{role.school?.name || 'Toàn hệ thống'}</td>
                  <td className="px-4 py-3">{role.createdAt ? new Date(role.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                        onClick={() => handleEdit(role)}
                        aria-label="Sửa phân quyền"
                        title="Sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                        onClick={() => handleDelete(role.id)}
                        aria-label="Xóa phân quyền"
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
        )}
      </div>
      </div>

      {showModal && (
        <div className="common-modal-overlay" onClick={resetForm}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()}>
            <div className="common-modal-header">
              <h2>{editingRole ? 'Sửa phân quyền' : 'Thêm phân quyền mới'}</h2>
              <button className="common-close-btn" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Tên phân quyền *</label>
                {isSchoolAdmin ? (
                  <select
                    value={(formData.name || '').toUpperCase()}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={!!editingRole}
                    style={editingRole ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  >
                    <option value="">Chọn phân quyền</option>
                    <option value="PARENT">PHỤ HUYNH (PARENT)</option>
                    <option value="STUDENT">HỌC SINH (STUDENT)</option>
                    <option value="TEACHER">GIÁO VIÊN (TEACHER)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Nhập tên phân quyền"
                  />
                )}
              </div>
              <div className="common-form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả phân quyền"
                  rows="3"
                />
              </div>
              <div className="common-form-group">
                <label>Trường</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  disabled={user?.role?.name?.toUpperCase() === 'ADMIN'}
                  style={user?.role?.name?.toUpperCase() === 'ADMIN' ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Toàn hệ thống</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRole ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
