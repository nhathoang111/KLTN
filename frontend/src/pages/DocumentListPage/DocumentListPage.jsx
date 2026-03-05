import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './DocumentListPage.css';

const DocumentListPage = () => {
  const [documents, setDocuments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileName: '',
    filePath: '',
    fileSize: '',
    fileType: '',
    schoolId: '',
    classId: '',
    uploadedById: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [documentsRes, schoolsRes, classesRes, usersRes] = await Promise.all([
        api.get('/documents'),
        api.get('/schools'),
        api.get('/classes'),
        api.get('/users')
      ]);

      setDocuments(documentsRes.data.documents || []);
      setSchools(schoolsRes.data.schools || []);
      setClasses(classesRes.data.classes || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        fileSize: formData.fileSize ? parseInt(formData.fileSize) : null,
        schoolId: parseInt(formData.schoolId),
        classId: formData.classId ? parseInt(formData.classId) : null,
        uploadedById: parseInt(formData.uploadedById)
      };

      if (editingDocument) {
        await api.put(`/documents/${editingDocument.id}`, submitData);
      } else {
        await api.post('/documents', submitData);
      }

      setShowModal(false);
      setEditingDocument(null);
      setFormData({
        title: '',
        description: '',
        fileName: '',
        filePath: '',
        fileSize: '',
        fileType: '',
        schoolId: '',
        classId: '',
        uploadedById: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setFormData({
      title: document.title || '',
      description: document.description || '',
      fileName: document.fileName || '',
      filePath: document.filePath || '',
      fileSize: document.fileSize?.toString() || '',
      fileType: document.fileType || '',
      schoolId: document.school?.id?.toString() || '',
      classId: document.classEntity?.id?.toString() || '',
      uploadedById: document.uploadedBy?.id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      try {
        await api.delete(`/documents/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDocument(null);
    setFormData({
      title: '',
      description: '',
      fileName: '',
      filePath: '',
      fileSize: '',
      fileType: '',
      schoolId: '',
      classId: '',
      uploadedById: ''
    });
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'N/A';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'N/A';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="document-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="document-list-page">
      <div className="common-page-header">
        <h1>Quản lý tài liệu</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          Thêm tài liệu
        </button>
      </div>

      <div className="common-table-container documents-table-container">
        <table className="common-table documents-table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Tên file</th>
              <th>Loại file</th>
              <th>Kích thước</th>
              <th>Lớp</th>
              <th>Người upload</th>
              <th>Ngày upload</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.title}</td>
                <td>{document.fileName}</td>
                <td>
                  <span className="file-type-badge">
                    {document.fileType}
                  </span>
                </td>
                <td>{formatFileSize(document.fileSize)}</td>
                <td>{getClassName(document.classEntity?.id)}</td>
                <td>{getUserName(document.uploadedBy?.id)}</td>
                <td>{formatDate(document.uploadedAt)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(document)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(document.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingDocument ? 'Sửa tài liệu' : 'Thêm tài liệu'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form modal-form">
              <div className="common-form-group form-group">
                <label>Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="common-form-group form-group">
                <label>Tên file *</label>
                <input
                  type="text"
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group form-group">
                <label>Đường dẫn file</label>
                <input
                  type="text"
                  value={formData.filePath}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                  placeholder="/uploads/documents/"
                />
              </div>
              <div className="common-form-group form-group">
                <label>Kích thước file (bytes)</label>
                <input
                  type="number"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  min="0"
                />
              </div>
              <div className="common-form-group form-group">
                <label>Loại file</label>
                <select
                  value={formData.fileType}
                  onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                >
                  <option value="">Chọn loại file</option>
                  <option value="PDF">PDF</option>
                  <option value="DOC">DOC</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLS">XLS</option>
                  <option value="XLSX">XLSX</option>
                  <option value="PPT">PPT</option>
                  <option value="PPTX">PPTX</option>
                  <option value="TXT">TXT</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Trường *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  required
                >
                  <option value="">Chọn trường</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Lớp</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Chọn lớp</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Người upload *</label>
                <select
                  value={formData.uploadedById}
                  onChange={(e) => setFormData({ ...formData, uploadedById: e.target.value })}
                  required
                >
                  <option value="">Chọn người upload</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-modal-actions modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDocument ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentListPage;
