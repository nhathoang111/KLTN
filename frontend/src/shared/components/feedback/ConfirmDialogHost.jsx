import React, { useEffect, useRef, useState } from 'react';
import { registerConfirmHandler } from '../../lib/confirmDialog';
import './ConfirmDialogHost.css';

const defaultDialog = {
  title: 'Xác nhận thao tác',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  variant: 'danger',
};

const ConfirmDialogHost = () => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  useEffect(() => {
    return registerConfirmHandler((options) => {
      setDialog({ ...defaultDialog, ...options });
      return new Promise((resolve) => {
        resolverRef.current = resolve;
      });
    });
  }, []);

  const close = (confirmed) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolver?.(confirmed);
  };

  if (!dialog) return null;

  return (
    <div className="app-confirm-overlay" onClick={() => close(false)}>
      <div className="app-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="app-confirm-header">
          <h2>{dialog.title}</h2>
          <button type="button" className="app-confirm-close" onClick={() => close(false)}>
            ×
          </button>
        </div>
        <div className="app-confirm-body">
          {String(dialog.message || '')
            .split('\n')
            .map((line, index) => (
              <p key={index}>{line || '\u00A0'}</p>
            ))}
        </div>
        <div className="app-confirm-actions">
          <button type="button" className="app-confirm-btn app-confirm-btn--secondary" onClick={() => close(false)}>
            {dialog.cancelText}
          </button>
          <button
            type="button"
            className={`app-confirm-btn app-confirm-btn--${dialog.variant}`}
            onClick={() => close(true)}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialogHost;
