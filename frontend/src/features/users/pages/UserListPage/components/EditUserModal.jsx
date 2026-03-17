import React, { useEffect } from 'react';
import UserEditForm from '../../../components/UserEditForm';

const EditUserModal = ({ open, userId, onClose, onUpdated }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !userId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa người dùng"
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white px-6 py-4 border-b border-gray-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold leading-tight text-slate-900">Chỉnh sửa người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cập nhật thông tin và nhấn “Cập nhật” để lưu thay đổi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-6 pt-10 pb-5">
          <UserEditForm
            userId={userId}
            showContainer={false}
            hideHeader
            onCancel={onClose}
            onUpdated={() => {
              onUpdated?.();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;

