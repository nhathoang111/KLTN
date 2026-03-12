import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const SchoolFilterBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalSchools,
  filteredCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    onStatusFilterChange('ALL');
    setIsOpen(false);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="schools-top-row">
        <div className="schools-search">
          <span className="schools-search-icon">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên trường..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="schools-filter-btn"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Filter size={16} />
          <span>Bộ lọc</span>
        </button>
      </div>

      {isOpen && (
        <div className="schools-filter-popover">
          <div className="schools-filter-header">
            <span>Bộ lọc nâng cao</span>
          </div>
          <div className="schools-filter-section">
            <div className="schools-filter-label">Trạng thái trường</div>
            <div className="schools-filter-chips">
              <button
                type="button"
                className={`schools-filter-chip ${statusFilter === 'ALL' ? 'schools-filter-chip--active' : ''
                  }`}
                onClick={() => onStatusFilterChange('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`schools-filter-chip ${statusFilter === 'ACTIVE' ? 'schools-filter-chip--active' : ''
                  }`}
                onClick={() => onStatusFilterChange('ACTIVE')}
              >
                Đang hoạt động
              </button>
              <button
                type="button"
                className={`schools-filter-chip ${statusFilter === 'LOCKED' ? 'schools-filter-chip--active' : ''
                  }`}
                onClick={() => onStatusFilterChange('LOCKED')}
              >
                Bị khóa
              </button>
              <button
                type="button"
                className={`schools-filter-chip ${statusFilter === 'INACTIVE' ? 'schools-filter-chip--active' : ''
                  }`}
                onClick={() => onStatusFilterChange('INACTIVE')}
              >
                Không hoạt động
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="schools-summary">
        Hiển thị <strong>{filteredCount}</strong> / {totalSchools} trường
      </div>
    </>
  );
};

export default SchoolFilterBar;

