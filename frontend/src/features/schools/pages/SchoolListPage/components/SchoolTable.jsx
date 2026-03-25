import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit3, Lock, Unlock, Trash2 } from 'lucide-react';

const SchoolTable = ({ schools, onEdit, onToggleLock, onDeleteClick }) => {
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const isAnyMenuOpen = actionMenuOpenId !== null;

  const handleToggleMenu = (id, event) => {
    const nextOpen = actionMenuOpenId !== id;
    if (nextOpen) {
      const rect = event.currentTarget.getBoundingClientRect();
      // Match CSS min-width (~140px) + padding/rounding
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.right - 150,
      });
      setActionMenuOpenId(id);
    } else {
      setActionMenuOpenId(null);
    }
  };

  // Đóng menu khi click ra ngoài (bất kỳ đâu trong document)
  useEffect(() => {
    const handleDocumentClick = (event) => {
      const target = event.target;
      if (!target) return;
      // Nếu click không nằm trong menu hoặc nút trigger thì đóng menu
      const inMenu = target.closest('.schools-row-actions-menu');
      const inTrigger = target.closest('.schools-row-actions-trigger');
      if (!inMenu && !inTrigger) {
        setActionMenuOpenId(null);
      }
    };

    if (actionMenuOpenId !== null) {
      document.addEventListener('click', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [actionMenuOpenId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="schools-col-name-header px-4 py-3 text-left">TÊN TRƯỜNG</th>
            <th className="schools-col-code-header px-4 py-3 text-left">MÃ TRƯỜNG</th>
            <th className="schools-col-address-header px-4 py-3 text-left">ĐỊA CHỈ</th>
            <th className="schools-col-phone-header px-4 py-3 text-left">SỐ ĐIỆN THOẠI</th>
            <th className="schools-col-email-header px-4 py-3 text-left">EMAIL</th>
            <th className="schools-col-status-header px-4 py-3 text-left">TRẠNG THÁI</th>
            <th className="px-4 py-3 text-center"></th>
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {schools.map((school) => {
            let displayAddress = '';
            if (school.province || school.district || school.ward) {
              const addressParts = [
                school.address,
                school.ward,
                school.district,
                school.province,
              ].filter((part) => part && part.trim());
              displayAddress = addressParts.join(', ');
            } else {
              displayAddress = school.address || '';
            }

            const isLocked =
              school.status === 'LOCKED' || school.status === 'INACTIVE';

            return (
              <tr key={school.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="schools-col-name px-4 py-3">{school.name}</td>
                <td className="schools-col-code px-4 py-3">{school.code}</td>
                <td className="schools-col-address px-4 py-3">{displayAddress}</td>
                <td className="schools-col-phone px-4 py-3">{school.phone}</td>
                <td className="schools-col-email px-4 py-3">{school.email}</td>
                <td className="schools-col-status px-4 py-3">
                  <span
                    className={`schools-status-badge ${
                      school.status === 'ACTIVE'
                        ? 'schools-status-badge--active'
                        : 'schools-status-badge--locked'
                    }`}
                  >
                    {school.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="schools-row-actions">
                    <button
                      type="button"
                      className="schools-row-actions-trigger"
                      onClick={(e) => handleToggleMenu(school.id, e)}
                      style={isAnyMenuOpen ? { visibility: "hidden" } : undefined}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {actionMenuOpenId === school.id && (
                      <div
                        className="schools-row-actions-menu"
                        style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, right: 'auto' }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActionMenuOpenId(null);
                            onEdit(school);
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionMenuOpenId(null);
                            onToggleLock(school);
                          }}
                        >
                          {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                          <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setActionMenuOpenId(null);
                            onDeleteClick(school.id);
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchoolTable;

