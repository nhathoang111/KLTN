import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import '../../../../styles/CommonPageStyles.css';
import './RoleManagement.css';

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
      <div className="role-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-management">
      <div className="common-page-header">
        <h1>Quản lý phân quyền</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Thêm phân quyền
        </button>
      </div>

      <div className="common-table-container">
        {roles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Chưa có phân quyền nào</div>
            <div className="empty-state-description">
              Nhấn &quot;Thêm phân quyền&quot; để tạo phân quyền mới
            </div>
          </div>
        ) : (
          <table className="common-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên phân quyền</th>
                <th>Mô tả</th>
                <th>Trường</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.id}</td>
                  <td>
                    <span className="role-name">{role.name}</span>
                  </td>
                  <td>{role.description}</td>
                  <td>{role.school?.name || 'Toàn hệ thống'}</td>
                  <td>{role.createdAt ? new Date(role.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(role)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(role.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
