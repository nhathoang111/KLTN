import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import api from '../../../../../shared/lib/api';

const ImportUsersExcelModal = ({ open, onClose, user, onImported }) => {
  const fileInputId = useId();
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setImportFile(null);
    setImportLoading(false);
    setImportResult(null);
    setImportError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !importLoading) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, importLoading]);

  const handleDownloadTemplate = async () => {
    try {
      setImportError(null);
      const response = await api.get('/users/import-template', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mau_nhap_nguoi_dung.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading user import template:', err);
      setImportError(err.response?.data?.message || err.response?.data?.error || 'Không thể tải file mẫu Excel.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Vui lòng chọn file Excel.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const headers = { 'X-User-Role': user?.role?.name || '' };
      if (user?.school?.id != null) headers['X-User-School-Id'] = String(user.school.id);
      const res = await api.post('/users/import', formData, { headers });
      setImportResult(res.data);
      setImportFile(null);
      onImported?.(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Nhập dữ liệu thất bại.';
      setImportError(msg);
      setImportResult(null);
    } finally {
      setImportLoading(false);
    }
  };

  if (!open) return null;

  const successCount = Number(importResult?.successCount ?? 0);
  const failCount = Number(importResult?.failCount ?? 0);
  const errorsCount = importResult?.errors?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !importLoading && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Nhập người dùng từ Excel"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-gray-300 bg-white px-6 py-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold leading-tight text-slate-900">Nhập người dùng từ Excel</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tải file mẫu, điền thông tin người dùng, sau đó chọn file để nhập dữ liệu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !importLoading && onClose?.()}
            disabled={importLoading}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-auto px-6 pt-6 pb-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <FileSpreadsheet size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">File mẫu Excel</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  File cần có các cột Email, Họ tên, Mật khẩu, Vai trò, Mã trường và Mã lớp.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={importLoading}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} />
                  <span>Tải file mẫu</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor={fileInputId} className="mb-2 block text-sm font-semibold text-slate-800">
              Chọn file Excel
            </label>
            <label
              htmlFor={fileInputId}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all ${
                importFile
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700'
              } ${importLoading ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <Upload size={24} />
              <span className="mt-2 text-sm font-semibold">
                {importFile ? importFile.name : 'Bấm để chọn file .xlsx hoặc .xls'}
              </span>
              <span className="mt-1 text-xs text-slate-500">Chỉ hỗ trợ định dạng Excel.</span>
            </label>
            <input
              id={fileInputId}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              disabled={importLoading}
              className="sr-only"
            />
          </div>

          {importError && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-semibold">Lỗi</p>
                <p className="mt-0.5">{importError}</p>
              </div>
            </div>
          )}

          {importResult && (
            <div className="mt-4 space-y-3">
              {successCount > 0 && (
                <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-semibold">Thành công</p>
                    <p className="mt-0.5">Đã thêm {successCount} người dùng.</p>
                  </div>
                </div>
              )}

              {(failCount > 0 || errorsCount > 0) && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    successCount > 0
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-semibold">{successCount > 0 ? 'Một số dòng bị lỗi' : 'Lỗi'}</p>
                      <p className="mt-0.5">{failCount > 0 ? failCount : errorsCount} dòng không thể thêm.</p>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <ul className="mt-3 max-h-44 list-disc overflow-auto pl-10">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          Dòng {err.row}: {err.email || '(trống)'} - {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {successCount === 0 && failCount === 0 && errorsCount === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Không có dòng dữ liệu nào được xử lý. File có thể đang trống hoặc thiếu dòng hợp lệ.
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => !importLoading && onClose?.()}
              disabled={importLoading}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={importLoading || !importFile}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              <Upload size={16} />
              <span>{importLoading ? 'Đang xử lý...' : 'Tải lên'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportUsersExcelModal;
