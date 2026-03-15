import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit3, Lock, Unlock, Trash2 } from 'lucide-react';

const SchoolTable = ({ schools, onEdit, onToggleLock, onDeleteClick }) => {
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  const handleToggleMenu = (id) => {
    setActionMenuOpenId((prev) => (prev === id ? null : id));
  };

  // Đóng menu khi click ra ngoài (bất kỳ đâu trong document)
  useEffect(() => {
    const handleDocumentClick = (event) => {
      const target = event.target;
      if (!target) return;
      // Nếu click không nằm trong cụm .schools-row-actions thì đóng menu
      const inActions = target.closest('.schools-row-actions');
      if (!inActions) {
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
    <div className="schools-table-container">
      <div className="schools-table-inner">
        <table className="schools-table">
        <thead>
          <tr>
            <th className="schools-col-name-header">TÊN TRƯỜNG</th>
            <th className="schools-col-code-header">MÃ TRƯỜNG</th>
            <th className="schools-col-address-header">ĐỊA CHỈ</th>
            <th className="schools-col-phone-header">SỐ ĐIỆN THOẠI</th>
            <th className="schools-col-email-header">EMAIL</th>
            <th className="schools-col-status-header">TRẠNG THÁI</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
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
              <tr key={school.id}>
                <td className="schools-col-name">{school.name}</td>
                <td className="schools-col-code">{school.code}</td>
                <td className="schools-col-address">{displayAddress}</td>
                <td className="schools-col-phone">{school.phone}</td>
                <td className="schools-col-email">{school.email}</td>
                <td className="schools-col-status">
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
                <td>
                  <div className="schools-row-actions">
                    <button
                      type="button"
                      className="schools-row-actions-trigger"
                      onClick={() => handleToggleMenu(school.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {actionMenuOpenId === school.id && (
                      <div className="schools-row-actions-menu">
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

