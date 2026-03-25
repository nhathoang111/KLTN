import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../../../shared/lib/api';

const ImportUsersExcelModal = ({ open, onClose, user, onImported }) => {
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

  const templateUrl = useMemo(() => {
    const base = api.defaults.baseURL || `${window.location.origin}/api`;
    return `${base}/users/import-template`;
  }, []);

  if (!open) return null;

  return (
    <div className="common-modal-overlay" onClick={() => !importLoading && onClose?.()}>
      <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="common-modal-header">
          <h2>Nhập người dùng từ Excel</h2>
          <button type="button" className="common-close-btn" onClick={() => !importLoading && onClose?.()}>
            ×
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#555' }}>
            Tải file mẫu, điền thông tin (Email, Họ tên, Mật khẩu, Vai trò, Mã trường, Mã lớp), sau đó chọn file và nhấn Tải lên.
          </p>
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ marginBottom: '1rem', display: 'inline-block' }}
          >
            ⬇ Tải file mẫu Excel
          </a>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!importFile) {
                setImportError('Vui lòng chọn file Excel');
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
                setImportError(null);
                setImportFile(null);
                onImported?.(res.data);
              } catch (err) {
                const msg =
                  err.response?.data?.error ||
                  err.response?.data?.message ||
                  err.message ||
                  'Nhập dữ liệu thất bại';
                setImportError(msg);
                setImportResult(null);
              } finally {
                setImportLoading(false);
              }
            }}
          >
            <div className="common-form-group">
              <label>Chọn file (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={importLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={importLoading || !importFile}>
                {importLoading ? 'Đang xử lý...' : 'Tải lên'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => !importLoading && onClose?.()}>
                Đóng
              </button>
            </div>
          </form>

          {importError && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            >
              <strong>❌ Lỗi:</strong> {importError}
            </div>
          )}

          {importResult && (
            <div style={{ marginTop: '1rem' }}>
              {(() => {
                const successCount = Number(importResult?.successCount ?? 0);
                const failCount = Number(importResult?.failCount ?? 0);
                const errorsCount = importResult?.errors?.length ?? 0;

                return (
                  <>
                    {successCount > 0 && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#166534',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          marginBottom: failCount > 0 ? '0.75rem' : 0
                        }}
                      >
                        <strong>✅ Thành công:</strong> Đã thêm {successCount} người dùng.
                      </div>
                    )}

                    {(failCount > 0 || errorsCount > 0) && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: successCount > 0 ? '#fffbeb' : '#fef2f2',
                          border: `1px solid ${successCount > 0 ? '#fde68a' : '#fecaca'}`,
                          color: successCount > 0 ? '#92400e' : '#b91c1c',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>
                            {successCount > 0 ? '⚠️ Một số dòng lỗi' : '❌ Lỗi'}:
                          </strong>{' '}
                          {failCount > 0 ? failCount : errorsCount} dòng không thêm được.
                        </p>
                        {importResult.errors?.length > 0 && (
                          <ul
                            style={{
                              marginTop: '0.5rem',
                              paddingLeft: '1.25rem',
                              maxHeight: '180px',
                              overflow: 'auto',
                              marginBottom: 0
                            }}
                          >
                            {importResult.errors.map((err, i) => (
                              <li key={i}>
                                Dòng {err.row}: {err.email || '(trống)'} – {err.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {successCount === 0 && failCount === 0 && errorsCount === 0 && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#f5f5f5',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      >
                        Không có dòng dữ liệu nào để xử lý (file trống hoặc không có dòng hợp lệ).
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportUsersExcelModal;

