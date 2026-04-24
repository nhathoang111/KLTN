import React from 'react';

const ClassFormModal = ({
  open,
  editingClass,
  formData,
  setFormData,
  handleSubmit,
  handleCloseModal,
  user,
  schools,
  availableHomeroomTeachers,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={handleCloseModal}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-center text-2xl font-bold leading-tight text-slate-900">
            {editingClass ? 'Sửa lớp học' : 'Thêm lớp học'}
          </h2>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Khối *</label>
            <select
              value={formData.gradeLevel}
              onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Chọn khối</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số lớp *</label>
            <input
              type="number"
              min="1"
              value={formData.classNumber}
              onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
              placeholder="VD: 1, 2, 3"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Năm học *</label>
            <input
              type="text"
              value={typeof formData.schoolYear === 'string' ? formData.schoolYear : (formData.schoolYear?.name ?? '')}
              onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
              placeholder="VD: 2024-2025"
              pattern="\d{4}-\d{4}"
              title="Niên khóa phải đúng định dạng YYYY-YYYY (ví dụ 2024-2025)"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          {formData.gradeLevel && formData.classNumber && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              Tên lớp sẽ là:{' '}
              <strong>
                {formData.gradeLevel}/{formData.classNumber}
                {formData.schoolYear ? ` (${(typeof formData.schoolYear === 'string' ? formData.schoolYear : formData.schoolYear?.name || '').trim()})` : ''}
              </strong>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Sĩ số tối đa *</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              min="1"
              max="50"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Phòng học</label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="VD: A101, B205"
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">Phòng học cố định của lớp (tất cả tiết học sẽ diễn ra tại phòng này).</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trường *</label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value, homeroomTeacherId: '' })}
              disabled={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id}
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
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Giáo viên chủ nhiệm</label>
            <select
              value={formData.homeroomTeacherId}
              onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
              disabled={!formData.schoolId}
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">{formData.schoolId ? 'Chọn giáo viên' : 'Chọn trường trước'}</option>
              {availableHomeroomTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={handleCloseModal}>
              Hủy
            </button>
            <button type="submit" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500">
              {editingClass ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassFormModal;
