import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './DocumentListPage.css';
import { Pencil, Trash2 } from 'lucide-react';

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
    if (window.confirm('Are you sure you want to delete this document?')) {
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
    return school ? school.name : 'Không có';
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'Không có';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'Không có';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Không có';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không có';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải tài liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Document Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          Add Document
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">File Name</th>
              <th className="px-4 py-3 text-left">File Type</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Uploaded By</th>
              <th className="px-4 py-3 text-left">Upload Date</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {documents.map((document) => (
              <tr key={document.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3">{document.title}</td>
                <td className="px-4 py-3">{document.fileName}</td>
                <td className="px-4 py-3">
                  <span className="file-type-badge">
                    {document.fileType}
                  </span>
                </td>
                <td className="px-4 py-3">{formatFileSize(document.fileSize)}</td>
                <td className="px-4 py-3">{getClassName(document.classEntity?.id)}</td>
                <td className="px-4 py-3">{getUserName(document.uploadedBy?.id)}</td>
                <td className="px-4 py-3">{formatDate(document.uploadedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                      onClick={() => handleEdit(document)}
                      aria-label="Sửa tài liệu"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      onClick={() => handleDelete(document.id)}
                      aria-label="Xóa tài liệu"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingDocument ? 'Edit Document' : 'Add Document'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form modal-form">
              <div className="common-form-group form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group form-group">
                <label>Description</label>
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
                <label>File Path</label>
                <input
                  type="text"
                  value={formData.filePath}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                  placeholder="/uploads/documents/"
                />
              </div>
              <div className="common-form-group form-group">
                <label>File Size (bytes)</label>
                <input
                  type="number"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  min="0"
                />
              </div>
              <div className="common-form-group form-group">
                <label>File Type</label>
                <select
                  value={formData.fileType}
                  onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                >
                  <option value="">Select file type</option>
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
                <label>School *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  required
                >
                  <option value="">Select school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Class</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Select class</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Uploader *</label>
                <select
                  value={formData.uploadedById}
                  onChange={(e) => setFormData({ ...formData, uploadedById: e.target.value })}
                  required
                >
                  <option value="">Select uploader</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-modal-actions modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDocument ? 'Update' : 'Create'}
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





