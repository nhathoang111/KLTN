import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../auth/context/AuthContext';
import api from '../../../../shared/lib/api';
import './UserListPage.css';
import CreateUserModal from './components/CreateUserModal';
import ImportUsersExcelModal from './components/ImportUsersExcelModal';
import SuperAdminHeader from './components/SuperAdminHeader';
import AdminHeader from './components/AdminHeader';
import EditUserModal from './components/EditUserModal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

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

  const isAdmin = user?.role?.name?.toUpperCase() === 'ADMIN';
  const totalUsers = !isSuperAdmin ? users.length : 0;
  const activeUsers = !isSuperAdmin ? users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length : 0;
  const lockedUsers = !isSuperAdmin
    ? users.filter((u) => ['SUSPENDED', 'INACTIVE', 'LOCKED'].includes((u.status || '').toUpperCase())).length
    : 0;

  const totalTeachers = !isSuperAdmin
    ? users.filter((u) => (u.role?.name || '').toUpperCase().includes('TEACHER')).length
    : 0;
  const totalStudents = !isSuperAdmin
    ? users.filter((u) => (u.role?.name || '').toUpperCase().includes('STUDENT')).length
    : 0;
  const totalParents = !isSuperAdmin
    ? users.filter((u) => {
        const r = (u.role?.name || '').toUpperCase();
        return r.includes('PARENT') || r.includes('PHU HUYNH') || r.includes('PHỤ HUYNH');
      }).length
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

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {isSuperAdmin ? (
          <SuperAdminHeader
            onOpenCreate={() => setShowCreateModal(true)}
            totalAdmins={totalAdmins}
            activeAdmins={activeAdmins}
            lockedAdmins={lockedAdmins}
          />
        ) : (
          <AdminHeader
            onOpenCreate={() => setShowCreateModal(true)}
            onOpenImport={() => setShowImportModal(true)}
            totalUsers={totalUsers}
            activeUsers={activeUsers}
            lockedUsers={lockedUsers}
            totalTeachers={totalTeachers}
            totalStudents={totalStudents}
            totalParents={totalParents}
          />
        )}
      </div>

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setSuccess('Tạo người dùng thành công.');
          setTimeout(() => setSuccess(''), 3000);
          fetchUsers();
        }}
      />

      <EditUserModal
        open={showEditModal}
        userId={editingUserId}
        onClose={() => {
          setShowEditModal(false);
          setEditingUserId(null);
        }}
        onUpdated={() => {
          setSuccess('Cập nhật người dùng thành công.');
          setTimeout(() => setSuccess(''), 3000);
          fetchUsers();
          setShowEditModal(false);
          setEditingUserId(null);
        }}
      />

      <ImportUsersExcelModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        onImported={() => {
          setSuccess('Nhập Excel thành công.');
          setTimeout(() => setSuccess(''), 3000);
          fetchUsers();
        }}
      />

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
              {isSuperAdmin ? (
                <option value="ADMIN">Quản trị trường</option>
              ) : (
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
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngưng hoạt động</option>
              <option value="SUSPENDED">Bị khóa</option>
            </select>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Hiển thị {totalFiltered === 0 ? 0 : pageIndex * pageSize + 1}–
            {Math.min((pageIndex + 1) * pageSize, totalFiltered)} / {totalFiltered}{' '}
            {isSuperAdmin ? 'quản trị viên' : 'người dùng'}
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

              {isAdmin && selectedStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkClassModal(true);
                    fetchBulkClasses();
                  }}
                  disabled={bulkActionLoading}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Gán lớp ({selectedStudents.length} học sinh)
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 flex flex-col">
          {totalFiltered === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="text-4xl opacity-60">👥</div>
              <h3 className="text-base font-semibold text-slate-800">
                {users.length === 0
                  ? isSuperAdmin
                    ? 'Chưa có quản trị viên nào'
                    : 'Chưa có người dùng nào'
                  : 'Không tìm thấy người dùng phù hợp bộ lọc'}
              </h3>
              <p className="max-w-md text-sm text-slate-500">
                {users.length === 0
                  ? isSuperAdmin
                    ? 'Bắt đầu bằng cách tạo quản trị viên mới.'
                    : 'Bắt đầu bằng cách tạo người dùng mới.'
                  : 'Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.'}
              </p>
              <Link
                to="/users/create"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
              >
                <span className="text-lg leading-none">＋</span>
                <span>{isSuperAdmin ? 'Thêm quản trị mới' : 'Thêm người dùng mới'}</span>
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
                      {!isSuperAdmin && <th className="px-4 py-3 text-left">GVCN lớp</th>}
                      {isAdmin && <th className="px-4 py-3 text-left">Liên kết</th>}
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
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Quản trị trường
                              </span>
                            ) : (
                              (() => {
                                const { label, badgeClass } = getRoleBadgeConfig(userItem.role?.name);
                                if (!label) return <span className="text-slate-400">—</span>;
                                const badge =
                                  badgeClass === 'teacher'
                                    ? 'bg-sky-100 text-sky-700'
                                    : badgeClass === 'student'
                                    ? 'bg-amber-100 text-amber-700'
                                    : badgeClass === 'parent'
                                    ? 'bg-purple-100 text-purple-700'
                                    : badgeClass === 'admin'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-700';
                                return (
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
                                    {label}
                                  </span>
                                );
                              })()
                            )}
                          </td>

                          {!isSuperAdmin && (
                            <td className="px-4 py-3">
                              {(() => {
                                const roleName = userItem.role?.name?.toUpperCase() || '';
                                const isTeacherRole = roleName.includes('TEACHER') || roleName === 'TEACHER';
                                const homeroomClasses = Array.isArray(userItem.homeroomClasses) ? userItem.homeroomClasses : [];
                                if (!isTeacherRole) return <span className="text-slate-400">—</span>;
                                if (homeroomClasses.length === 0) return <span className="text-slate-500">Không</span>;
                                if (homeroomClasses.length === 1) {
                                  const cls = homeroomClasses[0];
                                  return (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                      {cls.name}
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                    onClick={() =>
                                      setLinkModal({
                                        type: 'classes',
                                        title: `GVCN lớp: ${userItem.fullName || 'giáo viên'}`,
                                        items: homeroomClasses,
                                        userName: userItem.fullName,
                                      })
                                    }
                                  >
                                    {homeroomClasses.length} lớp
                                  </button>
                                );
                              })()}
                            </td>
                          )}

                          {isAdmin && (
                            <td className="px-4 py-3">
                              {(() => {
                                const userRoleName = userItem.role?.name?.toUpperCase() || '';
                                const isStudentRole = userRoleName.includes('STUDENT') || userRoleName === 'STUDENT';
                                const isTeacherRole = userRoleName.includes('TEACHER') || userRoleName === 'TEACHER';
                                const isParentRole =
                                  userRoleName.includes('PARENT') ||
                                  userRoleName.includes('PHU HUYNH') ||
                                  userRoleName.includes('PHỤ HUYNH');

                                if (isStudentRole) {
                                  if (userItem.class && userItem.class.name) {
                                    return (
                                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                        {userItem.class.name}
                                      </span>
                                    );
                                  }
                                  return <span className="text-slate-500">Chưa có lớp</span>;
                                }

                                if (isTeacherRole) {
                                  const classes = Array.isArray(userItem.classes) ? userItem.classes : [];
                                  const count = classes.length;
                                  if (count > 0) {
                                    return (
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                        onClick={() =>
                                          setLinkModal({
                                            type: 'classes',
                                            title: `Lớp của ${userItem.fullName || 'giáo viên'}`,
                                            items: classes,
                                            userName: userItem.fullName,
                                          })
                                        }
                                      >
                                        {count} lớp
                                      </button>
                                    );
                                  }
                                  return <span className="text-slate-500">Chưa có lớp</span>;
                                }

                                if (isParentRole) {
                                  const children = Array.isArray(userItem.children) ? userItem.children : [];
                                  const count = userItem.childrenCount != null ? userItem.childrenCount : children.length;
                                  if (count > 0) {
                                    return (
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                        onClick={() =>
                                          setLinkModal({
                                            type: 'children',
                                            title: `Con của ${userItem.fullName || 'phụ huynh'}`,
                                            items: children,
                                            userName: userItem.fullName,
                                          })
                                        }
                                      >
                                        {count} con
                                      </button>
                                    );
                                  }
                                  return <span className="text-slate-500">Chưa liên kết con</span>;
                                }

                                return <span className="text-slate-400">—</span>;
                              })()}
                            </td>
                          )}

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
                                to="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingUserId(userItem.id);
                                  setShowEditModal(true);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                                aria-label="Sửa"
                              >
                                <Pencil size={15} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(userItem.id, userItem.fullName)}
                                disabled={deleteLoading === userItem.id}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors disabled:opacity-60"
                                aria-label="Xóa"
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
                      {Math.min((pageIndex + 1) * pageSize, totalFiltered)} / {totalFiltered}{' '}
                      {isSuperAdmin ? 'quản trị viên' : 'người dùng'}
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
                        <option value={50}>50</option>
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

      {/* Pagination đã được unify trong khối bảng phía trên */}

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
                      <button
                        type="button"
                        className="link-modal-item link-modal-item--clickable"
                        onClick={() => {
                          setLinkModal(null);
                          setEditingUserId(child.id);
                          setShowEditModal(true);
                        }}
                      >
                        {child.fullName || child.email || `#${child.id}`}
                        {child.email && <span className="link-modal-email"> — {child.email}</span>}
                      </button>
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




