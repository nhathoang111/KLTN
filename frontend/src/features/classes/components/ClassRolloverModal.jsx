import React from 'react';

const ClassRolloverModal = ({
  open,
  rolloverLoading,
  setShowRolloverModal,
  handleRolloverSubmit,
  user,
  rolloverSchoolId,
  setRolloverSchoolId,
  schools,
  rolloverFromYear,
  setRolloverFromYear,
  yearOptions,
  rolloverToYear,
  setRolloverToYear,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !rolloverLoading && setShowRolloverModal(false)}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-center text-2xl font-bold leading-tight text-slate-900">Chuyển niên khóa</h2>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={() => !rolloverLoading && setShowRolloverModal(false)}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleRolloverSubmit} className="space-y-4 px-6 py-5">
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Chuyển mọi lớp đang hoạt động từ niên khóa <strong>nguồn</strong> sang niên khóa <strong>đích</strong>: học sinh khối 10→11, 11→12
            (tự tạo lớp đích nếu chưa có). Các lớp <strong>khối 12</strong> ở niên khóa nguồn được <strong>lưu trữ</strong> (kết thúc cấp — enrollment ACTIVE
            chuyển INACTIVE), không tạo khối 13. Niên khóa đích nếu chưa có trong hệ thống sẽ được tạo mới.
          </p>
          {user?.role?.name?.toUpperCase() === 'SUPER_ADMIN' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Trường *</label>
              <select
                value={rolloverSchoolId}
                onChange={(e) => setRolloverSchoolId(e.target.value)}
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
            <label htmlFor="rollover-from-year-input" className="mb-1 block text-sm font-semibold text-slate-700">Niên khóa nguồn *</label>
            <input
              id="rollover-from-year-input"
              type="text"
              list="rollover-from-year-options"
              value={rolloverFromYear}
              onChange={(e) => setRolloverFromYear(e.target.value)}
              placeholder="VD: 2024-2025"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            <datalist id="rollover-from-year-options">
              {yearOptions.map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>
            <small className="mt-1 block text-xs text-slate-500">
              Gõ hoặc chọn gợi ý từ danh sách niên khóa đang có trong hệ thống.
            </small>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Niên khóa đích *</label>
            <input
              type="text"
              value={rolloverToYear}
              onChange={(e) => setRolloverToYear(e.target.value)}
              placeholder="VD: 2025-2026"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={rolloverLoading}
              onClick={() => setShowRolloverModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-60"
              disabled={rolloverLoading}
            >
              {rolloverLoading ? 'Đang xử lý…' : 'Thực hiện chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassRolloverModal;
