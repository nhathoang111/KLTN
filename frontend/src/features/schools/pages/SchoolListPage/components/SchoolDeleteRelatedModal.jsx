import React from 'react';

const SchoolDeleteRelatedModal = ({
  show,
  schoolToDelete,
  relatedData,
  loadingRelatedData,
  deletingItem,
  onClose,
  onDeleteAllRelated,
  onDeleteAll,
  onDeleteItem,
}) => {
  if (!show || !schoolToDelete) return null;

  return (
    <div className="common-modal-overlay">
      <div
        className="common-modal"
        style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="common-modal-header">
          <h2>Xóa trường học: {schoolToDelete.name}</h2>
          <button className="common-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="common-modal-body" style={{ padding: '20px' }}>
          {loadingRelatedData ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {relatedData.userCount === 0 &&
              relatedData.roleCount === 0 &&
              relatedData.classCount === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    marginBottom: '20px',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: '#065f46',
                      fontWeight: '600',
                    }}
                  >
                    ✓ Không có dữ liệu liên quan. Bạn có thể xóa trường học này
                    ngay.
                  </p>
                </div>
              ) : (
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  Trước khi xóa trường học, bạn cần xóa hoặc chuyển các dữ liệu
                  liên quan sau:
                </p>
              )}

              {/* Users Section */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    Người dùng ({relatedData.userCount})
                  </h3>
                </div>
                {relatedData.users.length > 0 ? (
                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  >
                    {relatedData.users.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: '1px solid #e1e5e9',
                        }}
                      >
                        <span>
                          {user.fullName || user.email} (
                          {user.role?.name || 'Không có'})
                        </span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onDeleteItem('user', user.id)}
                          disabled={
                            deletingItem?.type === 'user' &&
                            deletingItem?.id === user.id
                          }
                        >
                          {deletingItem?.type === 'user' &&
                          deletingItem?.id === user.id
                            ? 'Đang xóa...'
                            : 'Xóa'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      color: '#999',
                      fontStyle: 'italic',
                      padding: '12px',
                    }}
                  >
                    Không có người dùng
                  </p>
                )}
              </div>

              {/* Roles Section */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    Phân quyền ({relatedData.roleCount})
                  </h3>
                </div>
                {relatedData.roles.length > 0 ? (
                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  >
                    {relatedData.roles.map((role) => (
                      <div
                        key={role.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: '1px solid #e1e5e9',
                        }}
                      >
                        <span>
                          {role.name}{' '}
                          {role.description ? `- ${role.description}` : ''}
                        </span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onDeleteItem('role', role.id)}
                          disabled={
                            deletingItem?.type === 'role' &&
                            deletingItem?.id === role.id
                          }
                        >
                          {deletingItem?.type === 'role' &&
                          deletingItem?.id === role.id
                            ? 'Đang xóa...'
                            : 'Xóa'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      color: '#999',
                      fontStyle: 'italic',
                      padding: '12px',
                    }}
                  >
                    Không có phân quyền
                  </p>
                )}
              </div>

              {/* Classes Section */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    Lớp học ({relatedData.classCount})
                  </h3>
                </div>
                {relatedData.classes.length > 0 ? (
                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  >
                    {relatedData.classes.map((cls) => (
                      <div
                        key={cls.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: '1px solid #e1e5e9',
                        }}
                      >
                        <span>
                          {cls.name}{' '}
                          {cls.schoolYear ? `(${cls.schoolYear})` : ''}
                        </span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onDeleteItem('class', cls.id)}
                          disabled={
                            deletingItem?.type === 'class' &&
                            deletingItem?.id === cls.id
                          }
                        >
                          {deletingItem?.type === 'class' &&
                          deletingItem?.id === cls.id
                            ? 'Đang xóa...'
                            : 'Xóa'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      color: '#999',
                      fontStyle: 'italic',
                      padding: '12px',
                    }}
                  >
                    Không có lớp học
                  </p>
                )}
              </div>

              {/* Summary */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #fbbf24',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: '600',
                    color: '#92400e',
                  }}
                >
                  Tổng cộng:{' '}
                  {relatedData.userCount +
                    relatedData.roleCount +
                    relatedData.classCount}{' '}
                  mục dữ liệu liên quan
                </p>
              </div>
            </>
          )}
        </div>
        <div
          className="common-modal-actions"
          style={{
            padding: '20px',
            borderTop: '1px solid #e1e5e9',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          {(relatedData.userCount > 0 ||
            relatedData.roleCount > 0 ||
            relatedData.classCount > 0) && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onDeleteAllRelated}
              style={{
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
              }}
            >
              Xóa toàn bộ
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDeleteAll}
            disabled={
              relatedData.userCount > 0 ||
              relatedData.roleCount > 0 ||
              relatedData.classCount > 0
            }
            style={{
              opacity:
                relatedData.userCount > 0 ||
                relatedData.roleCount > 0 ||
                relatedData.classCount > 0
                  ? 0.5
                  : 1,
              cursor:
                relatedData.userCount > 0 ||
                relatedData.roleCount > 0 ||
                relatedData.classCount > 0
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            Xóa trường học
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchoolDeleteRelatedModal;

