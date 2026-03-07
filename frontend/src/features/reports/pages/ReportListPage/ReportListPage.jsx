import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './ReportListPage.css';

const ReportListPage = () => {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('exam-scores');
  const [filters, setFilters] = useState({
    schoolId: '',
    classId: '',
    subjectId: '',
    startNgày: '',
    endNgày: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schoolsRes, classesRes, subjectsRes] = await Promise.all([
        api.get('/schools'),
        api.get('/classes'),
        api.get('/subjects')
      ]);

      setSchools(schoolsRes.data.schools || []);
      setClasses(classesRes.data.classes || []);
      setSubjects(subjectsRes.data.subjects || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.schoolId) params.append('schoolId', filters.schoolId);
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/reports/${reportType}?${params}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append('reportType', reportType);

      if (filters.schoolId) params.append('schoolId', filters.schoolId);
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/reports/export/excel?${params}`);
      alert('Excel export: ' + response.data.message);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const exportToPdf = async () => {
    try {
      const params = new URLSearchParams();
      params.append('reportType', reportType);

      if (filters.schoolId) params.append('schoolId', filters.schoolId);
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/reports/export/pdf?${params}`);
      alert('PDF export: ' + response.data.message);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Không có';
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'Không có';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Không có';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không có';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="report-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="report-list-page">
      <div className="common-page-header">
        <h1>Báo cáo & Thống kê</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={exportToExcel}
            disabled={!reportData}
          >
            Xuất Excel
          </button>
          <button
            className="btn btn-secondary"
            onClick={exportToPdf}
            disabled={!reportData}
          >
            Xuất PDF
          </button>
        </div>
      </div>

      <div className="report-controls">
        <div className="control-group">
          <label>Loại báo cáo</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="exam-scores">Báo cáo điểm số</option>
            <option value="attendance">Báo cáo chuyên cần</option>
            <option value="behavior">Báo cáo hành vi</option>
          </select>
        </div>

        <div className="control-group">
          <label>Trường</label>
          <select
            value={filters.schoolId}
            onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
          >
            <option value="">Tất cả trường</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Lớp</label>
          <select
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
          >
            <option value="">Tất cả lớp</option>
            {classes.map(classItem => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>

        {reportType === 'exam-scores' && (
          <div className="control-group">
            <label>Môn học</label>
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">Tất cả môn</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="control-group">
          <label>Từ ngày</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startNgày: e.target.value })}
          />
        </div>

        <div className="control-group">
          <label>Đến ngày</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endNgày: e.target.value })}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={generateReport}
        >
          Tạo báo cáo
        </button>
      </div>

      {reportData && (
        <div className="report-results">
          <div className="report-summary">
            <h3>Tóm tắt báo cáo</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Tổng số bản ghi:</span>
                <span className="stat-value">{reportData.totalRecords}</span>
              </div>

              {reportData.averageScore !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Điểm trung bình:</span>
                  <span className="stat-value">{reportData.averageScore.toFixed(2)}</span>
                </div>
              )}

              {reportData.maxScore !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Điểm cao nhất:</span>
                  <span className="stat-value">{reportData.maxScore}</span>
                </div>
              )}

              {reportData.minScore !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Điểm thấp nhất:</span>
                  <span className="stat-value">{reportData.minScore}</span>
                </div>
              )}

              {reportData.attendanceRate !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Tỷ lệ có mặt:</span>
                  <span className="stat-value">{reportData.attendanceRate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Học sinh</th>
                  <th>Lớp</th>
                  <th>Môn học</th>
                  {reportType === 'exam-scores' && <th>Điểm</th>}
                  {reportType === 'attendance' && <th>Trạng thái</th>}
                  {reportType === 'behavior' && <th>Hành vi</th>}
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records?.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.student?.fullName || 'Không có'}</td>
                    <td>{getClassName(record.classEntity?.id)}</td>
                    <td>{getSubjectName(record.subject?.id)}</td>
                    {reportType === 'exam-scores' && (
                      <td>
                        <span className={`score ${record.value >= 8 ? 'good' : record.value >= 6.5 ? 'average' : 'poor'}`}>
                          {record.value}
                        </span>
                      </td>
                    )}
                    {reportType === 'attendance' && (
                      <td>
                        <span className={`status-badge ${record.status?.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </td>
                    )}
                    {reportType === 'behavior' && (
                      <td>
                        <span className={`status-badge ${record.status?.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </td>
                    )}
                    <td>{record.note || 'Không có'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportListPage;

