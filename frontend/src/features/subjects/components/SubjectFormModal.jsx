import React from 'react';

const SubjectFormModal = ({
  showModal,
  handleCloseModal,
  editingSubject,
  handleSubmit,
  formError,
  formData,
  setFormData,
  user,
  schools,
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={handleCloseModal}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-center text-2xl font-bold leading-tight text-slate-900">{editingSubject ? 'Sửa môn học' : 'Thêm môn học'}</h2>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-auto px-6 py-5">
          {formError && (
            <div
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tên môn học *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mã môn học *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trường *</label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
              disabled={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id}
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Chọn trường</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={handleCloseModal}>
              Hủy
            </button>
            <button type="submit" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500">
              {editingSubject ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectFormModal;
