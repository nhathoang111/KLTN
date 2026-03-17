import React from 'react';

const AdminHeader = ({
  onOpenCreate,
  onOpenImport,
  totalUsers,
  activeUsers,
  lockedUsers,
  totalTeachers,
  totalStudents,
  totalParents
}) => {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý giáo viên, học sinh và phụ huynh trong trường của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
          >
            <span className="text-lg leading-none">＋</span>
            <span>Thêm người dùng mới</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={onOpenImport}
          >
            <span className="text-sm">📤</span>
            <span>Nhập từ Excel</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng số người dùng</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalUsers}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-lg">
              👥
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-md shadow-emerald-500/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Đang hoạt động</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeUsers}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg">
              ✓
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bị khóa / ngưng</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{lockedUsers}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg">
              ⛔
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giáo viên</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalTeachers}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 text-lg">
              👩‍🏫
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Học sinh</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalStudents}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700 text-lg">
              🎒
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phụ huynh</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalParents}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-700 text-lg">
              👨‍👩‍👧
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminHeader;

