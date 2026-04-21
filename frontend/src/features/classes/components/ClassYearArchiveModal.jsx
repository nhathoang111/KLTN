import React from 'react';

const ClassYearArchiveModal = ({
  open,
  yearArchiveLoading,
  setShowYearArchiveModal,
  handleYearArchiveSubmit,
  user,
  archiveYearSchoolId,
  setArchiveYearSchoolId,
  schools,
  yearArchiveSchoolYear,
  setYearArchiveSchoolYear,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => {
        if (!yearArchiveLoading) setShowYearArchiveModal(false);
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-center text-2xl font-bold leading-tight text-slate-900">Kết thúc niên khóa</h2>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={() => !yearArchiveLoading && setShowYearArchiveModal(false)}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleYearArchiveSubmit} className="space-y-4 px-6 py-5">
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Mọi lớp đang hoạt động thuộc niên khóa này sẽ chuyển sang <strong>ARCHIVED</strong>; enrollment ACTIVE của học sinh trên các lớp đó sẽ chuyển <strong>INACTIVE</strong>.
          </p>
          {user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Trường *</label>
              <select
                value={archiveYearSchoolId}
                onChange={(e) => setArchiveYearSchoolId(e.target.value)}
                required
                className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Chọn trường</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tên niên khóa *</label>
            <input
              type="text"
              value={yearArchiveSchoolYear}
              onChange={(e) => setYearArchiveSchoolYear(e.target.value)}
              placeholder="VD: 2024-2025"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={yearArchiveLoading}
              onClick={() => setShowYearArchiveModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-60"
              disabled={yearArchiveLoading}
            >
              {yearArchiveLoading ? 'Đang xử lý…' : 'Lưu trữ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassYearArchiveModal;
