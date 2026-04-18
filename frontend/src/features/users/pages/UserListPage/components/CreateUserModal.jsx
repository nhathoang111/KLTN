import React, { useEffect } from 'react';
import UserCreateForm from '../../../components/UserCreateForm';

const CreateUserModal = ({ open, onClose, onCreated, isSuperAdmin = false }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={isSuperAdmin ? 'Thêm quản trị viên mới' : 'Thêm người dùng mới'}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white px-6 py-4 border-b border-gray-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold leading-tight text-slate-900">
              {isSuperAdmin ? 'Thêm quản trị viên mới' : 'Thêm người dùng mới'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSuperAdmin
                ? 'Điền thông tin bên dưới để tạo tài khoản quản trị trường.'
                : 'Điền thông tin bên dưới để tạo người dùng mới.'}
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
          <UserCreateForm
            showContainer={false}
            hideHeader
            mode={isSuperAdmin ? 'create-admin' : 'default'}
            onCancel={onClose}
            submitLabel={isSuperAdmin ? 'Tạo quản trị viên' : 'Tạo người dùng'}
            onCreated={(data) => {
              onCreated?.(data);
              onClose?.();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;

