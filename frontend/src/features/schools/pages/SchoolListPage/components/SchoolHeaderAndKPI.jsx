import React from 'react';
import { Building2, CheckCircle2, Lock, Ban } from 'lucide-react';

const SchoolHeaderAndKPI = ({
  totalSchools,
  activeSchools,
  lockedSchools,
  inactiveSchools,
  onAddSchool,
}) => {
  return (
    <>
      <div className="school-header-row">
        <div>
          <h1 className="school-page-title">
            <span className="school-page-title-icon">
              <Building2 size={20} />
            </span>
            <span>Dashboard</span>
          </h1>
          <p className="school-page-subtitle">
            Tổng quan và quản lý danh sách trường học.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddSchool}
        >
          Thêm trường học
        </button>
      </div>

      <div className="school-kpi-row">
        <div className="school-kpi-card school-kpi-card--blue">
          <div className="school-kpi-top">
            <div className="school-kpi-label">Tổng số trường</div>
            <div className="school-kpi-icon-wrap school-kpi-icon-wrap--blue">
              <Building2 size={18} />
            </div>
          </div>
          <div className="school-kpi-value">{totalSchools}</div>
        </div>

        <div className="school-kpi-card school-kpi-card--green">
          <div className="school-kpi-top">
            <div className="school-kpi-label">Trường đang hoạt động</div>
            <div className="school-kpi-icon-wrap school-kpi-icon-wrap--green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="school-kpi-value">{activeSchools}</div>
        </div>

        <div className="school-kpi-card school-kpi-card--orange">
          <div className="school-kpi-top">
            <div className="school-kpi-label">Trường bị khóa</div>
            <div className="school-kpi-icon-wrap school-kpi-icon-wrap--orange">
              <Lock size={18} />
            </div>
          </div>
          <div className="school-kpi-value">{lockedSchools}</div>
        </div>

        <div className="school-kpi-card school-kpi-card--purple">
          <div className="school-kpi-top">
            <div className="school-kpi-label">Trường không hoạt động</div>
            <div className="school-kpi-icon-wrap school-kpi-icon-wrap--purple">
              <Ban size={18} />
            </div>
          </div>
          <div className="school-kpi-value">{inactiveSchools}</div>
        </div>
      </div>
    </>
  );
};

export default SchoolHeaderAndKPI;

