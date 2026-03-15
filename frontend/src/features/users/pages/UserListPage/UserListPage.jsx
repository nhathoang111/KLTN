import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './UserListPage.css';

const UserListPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkClassModal, setShowBulkClassModal] = useState(false);
  const [bulkClasses, setBulkClasses] = useState([]);
  const [bulkClassLoading, setBulkClassLoading] = useState(false);
  const selectAllCheckboxRef = useRef(null);
  const [linkModal, setLinkModal] = useState(null);

  useEffect(() => {
    // Chờ user context sẵn sàng trước khi fetch
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      // Xác định phân quyền từ user context
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      console.log('UserListPage - Fetching users:', { userRole, schoolId });

      let url = '/users';
      const headers = {};

      if (userRole === 'SUPER_ADMIN') {
        // Super Admin trong trang "Quản lý Admin trường" chỉ xem Admin users
        url += '?userRole=ADMIN';
        headers['X-User-Role'] = 'SUPER_ADMIN';
      } else if (userRole === 'ADMIN' && schoolId) {
        // Admin xem TEACHER và STUDENT users trong trường của mình
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
        headers['X-User-Role'] = 'ADMIN';
      } else {
        // Nếu chưa có user hoặc không phải SUPER_ADMIN/ADMIN, đợi user load
        if (!user) {
          console.log('UserListPage - Waiting for user context...');
          return;
        }
        setError('Không có quyền truy cập.');
        setLoading(false);
        return;
      }

      console.log('UserListPage - Fetching from URL:', url);
      const response = await api.get(url, { headers });
      console.log('UserListPage - Response:', response.data);
      console.log('UserListPage - Response JSON:', JSON.stringify(response.data, null, 2));

      const fetchedUsers = response.data.users || [];
      console.log('UserListPage - Fetched users count:', fetchedUsers.length);

      // Log full response for k@gmail.com specifically
      const kUser = fetchedUsers.find(u => u.email === 'k@gmail.com');
      if (kUser) {
        console.log('=== k@gmail.com user data from API ===');
        console.log('Full object:', JSON.stringify(kUser, null, 2));
        console.log('Has class key:', 'class' in kUser);
        console.log('Class value:', kUser.class);
      }

      // Log class info for students
      fetchedUsers.forEach(u => {
        const roleName = u.role?.name?.toUpperCase() || '';
        const isStudent = roleName.includes('STUDENT') || roleName === 'STUDENT';
        if (isStudent) {
          console.log(`=== Student ${u.email} ===`);
          console.log('  Role:', u.role?.name);
          console.log('  Has class property:', 'class' in u);
          console.log('  Class value:', u.class);
          console.log('  Class type:', typeof u.class);
          console.log('  Class is null?', u.class === null);
          console.log('  Class is undefined?', u.class === undefined);
          if (u.class) {
            console.log('  Class name:', u.class.name);
            console.log('  Class id:', u.class.id);
            console.log('  Class schoolYear:', u.class.schoolYear);
          } else {
            console.log('  ⚠️ Class is NULL or UNDEFINED');
          }
          console.log('  Full user object:', JSON.stringify(u, null, 2));
        }
      });

      // Filter users dựa trên role của user đang đăng nhập
      let filteredUsers = [];
      if (userRole === 'SUPER_ADMIN') {
        // Super Admin: chỉ hiển thị ADMIN users
        filteredUsers = fetchedUsers.filter(u => {
          const roleName = u.role?.name?.toUpperCase() || '';
          return roleName === 'ADMIN' || roleName.startsWith('ADMIN');
        });
        console.log('UserListPage - SUPER_ADMIN: Admin users count:', filteredUsers.length);
      } else if (userRole === 'ADMIN') {
        // Admin: hiển thị TEACHER, STUDENT và PARENT users (kể cả tên role "Phụ huynh", "PARENT_xxx")
        filteredUsers = fetchedUsers.filter(u => {
          const roleName = (u.role?.name || '').toUpperCase();
          const isTeacher = roleName.includes('TEACHER');
          const isStudent = roleName.includes('STUDENT');
          const isParent = roleName.includes('PARENT') || roleName.includes('PHU HUYNH') || roleName.includes('PHỤ HUYNH');
          return isTeacher || isStudent || isParent;
        });
        console.log('UserListPage - ADMIN: Teacher/Student/Parent users count:', filteredUsers.length);
        console.log('=== ADMIN: Filtered users ===');
        filteredUsers.forEach(u => {
          console.log(`  User: ${u.email}`);
          console.log(`    Role: ${u.role?.name}`);
          console.log(`    Has class: ${!!u.class}`);
          console.log(`    Class:`, u.class);
          if (u.class) {
            console.log(`    Class name: ${u.class.name}`);
            console.log(`    Class id: ${u.class.id}`);
          }
        });
      }

      setUsers(filteredUsers);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Không thể tải danh sách người dùng';
      setError(errorMessage);
      console.error('Error fetching users:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, userName) => {
    const confirmMessage = `Bạn có chắc muốn xóa người dùng "${userName || 'này'}"?\n\nHành động không thể hoàn tác.`;

    if (window.confirm(confirmMessage)) {
      try {
        setDeleteLoading(id);
        setError('');

        await api.delete(`/users/${id}`);
        setUsers(users.filter(user => user.id !== id));
        setSuccess(`Đã xóa người dùng "${userName || 'này'}" thành công.`);

        setTimeout(() => setSuccess(''), 3000);

      } catch (err) {
        const data = err.response?.data || {};
        const errorMessage = data.message || data.error || 'Không thể xóa người dùng. Vui lòng thử lại.';
        setError(errorMessage);
        console.error('Error deleting user:', err.response?.data || err);
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const getRoleDisplayName = (roleName) => {
    if (!roleName) return '';
    const r = roleName.toUpperCase();
    if (r === 'SUPER_ADMIN') return 'Quản trị hệ thống';
    if (r.startsWith('ADMIN')) return 'Quản trị trường';
    if (r.startsWith('TEACHER')) return 'Giáo viên';
    if (r.startsWith('STUDENT')) return 'Học sinh';
    if (r.startsWith('PARENT') || r.includes('PARENT') || r.includes('PHU HUYNH') || r.includes('PHỤ HUYNH')) return 'Phụ huynh';
    return roleName;
  };

  const getRoleBadgeConfig = (roleName) => {
    if (!roleName) return { label: '', badgeClass: 'default' };
    const r = roleName.toUpperCase();
    if (r === 'SUPER_ADMIN') return { label: 'Quản trị hệ thống', badgeClass: 'admin' };
    if (r.startsWith('ADMIN')) return { label: 'Quản trị trường', badgeClass: 'admin' };
    if (r.startsWith('TEACHER')) return { label: 'Giáo viên', badgeClass: 'teacher' };
    if (r.startsWith('STUDENT')) return { label: 'Học sinh', badgeClass: 'student' };
    if (r.startsWith('PARENT') || r.includes('PARENT') || r.includes('PHU HUYNH') || r.includes('PHỤ HUYNH')) return { label: 'Phụ huynh', badgeClass: 'parent' };
    return { label: roleName, badgeClass: 'default' };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'INACTIVE': return 'text-gray-600 bg-gray-100';
      case 'SUSPENDED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const applyFilters = () => {
    const currentUserRole = user?.role?.name?.toUpperCase();
    return users.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const roleName = u.role?.name?.toUpperCase() || '';
      const status = (u.status || '').toUpperCase();

      // text search
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        if (!name.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      // role filter
      if (filterRole !== 'ALL') {
        if (filterRole === 'PARENT') {
          if (!roleName.includes('PARENT') && !roleName.includes('PHU HUYNH') && !roleName.includes('PHỤ HUYNH')) return false;
        } else if (!roleName.includes(filterRole)) {
          return false;
        }
      }

      // status filter
      if (filterStatus !== 'ALL') {
        if (status !== filterStatus) {
          return false;
        }
      }

      // giữ nguyên phân tách theo SUPER_ADMIN / ADMIN đã xử lý ở fetchUsers
      return true;
    });
  };

  const displayedUsers = applyFilters();
  const totalFiltered = displayedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const pageIndex = Math.min(currentPage, totalPages - 1);
  const paginatedUsers = displayedUsers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const isSuperAdmin = user?.role?.name?.toUpperCase() === 'SUPER_ADMIN';
  const totalAdmins = isSuperAdmin ? users.length : 0;
  const activeAdmins = isSuperAdmin ? users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length : 0;
  const lockedAdmins = isSuperAdmin
    ? users.filter((u) => ['SUSPENDED', 'INACTIVE', 'LOCKED'].includes((u.status || '').toUpperCase())).length
    : 0;

  const toggleSelectAll = () => {
    const onPage = paginatedUsers.map((u) => u.id);
    const allSelected = onPage.length > 0 && onPage.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) onPage.forEach((id) => next.delete(id));
      else onPage.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedUsers = users.filter((u) => selectedIds.has(u.id));
  const selectedStudents = selectedUsers.filter((u) => {
    const r = (u.role?.name || '').toUpperCase();
    return r.includes('STUDENT');
  });

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Bạn có chắc muốn xóa ${count} người dùng đã chọn? Hành động không thể hoàn tác.`)) return;
    setBulkActionLoading(true);
    setError('');
    try {
      for (const id of selectedIds) {
        await api.delete(`/users/${id}`);
      }
      setUsers((prev) => prev.filter((u) => !selectedIds.has(u.id)));
      setSuccess(`Đã xóa ${count} người dùng.`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.message || data.error || 'Không thể xóa người dùng đã chọn. Vui lòng thử lại.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    setError('');
    try {
      for (const id of selectedIds) {
        await api.put(`/users/${id}`, { status: newStatus });
      }
      setUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: newStatus } : u))
      );
      setSuccess(`Đã cập nhật trạng thái ${selectedIds.size} người dùng.`);
      setSelectedIds(new Set());
      setShowBulkStatusModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Cập nhật trạng thái thất bại.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const fetchBulkClasses = async () => {
    const schoolId = user?.school?.id;
    if (!schoolId) return;
    setBulkClassLoading(true);
    try {
      const res = await api.get(`/classes/school/${schoolId}`);
      setBulkClasses(res.data?.classes || res.data || []);
    } catch (_) {
      setBulkClasses([]);
    } finally {
      setBulkClassLoading(false);
    }
  };

  const handleBulkAssignClass = async (classId) => {
    if (selectedStudents.length === 0 || !classId) return;
    setBulkActionLoading(true);
    setError('');
    try {
      for (const id of selectedStudents.map((u) => u.id)) {
        await api.put(`/users/${id}`, { classId: Number(classId) });
      }
      setSuccess(`Đã gán lớp cho ${selectedStudents.length} học sinh.`);
      fetchUsers();
      setSelectedIds(new Set());
      setShowBulkClassModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Gán lớp thất bại.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reset về trang hợp lệ khi đổi bộ lọc hoặc số dòng/trang
  useEffect(() => {
    setCurrentPage((p) => (totalPages === 0 ? 0 : Math.min(p, totalPages - 1)));
  }, [totalPages, searchTerm, filterRole, filterStatus, pageSize]);

  const someSelected = paginatedUsers.some((u) => selectedIds.has(u.id));
  const allSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.has(u.id));
  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
          <p className="text-sm font-medium">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isSuperAdmin ? 'min-h-screen bg-slate-100 px-4 py-6' : 'user-list-page'}>
      {isSuperAdmin ? (
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Quản lý Admin trường
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Tổng quan và quản lý danh sách quản trị trường.
              </p>
            </div>
            <Link
              to="/users/create"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
            >
              <span className="text-lg leading-none">＋</span>
              <span>Thêm quản trị mới</span>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-md shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tổng số quản trị
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {totalAdmins}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-lg">
                  🏫
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-md shadow-emerald-500/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Quản trị đang hoạt động
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">
                    {activeAdmins}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg">
                  ✓
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-md shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quản trị bị khóa / ngưng
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {lockedAdmins}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg">
                  ⛔
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="common-page-header">
          <div>
            <h1>Quản lý Giáo viên & Học sinh</h1>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
              Quản lý giáo viên và học sinh trong trường của bạn.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/users/create"
              className="btn btn-primary"
            >
              ➕ Thêm người dùng mới
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(null); setImportFile(null); }}
            >
              📤 Nhập từ Excel
            </button>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="common-modal-overlay" onClick={() => !importLoading && setShowImportModal(false)}>
          <div className="common-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="common-modal-header">
              <h2>Nhập người dùng từ Excel</h2>
              <button type="button" className="common-close-btn" onClick={() => !importLoading && setShowImportModal(false)}>×</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#555' }}>
                Tải file mẫu, điền thông tin (Email, Họ tên, Mật khẩu, Vai trò, Mã trường, Mã lớp), sau đó chọn file và nhấn Tải lên.
              </p>
              <a
                href={`${api.defaults.baseURL || window.location.origin + '/api'}/users/import-template`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ marginBottom: '1rem', display: 'inline-block' }}
              >
                ⬇ Tải file mẫu Excel
              </a>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!importFile) {
                  setImportError('Vui lòng chọn file Excel');
                  return;
                }
                setImportLoading(true);
                setImportError(null);
                setImportResult(null);
                try {
                  const formData = new FormData();
                  formData.append('file', importFile);
                  const headers = {
                    'X-User-Role': user?.role?.name || ''
                  };
                  if (user?.school?.id != null) headers['X-User-School-Id'] = String(user.school.id);
                  const res = await api.post('/users/import', formData, { headers });
                  setImportResult(res.data);
                  setImportError(null);
                  fetchUsers();
                  setImportFile(null);
                } catch (err) {
                  const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Nhập dữ liệu thất bại';
                  setImportError(msg);
                  setImportResult(null);
                } finally {
                  setImportLoading(false);
                }
              }}>
                <div className="common-form-group">
                  <label>Chọn file (.xlsx)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    disabled={importLoading}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={importLoading || !importFile}>
                    {importLoading ? 'Đang xử lý...' : 'Tải lên'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => !importLoading && setShowImportModal(false)}>
                    Đóng
                  </button>
                </div>
              </form>

              {importError && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  <strong>❌ Lỗi:</strong> {importError}
                </div>
              )}

              {importResult && (
                <div style={{ marginTop: '1rem' }}>
                  {importResult.successCount > 0 && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      color: '#166534',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      marginBottom: importResult.failCount > 0 ? '0.75rem' : 0
                    }}>
                      <strong>✅ Thành công:</strong> Đã thêm {importResult.successCount} người dùng.
                    </div>
                  )}
                  {importResult.failCount > 0 && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: importResult.successCount > 0 ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${importResult.successCount > 0 ? '#fde68a' : '#fecaca'}`,
                      color: importResult.successCount > 0 ? '#92400e' : '#b91c1c',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}>
                      <p style={{ margin: 0 }}><strong>{importResult.successCount > 0 ? '⚠️ Một số dòng lỗi' : '❌ Lỗi'}:</strong> {importResult.failCount} dòng không thêm được.</p>
                      {importResult.errors?.length > 0 && (
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', maxHeight: '180px', overflow: 'auto', marginBottom: 0 }}>
                          {importResult.errors.map((err, i) => (
                            <li key={i}>Dòng {err.row}: {err.email || '(trống)'} – {err.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {importResult.successCount === 0 && importResult.failCount === 0 && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}>
                      Không có dòng dữ liệu nào để xử lý (file trống hoặc không có dòng hợp lệ).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSuperAdmin ? (
        <div className="mx-auto mt-4 max-w-6xl space-y-3">
          <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị trường</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngưng hoạt động</option>
                <option value="SUSPENDED">Bị khóa</option>
              </select>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-600 shadow-sm shadow-indigo-100"
              >
                <span className="text-sm">⚙</span>
                <span>Bộ lọc</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Hiển thị {totalFiltered === 0 ? 0 : pageIndex * pageSize + 1}–
              {Math.min((pageIndex + 1) * pageSize, totalFiltered)} / {totalFiltered} quản trị viên
            </p>
          </div>

          {error && (
            <div className="mx-auto max-w-6xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mx-auto max-w-6xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-2.5 text-sm shadow-sm">
              <span className="font-medium text-slate-700">
                Đã chọn {selectedIds.size} người dùng
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={bulkActionLoading}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-400 disabled:opacity-60"
                >
                  {bulkActionLoading ? 'Đang xử lý...' : 'Xóa hàng loạt'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkStatusModal(true)}
                  disabled={bulkActionLoading}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Đổi trạng thái
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 flex flex-col">
            {totalFiltered === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="text-4xl opacity-60">👥</div>
                <h3 className="text-base font-semibold text-slate-800">
                  {users.length === 0
                    ? 'Chưa có quản trị viên nào'
                    : 'Không tìm thấy người dùng phù hợp bộ lọc'}
                </h3>
                <p className="max-w-md text-sm text-slate-500">
                  {users.length === 0
                    ? 'Bắt đầu bằng cách tạo quản trị viên mới.'
                    : 'Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.'}
                </p>
                <Link
                  to="/users/create"
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
                >
                  <span className="text-lg leading-none">＋</span>
                  <span>Thêm quản trị mới</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl flex-1 min-h-[260px]">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-11 px-4 py-3 text-left">
                          <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label="Chọn tất cả trên trang"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Người dùng</th>
                        <th className="px-4 py-3 text-left">Vai trò</th>
                        <th className="px-4 py-3 text-left">Trạng thái</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                      {paginatedUsers.map((userItem) => {
                        const status = (userItem.status || '').toUpperCase();
                        const statusClasses =
                          status === 'ACTIVE'
                            ? 'bg-sky-500 text-white'
                            : status === 'INACTIVE'
                            ? 'bg-slate-300 text-slate-700'
                            : 'bg-rose-500 text-white';

                        return (
                          <tr
                            key={userItem.id}
                            className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(userItem.id)}
                                onChange={() => toggleSelectOne(userItem.id)}
                                aria-label={`Chọn ${userItem.fullName || userItem.email}`}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                                  {userItem.fullName?.charAt(0)?.toUpperCase() ||
                                    userItem.email?.charAt(0)?.toUpperCase() ||
                                    'A'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {userItem.fullName || '—'}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {userItem.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Quản trị trường
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex min-w-[80px] justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses}`}
                              >
                                {status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/users/${userItem.id}/edit`}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                                >
                                  <Pencil size={15} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(userItem.id, userItem.fullName)}
                                  disabled={deleteLoading === userItem.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors disabled:opacity-60"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalFiltered > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>
                        Hiển thị {pageIndex * pageSize + 1}–
                        {Math.min((pageIndex + 1) * pageSize, totalFiltered)} / {totalFiltered} quản trị viên
                      </span>
                      <label className="flex items-center gap-1">
                        <span>Số dòng/trang:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(0);
                          }}
                          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={pageIndex === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                            p === pageIndex
                              ? 'bg-indigo-500 text-white'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={pageIndex >= totalPages - 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Tất cả vai trò</option>
              {user?.role?.name?.toUpperCase() === 'ADMIN' && (
                <>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="STUDENT">Học sinh</option>
                  <option value="PARENT">Phụ huynh</option>
                </>
              )}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngưng hoạt động</option>
              <option value="SUSPENDED">Bị khóa</option>
            </select>
          </div>

          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#efe',
              border: '1px solid #cfc',
              color: '#3c3',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {success}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="bulk-action-bar">
              <span className="bulk-action-count">Đã chọn {selectedIds.size} người dùng</span>
              <div className="bulk-action-buttons">
                <button type="button" className="btn btn-sm btn-secondary" onClick={clearSelection} disabled={bulkActionLoading}>
                  Bỏ chọn
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={handleBulkDelete} disabled={bulkActionLoading}>
                  {bulkActionLoading ? 'Đang xử lý...' : '🗑️ Xóa hàng loạt'}
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowBulkStatusModal(true)} disabled={bulkActionLoading}>
                  Đổi trạng thái
                </button>
                {user?.role?.name?.toUpperCase() === 'ADMIN' && selectedStudents.length > 0 && (
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setShowBulkClassModal(true); fetchBulkClasses(); }} disabled={bulkActionLoading}>
                    Gán lớp ({selectedStudents.length} học sinh)
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="common-table-container">
            {totalFiltered === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3 className="empty-state-title">
                  {users.length === 0
                    ? 'Chưa có giáo viên hoặc học sinh nào'
                    : 'Không tìm thấy người dùng phù hợp bộ lọc'}
                </h3>
                <p className="empty-state-description">
                  {users.length === 0
                    ? 'Bắt đầu bằng cách tạo giáo viên hoặc học sinh mới.'
                    : 'Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.'}
                </p>
                <Link
                  to="/users/create"
                  className="btn btn-primary"
                >
                  ➕ Thêm người dùng mới
                </Link>
              </div>
            ) : (
              <table className="common-table user-list-table">
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <label className="bulk-checkbox-label">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Chọn tất cả trên trang"
                    />
                  </label>
                </th>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>GVCN lớp</th>
                {(() => {
                  const currentUserRole = user?.role?.name?.toUpperCase();
                  if (currentUserRole === 'ADMIN') {
                    return <th>Liên kết</th>;
                  }
                  return null;
                })()}
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((userItem) => (
                <tr key={userItem.id} className="user-item">
                  <td>
                    <label className="bulk-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(userItem.id)}
                        onChange={() => toggleSelectOne(userItem.id)}
                        aria-label={`Chọn ${userItem.fullName || userItem.email}`}
                      />
                    </label>
                  </td>
                  <td>
                    <div className="user-cell user-cell--centered">
                      <div className="user-cell-top">
                        <div className="user-avatar">
                          {userItem.fullName?.charAt(0)?.toUpperCase() || '👤'}
                        </div>
                        <div className="user-cell-info">
                          <span className="user-name">{userItem.fullName}</span>
                          <div className="user-cell-email">{userItem.email}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const { label, badgeClass } = getRoleBadgeConfig(userItem.role?.name);
                      if (!label) return null;
                      return (
                        <span className={`role-badge role-badge--${badgeClass}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const roleName = userItem.role?.name?.toUpperCase() || '';
                      const isTeacher = roleName.includes('TEACHER') || roleName === 'TEACHER';
                      const homeroomClasses = userItem.homeroomClasses && Array.isArray(userItem.homeroomClasses) ? userItem.homeroomClasses : [];
                      if (!isTeacher) return <span className="text-gray-400">-</span>;
                      if (homeroomClasses.length === 0) return <span className="link-cell-empty">Không</span>;
                      if (homeroomClasses.length === 1) {
                        const cls = homeroomClasses[0];
                        return <span className="link-cell-badge link-cell-badge--student">{cls.name}</span>;
                      }
                      return (
                        <button
                          type="button"
                          className="link-cell-btn"
                          onClick={() => setLinkModal({ type: 'classes', title: `GVCN lớp: ${userItem.fullName || 'giáo viên'}`, items: homeroomClasses, userName: userItem.fullName })}
                        >
                          {homeroomClasses.length} lớp
                        </button>
                      );
                    })()}
                  </td>
                  {(() => {
                    const currentUserRole = user?.role?.name?.toUpperCase();
                    if (currentUserRole === 'ADMIN') {
                      return (
                        <td>
                          {(() => {
                            const userRoleName = userItem.role?.name?.toUpperCase() || '';
                            const isStudent = userRoleName.includes('STUDENT') || userRoleName === 'STUDENT';
                            const isTeacher = userRoleName.includes('TEACHER') || userRoleName === 'TEACHER';
                            const isParent = userRoleName.includes('PARENT') || userRoleName.includes('PHU HUYNH') || userRoleName.includes('PHỤ HUYNH');

                            if (isStudent) {
                              if (userItem.class && userItem.class.name) {
                                return (
                                  <span className="link-cell-badge link-cell-badge--student">
                                    {userItem.class.name}
                                  </span>
                                );
                              }
                              return <span className="link-cell-empty">Chưa có lớp</span>;
                            }
                            if (isTeacher) {
                              const classes = userItem.classes && Array.isArray(userItem.classes) ? userItem.classes : [];
                              const count = classes.length;
                              if (count > 0) {
                                return (
                                  <button
                                    type="button"
                                    className="link-cell-btn"
                                    onClick={() => setLinkModal({ type: 'classes', title: `Lớp của ${userItem.fullName || 'giáo viên'}`, items: classes, userName: userItem.fullName })}
                                  >
                                    {count} lớp
                                  </button>
                                );
                              }
                              return <span className="link-cell-empty">Chưa có lớp</span>;
                            }
                            if (isParent) {
                              const children = userItem.children && Array.isArray(userItem.children) ? userItem.children : [];
                              const count = userItem.childrenCount != null ? userItem.childrenCount : children.length;
                              if (count > 0) {
                                return (
                                  <button
                                    type="button"
                                    className="link-cell-btn"
                                    onClick={() => setLinkModal({ type: 'children', title: `Con của ${userItem.fullName || 'phụ huynh'}`, items: children, userName: userItem.fullName })}
                                  >
                                    {count} con
                                  </button>
                                );
                              }
                              return <span className="link-cell-empty">Chưa liên kết con</span>;
                            }
                            return <span className="link-cell-empty">-</span>;
                          })()}
                        </td>
                      );
                    }
                    return null;
                  })()}
                  <td>
                    <span className={`status-badge ${userItem.status?.toLowerCase()}`}>
                      {userItem.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`/users/${userItem.id}/edit`}
                        className="btn btn-sm btn-secondary"
                      >
                        ✏️ Sửa
                      </Link>
                      <button
                        onClick={() => handleDelete(userItem.id, userItem.fullName)}
                        disabled={deleteLoading === userItem.id}
                        className="btn btn-sm btn-danger"
                      >
                        {deleteLoading === userItem.id ? '⏳ Đang xóa...' : '🗑️ Xóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}

      {!isSuperAdmin && totalFiltered > 0 && (
        <div className="pagination-bar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '1rem',
          padding: '0.75rem 0',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Hiển thị {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalFiltered)} / {totalFiltered} {user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' ? 'quản trị viên' : 'người dùng'}
            </span>
            <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Số dòng/trang:
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="btn btn-sm btn-secondary"
              style={{ minWidth: '36px' }}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={p === pageIndex ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'}
                style={{ minWidth: '36px' }}
              >
                {p + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
              className="btn btn-sm btn-secondary"
              style={{ minWidth: '36px' }}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {showBulkStatusModal && (
        <div className="common-modal-overlay" onClick={() => !bulkActionLoading && setShowBulkStatusModal(false)}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="common-modal-header">
              <h2>Đổi trạng thái ({selectedIds.size} người dùng)</h2>
              <button type="button" className="common-close-btn" onClick={() => !bulkActionLoading && setShowBulkStatusModal(false)}>×</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div className="common-form-group">
                <label>Trạng thái mới</label>
                <select
                  id="bulk-status-select"
                  className="filter-select"
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngưng hoạt động</option>
                  <option value="SUSPENDED">Bị khóa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={bulkActionLoading}
                  onClick={() => {
                    const select = document.getElementById('bulk-status-select');
                    if (select) handleBulkStatus(select.value);
                  }}
                >
                  {bulkActionLoading ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => !bulkActionLoading && setShowBulkStatusModal(false)}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkClassModal && (
        <div className="common-modal-overlay" onClick={() => !bulkActionLoading && setShowBulkClassModal(false)}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="common-modal-header">
              <h2>Gán lớp cho {selectedStudents.length} học sinh</h2>
              <button type="button" className="common-close-btn" onClick={() => !bulkActionLoading && setShowBulkClassModal(false)}>×</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {bulkClassLoading ? (
                <p>Đang tải danh sách lớp...</p>
              ) : (
                <>
                  <div className="common-form-group">
                    <label>Chọn lớp</label>
                    <select
                      id="bulk-class-select"
                      className="filter-select"
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      <option value="">-- Chọn lớp --</option>
                      {bulkClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                          {cls.schoolYear ? ` (${cls.schoolYear})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={bulkActionLoading || bulkClasses.length === 0}
                      onClick={() => {
                        const select = document.getElementById('bulk-class-select');
                        if (select?.value) handleBulkAssignClass(select.value);
                      }}
                    >
                      {bulkActionLoading ? 'Đang xử lý...' : 'Gán lớp'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => !bulkActionLoading && setShowBulkClassModal(false)}>
                      Hủy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {linkModal && (
        <div className="common-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="common-modal link-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="common-modal-header">
              <h2>{linkModal.title}</h2>
              <button type="button" className="common-close-btn" onClick={() => setLinkModal(null)}>×</button>
            </div>
            <div className="link-modal-body">
              {linkModal.type === 'classes' && linkModal.items?.length > 0 && (
                <ul className="link-modal-list">
                  {linkModal.items.map((cls, idx) => (
                    <li key={cls.id || idx}>
                      <span className="link-modal-item">
                        {cls.name}
                        {cls.schoolYear ? ` (${cls.schoolYear})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {linkModal.type === 'children' && linkModal.items?.length > 0 && (
                <ul className="link-modal-list">
                  {linkModal.items.map((child, idx) => (
                    <li key={child.id || idx}>
                      <Link to={`/users/${child.id}/edit`} className="link-modal-item link-modal-item--clickable" onClick={() => setLinkModal(null)}>
                        {child.fullName || child.email || `#${child.id}`}
                        {child.email && <span className="link-modal-email"> — {child.email}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {(!linkModal.items || linkModal.items.length === 0) && (
                <p className="link-modal-empty">Không có dữ liệu.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;




