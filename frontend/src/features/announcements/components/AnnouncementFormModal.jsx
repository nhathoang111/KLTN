import React, { useEffect, useState } from 'react';

const AnnouncementFormModal = ({
  showModal,
  editingAnnouncement,
  handleCloseModal,
  handleSubmit,
  formData,
  setFormData,
  userRole,
  userSchoolId,
  schools,
  classes,
  user,
  getUserName,
  onSchoolChange,
}) => {
  if (!showModal) return null;

  const [scope, setScope] = useState('SCHOOL'); // 'SCHOOL' | 'CLASS'

  useEffect(() => {
    // Sync scope from current formData when opening/editing
    setScope(formData.classId ? 'CLASS' : 'SCHOOL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAnnouncement, showModal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={handleCloseModal}>
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-center text-2xl font-bold leading-tight text-slate-900">{editingAnnouncement ? 'Sửa thông báo' : 'Thêm thông báo'}</h2>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tiêu đề *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nội dung *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows="6"
              required
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trường *</label>
            {(userRole === 'ADMIN' || userRole === 'TEACHER') && userSchoolId ? (
              <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <strong>{schools.find((s) => s.id === userSchoolId)?.name || 'N/A'}</strong>
              </div>
            ) : (
              <select
                value={formData.schoolId}
                onChange={(e) => onSchoolChange(e.target.value)}
                required
                className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Chọn trường</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Thông báo gửi cho:</label>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setScope('SCHOOL');
                  setFormData({ ...formData, classId: '' });
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  scope === 'SCHOOL'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Toàn trường
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('CLASS');
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  scope === 'CLASS'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Theo lớp
              </button>
              <span className="text-xs text-slate-500">
                {scope === 'CLASS'
                  ? 'Chọn một lớp bên dưới để gửi theo lớp.'
                  : 'Gửi cho toàn trường (không theo lớp).'}
              </span>
            </div>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              disabled={!formData.schoolId || scope !== 'CLASS'}
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">{scope === 'CLASS' ? 'Chọn lớp' : 'Toàn trường'}</option>
              {classes
                .filter((classItem) => formData.schoolId && classItem.school?.id === parseInt(formData.schoolId))
                .map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
            </select>
            {formData.schoolId && classes.filter((c) => c.school?.id === parseInt(formData.schoolId)).length === 0 && (
              <small className="mt-1 block text-xs text-slate-500">Trường này chưa có lớp học</small>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Người tạo *</label>
            {editingAnnouncement ? (
              editingAnnouncement.createdBy ? (
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  <strong>{editingAnnouncement.createdBy.fullName || getUserName(editingAnnouncement.createdBy?.id)}</strong>
                  <span className="text-slate-500"> ({editingAnnouncement.createdBy.role?.name || 'N/A'})</span>
                </div>
              ) : (
                user && (
                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    <strong>{user.fullName}</strong> <span className="text-slate-500">({user.role?.name || 'N/A'})</span>
                  </div>
                )
              )
            ) : (
              user && (
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  <strong>{user.fullName}</strong> <span className="text-slate-500">({user.role?.name || 'N/A'})</span>
                </div>
              )
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={handleCloseModal}>
              Hủy
            </button>
            <button type="submit" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500">
              {editingAnnouncement ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementFormModal;
