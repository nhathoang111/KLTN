import React from 'react';

const SubjectClassLinksModal = ({ linkModal, setLinkModal }) => {
  if (!linkModal) return null;

  return (
    <div className="common-modal-overlay" onClick={() => setLinkModal(null)}>
      <div className="common-modal" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h2>Lớp đang học môn: {linkModal.subject?.name}</h2>
          <button className="common-close-btn" onClick={() => setLinkModal(null)} type="button">×</button>
        </div>
        <div className="common-modal-body" style={{ padding: '1rem 1.5rem' }}>
          {linkModal.classes === null ? (
            <p className="text-muted">Đang tải...</p>
          ) : linkModal.classes.length === 0 ? (
            <p className="text-muted">Chưa có lớp nào.</p>
          ) : (
            <ul className="subject-class-links-list">
              {linkModal.classes.map((cls) => (
                <li key={cls.id}>{cls.name || `Lớp #${cls.id}`}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectClassLinksModal;
