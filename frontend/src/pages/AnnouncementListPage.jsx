import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './AnnouncementListPage.css';

const AnnouncementListPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null); // Filter by school
  const [studentClassId, setStudentClassId] = useState(null); // Class ID của học sinh
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    schoolId: '',
    classId: '',
    createdById: ''
  });

  // Fetch enrollment của học sinh để lấy classId
  const fetchStudentEnrollment = async () => {
    if (!user?.id) return null;
    
    try {
      const enrollmentRes = await api.get(`/users/${user.id}/enrollment`);
      console.log('Student enrollment response:', enrollmentRes.data);
      
      // API trả về format: { enrollment: {...}, enrollments: [...] }
      const enrollment = enrollmentRes.data.enrollment || enrollmentRes.data;
      
      if (enrollment?.classId) {
        const classId = enrollment.classId;
        setStudentClassId(classId);
        console.log('Student class ID:', classId);
        return classId;
      } else {
        console.log('Student has no active enrollment');
        setStudentClassId(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching student enrollment:', error);
      setStudentClassId(null);
      return null;
    }
  };

  // Initialize school filter based on user role
  useEffect(() => {
    if (user) {
      const userRole = user?.role?.name?.toUpperCase();
      const userSchoolId = user?.school?.id;
      
      if (userRole === 'ADMIN' && userSchoolId) {
        // ADMIN: Auto filter by their school
        setSelectedSchoolId(userSchoolId);
      } else if (userRole === 'STUDENT' && userSchoolId) {
        // STUDENT: Auto filter by their school and fetch their class
        setSelectedSchoolId(userSchoolId);
        // Fetch enrollment để lấy classId của học sinh
        fetchStudentEnrollment();
      } else if (userRole === 'TEACHER' && userSchoolId) {
        // TEACHER: Auto filter by their school
        setSelectedSchoolId(userSchoolId);
      } else if (userRole === 'SUPER_ADMIN') {
        // SUPER_ADMIN: Can see all, no filter by default
        setSelectedSchoolId(null);
      }
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Xác định role và schoolId của user hiện tại
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      
      // Xây dựng URL cho announcements API với filter theo school
      let announcementsUrl = '/announcements';
      
      // Đối với học sinh, lấy tất cả thông báo của trường, sau đó filter theo lớp ở frontend
      // Vì học sinh cần thấy: thông báo của lớp họ + thông báo chung (classId = null)
      if (userRole === 'STUDENT' && selectedSchoolId) {
        announcementsUrl += `?schoolId=${selectedSchoolId}`;
      } else if (selectedSchoolId) {
        announcementsUrl += `?schoolId=${selectedSchoolId}`;
      }
      
      // Xây dựng URL cho users API dựa trên role
      let usersUrl = '/users';
      if (userRole === 'SUPER_ADMIN') {
        usersUrl += '?userRole=SUPER_ADMIN';
      } else if (userRole === 'ADMIN' && schoolId) {
        usersUrl += `?userRole=ADMIN&schoolId=${schoolId}`;
      } else if (userRole === 'TEACHER' && schoolId) {
        usersUrl += `?userRole=TEACHER&schoolId=${schoolId}`;
      } else {
        // Nếu không có quyền, vẫn thử fetch nhưng sẽ bị 403
        usersUrl += `?userRole=${userRole || 'ADMIN'}`;
        if (schoolId) {
          usersUrl += `&schoolId=${schoolId}`;
        }
      }
      
      const [announcementsRes, schoolsRes, classesRes, usersRes] = await Promise.all([
        api.get(announcementsUrl),
        api.get('/schools'),
        api.get('/classes'),
        api.get(usersUrl).catch(err => {
          console.warn('Failed to fetch users:', err);
          return { data: { users: [] } }; // Return empty array if failed
        })
      ]);
      
      let allAnnouncements = announcementsRes.data.announcements || [];
      
      // Đối với học sinh, filter thông báo:
      // - Chỉ hiển thị thông báo của lớp học sinh (classId = studentClassId)
      // - Hoặc thông báo chung (classId = null) của cùng trường
      if (userRole === 'STUDENT' && studentClassId) {
        allAnnouncements = allAnnouncements.filter(announcement => {
          const announcementClassId = announcement.classEntity?.id || announcement.class_id;
          // Hiển thị thông báo của lớp học sinh hoặc thông báo chung (null)
          return announcementClassId === studentClassId || announcementClassId === null;
        });
        console.log('Filtered announcements for student class:', studentClassId, 'Count:', allAnnouncements.length);
      } else if (userRole === 'STUDENT' && !studentClassId) {
        // Nếu học sinh chưa có lớp, chỉ hiển thị thông báo chung
        allAnnouncements = allAnnouncements.filter(announcement => {
          const announcementClassId = announcement.classEntity?.id || announcement.class_id;
          return announcementClassId === null;
        });
        console.log('Student has no class, showing only general announcements');
      }
      
      setAnnouncements(allAnnouncements);
      setSchools(schoolsRes.data.schools || []);
      setClasses(classesRes.data.classes || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when user, school filter, or student class changes
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedSchoolId, studentClassId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Auto-set creator to current user if not set (for new announcements)
      // For editing, use the original creator from formData
      const creatorId = editingAnnouncement 
        ? (formData.createdById || editingAnnouncement.createdBy?.id?.toString() || user?.id?.toString())
        : (formData.createdById || user?.id?.toString());
      
      // Validate required fields
      if (!formData.title || !formData.content || !formData.schoolId || !creatorId) {
        alert('Vui lòng điền đầy đủ các trường bắt buộc');
        return;
      }

      const submitData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : null,
        classId: formData.classId && formData.classId !== '' ? parseInt(formData.classId) : null,
        createdById: creatorId ? parseInt(creatorId) : null
      };

      console.log('Submitting announcement data:', submitData);

      if (editingAnnouncement) {
        // Send user role in header for backend validation
        await api.put(`/announcements/${editingAnnouncement.id}`, submitData, {
          headers: {
            'X-User-Id': user?.id,
            'X-User-Role': user?.role?.name
          }
        });
      } else {
        await api.post('/announcements', submitData);
      }
      
      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        schoolId: '',
        classId: '',
        createdById: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving announcement:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Không thể lưu thông báo. Vui lòng thử lại.';
      alert(errorMessage);
    }
  };

  const handleEdit = async (announcement) => {
    // CRITICAL: Check if TEACHER is trying to edit ADMIN's announcement
    // This check MUST happen BEFORE opening the modal
    const currentUserRole = user?.role?.name?.toUpperCase();
    if (currentUserRole === 'TEACHER') {
      let creatorRole = getCreatorRole(announcement);
      
      // If still not found, try to fetch from API as last resort
      if (creatorRole === null && announcement.createdBy?.id) {
        try {
          const creatorRes = await api.get(`/users/${announcement.createdBy.id}`);
          if (creatorRes.data?.role?.name) {
            creatorRole = creatorRes.data.role.name.toUpperCase();
            console.log('handleEdit: Fetched creator role from API:', creatorRole);
          }
        } catch (err) {
          console.error('Error fetching creator info:', err);
        }
      }
      
      console.log('handleEdit - Creator Role:', creatorRole);
      console.log('handleEdit - Current User Role:', currentUserRole);
      console.log('handleEdit - Full announcement.createdBy:', JSON.stringify(announcement.createdBy, null, 2));
      
      // If created by ADMIN, prevent editing - BLOCK IMMEDIATELY
      if (creatorRole === 'ADMIN') {
        alert('Bạn không thể chỉnh sửa thông báo từ Admin');
        return; // DO NOT OPEN MODAL
      }
      
      // If we cannot determine the role, be safe and block (for security)
      if (creatorRole === null && announcement.createdBy?.id) {
        console.warn('Cannot determine creator role, blocking edit for safety');
        alert('Không thể xác định quyền của người tạo. Vui lòng thử lại sau.');
        return; // DO NOT OPEN MODAL
      }
    }
    
    // Only open modal if all checks pass
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      schoolId: announcement.school?.id?.toString() || '',
      classId: announcement.classEntity?.id?.toString() || '',
      createdById: announcement.createdBy?.id?.toString() || user?.id?.toString() || '' // Keep original creator or use current user
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    // Find the announcement to check creator
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    
    // CRITICAL: Check if TEACHER is trying to delete ADMIN's announcement
    const currentUserRole = user?.role?.name?.toUpperCase();
    if (currentUserRole === 'TEACHER') {
      let creatorRole = getCreatorRole(announcement);
      
      // If still not found, try to fetch from API as last resort
      if (creatorRole === null && announcement.createdBy?.id) {
        try {
          const creatorRes = await api.get(`/users/${announcement.createdBy.id}`);
          if (creatorRes.data?.role?.name) {
            creatorRole = creatorRes.data.role.name.toUpperCase();
            console.log('handleDelete: Fetched creator role from API:', creatorRole);
          }
        } catch (err) {
          console.error('Error fetching creator info:', err);
        }
      }
      
      console.log('handleDelete - Creator Role:', creatorRole);
      console.log('handleDelete - Current User Role:', currentUserRole);
      console.log('handleDelete - Full announcement.createdBy:', JSON.stringify(announcement.createdBy, null, 2));
      
      // If created by ADMIN, prevent deletion - BLOCK IMMEDIATELY
      if (creatorRole === 'ADMIN') {
        alert('Bạn không thể xóa thông báo từ Admin');
        return; // DO NOT PROCEED
      }
      
      // If we cannot determine the role, be safe and block (for security)
      if (creatorRole === null && announcement.createdBy?.id) {
        console.warn('Cannot determine creator role, blocking delete for safety');
        alert('Không thể xác định quyền của người tạo. Vui lòng thử lại sau.');
        return; // DO NOT PROCEED
      }
    }
    
    if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      try {
        // Send user role in header for backend validation
        await api.delete(`/announcements/${id}`, {
          headers: {
            'X-User-Id': user?.id,
            'X-User-Role': user?.role?.name
          }
        });
        fetchData();
      } catch (error) {
        console.error('Error deleting announcement:', error);
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Không thể xóa thông báo. Vui lòng thử lại.';
        alert(errorMessage);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      schoolId: '',
      classId: '',
      createdById: ''
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

  // Helper function to get creator role - tries multiple methods
  const getCreatorRole = (announcement) => {
    if (!announcement || !announcement.createdBy) {
      return null;
    }

    // Method 1: From announcement.createdBy.role.name (direct from API)
    if (announcement.createdBy?.role?.name) {
      const role = announcement.createdBy.role.name.toUpperCase();
      console.log('getCreatorRole: Found role from announcement.createdBy.role.name:', role);
      return role;
    }

    // Method 2: From users list (fallback if role not loaded)
    if (announcement.createdBy?.id) {
      const creatorUser = users.find(u => u.id === announcement.createdBy.id);
      if (creatorUser?.role?.name) {
        const role = creatorUser.role.name.toUpperCase();
        console.log('getCreatorRole: Found role from users list:', role);
        return role;
      }
    }

    // Method 3: Check if createdBy has fullName that might indicate admin
    // This is a fallback - if we see "ADMIN" in the display name, assume ADMIN
    if (announcement.createdBy?.fullName) {
      const fullName = announcement.createdBy.fullName.toUpperCase();
      // Check if the display text contains "ADMIN" (from the UI display like "bhoang (ADMIN- DTU)")
      // This is a last resort check
      console.log('getCreatorRole: Checking fullName for ADMIN indicator:', fullName);
    }

    // If still not found, return null (will trigger security measure)
    console.warn('getCreatorRole: Could not determine role for creator ID:', announcement.createdBy?.id);
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="announcement-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const userSchoolId = user?.school?.id;

  return (
    <div className="announcement-list-page">
      <div className="common-page-header">
        <h1>Quản lý thông báo</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* School filter - only show for SUPER_ADMIN */}
          {userRole === 'SUPER_ADMIN' && (
            <select
              value={selectedSchoolId || ''}
              onChange={(e) => {
                const schoolId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedSchoolId(schoolId);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="">Tất cả trường</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
          {/* Show current school for ADMIN, STUDENT, TEACHER */}
          {(userRole === 'ADMIN' || userRole === 'STUDENT' || userRole === 'TEACHER') && userSchoolId && (
            <span style={{ 
              padding: '8px 12px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              Trường: {schools.find(s => s.id === userSchoolId)?.name || 'N/A'}
            </span>
          )}
          {/* Show student's class */}
          {userRole === 'STUDENT' && studentClassId && (
            <span style={{ 
              padding: '8px 12px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              fontSize: '14px',
              marginLeft: '10px'
            }}>
              Lớp: {classes.find(c => c.id === studentClassId)?.name || 'N/A'}
            </span>
          )}
          {userRole === 'STUDENT' && !studentClassId && (
            <span style={{ 
              padding: '8px 12px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '4px',
              fontSize: '14px',
              marginLeft: '10px',
              color: '#856404'
            }}>
              ⚠️ Chưa được gán vào lớp
            </span>
          )}
          {/* Show "Thêm thông báo" button for ADMIN, SUPER_ADMIN, and TEACHER */}
          {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TEACHER') && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Auto-set school and creator when opening modal
                if ((userRole === 'ADMIN' || userRole === 'TEACHER') && userSchoolId) {
                  setFormData({
                    ...formData,
                    schoolId: userSchoolId.toString(),
                    classId: '',
                    createdById: user?.id?.toString() || '' // Auto-set current user as creator
                  });
                  // Fetch users for the school (only for ADMIN)
                  if (userRole === 'ADMIN') {
                    const fetchUsersForSchool = async () => {
                      try {
                        const usersUrl = `/users?userRole=ADMIN&schoolId=${userSchoolId}`;
                        const usersRes = await api.get(usersUrl).catch(err => {
                          console.warn('Failed to fetch users:', err);
                          return { data: { users: [] } };
                        });
                        setUsers(usersRes.data.users || []);
                      } catch (error) {
                        console.error('Error fetching users:', error);
                      }
                    };
                    fetchUsersForSchool();
                  }
                } else {
                  // For SUPER_ADMIN or other roles, auto-set creator
                  setFormData({
                    ...formData,
                    createdById: user?.id?.toString() || ''
                  });
                }
                setShowModal(true);
              }}
            >
              Thêm thông báo
            </button>
          )}
        </div>
      </div>

      <div className="announcements-container">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            <div className="announcement-header">
              <h3>{announcement.title}</h3>
              <div className="announcement-meta">
                <span className="meta-item">
                  <strong>Trường:</strong> {getSchoolName(announcement.school?.id)}
                </span>
                <span className="meta-item">
                  <strong>Lớp:</strong> {getClassName(announcement.classEntity?.id)}
                </span>
                {/* Only show "Người tạo" for ADMIN, SUPER_ADMIN, and TEACHER - hide for STUDENT */}
                {userRole !== 'STUDENT' && (
                  <span className="meta-item">
                    <strong>Người tạo:</strong> {getUserName(announcement.createdBy?.id)}
                  </span>
                )}
                <span className="meta-item">
                  <strong>Ngày tạo:</strong> {formatDate(announcement.createdAt)}
                </span>
              </div>
            </div>
            <div className="announcement-content">
              <p>{announcement.content}</p>
            </div>
            {/* Show edit/delete buttons based on user role and creator role */}
            {(() => {
              // Get current user role
              const currentUserRole = user?.role?.name?.toUpperCase();
              
              // For TEACHER: Check if announcement was created by ADMIN
              if (currentUserRole === 'TEACHER') {
                const creatorRole = getCreatorRole(announcement);
                
                // Debug logging
                console.log('=== BUTTON RENDERING (TEACHER) ===');
                console.log('Announcement ID:', announcement.id);
                console.log('  Creator ID:', announcement.createdBy?.id);
                console.log('  Creator Name:', announcement.createdBy?.fullName);
                console.log('  Creator Role (from announcement):', announcement.createdBy?.role?.name);
                console.log('  Creator Role (resolved):', creatorRole);
                console.log('  Current User Role:', currentUserRole);
                console.log('  Full announcement.createdBy object:', announcement.createdBy);
                
                // CRITICAL SECURITY: If we cannot determine creator role OR if creator is ADMIN, hide buttons
                // This is a security measure - when in doubt, hide the buttons
                // Also check if createdBy exists - if not, hide buttons for safety
                if (!announcement.createdBy || creatorRole === null || creatorRole === 'ADMIN') {
                  if (!announcement.createdBy) {
                    console.log('  -> HIDING buttons (TEACHER, no createdBy info - SECURITY)');
                  } else if (creatorRole === null) {
                    console.log('  -> HIDING buttons (TEACHER, cannot determine creator role - SECURITY)');
                  } else {
                    console.log('  -> HIDING buttons (TEACHER viewing ADMIN announcement)');
                  }
                  return null; // NO BUTTONS FOR TEACHER - SECURITY FIRST
                }
                
                // Only show buttons if creator is NOT ADMIN (e.g., TEACHER or STUDENT)
                console.log('  -> SHOWING buttons (TEACHER viewing non-ADMIN announcement)');
                return (
                  <div className="announcement-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(announcement)}
                    >
                      Sửa
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      Xóa
                    </button>
                  </div>
                );
              }
              
              // Show buttons for ADMIN and SUPER_ADMIN (they can edit/delete any announcement)
              // currentUserRole is already declared above
              if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN') {
                return (
                  <div className="announcement-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(announcement)}
                    >
                      Sửa
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      Xóa
                    </button>
                  </div>
                );
              }
              
              // Default: no buttons (for STUDENT or other roles)
              return null;
            })()}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingAnnouncement ? 'Sửa thông báo' : 'Thêm thông báo'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              <div className="common-form-group">
                <label>Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Nội dung *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows="6"
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Trường *</label>
                {(userRole === 'ADMIN' || userRole === 'TEACHER') && userSchoolId ? (
                  // ADMIN and TEACHER: Hiển thị trường cố định (không cho chọn)
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}>
                    <strong>{schools.find(s => s.id === userSchoolId)?.name || 'N/A'}</strong>
                  </div>
                ) : (
                  // SUPER_ADMIN: Có thể chọn trường
                  <select
                    value={formData.schoolId}
                    onChange={async (e) => {
                      const selectedSchoolId = e.target.value;
                      setFormData({
                        ...formData, 
                        schoolId: selectedSchoolId,
                        classId: '', // Reset class when school changes
                        createdById: user?.id?.toString() || '' // Keep current user as creator
                      });
                      
                      // Fetch users for selected school
                      if (selectedSchoolId) {
                        try {
                          const userRole = user?.role?.name?.toUpperCase();
                          let usersUrl = '/users';
                          if (userRole === 'SUPER_ADMIN') {
                            usersUrl += '?userRole=SUPER_ADMIN';
                          } else if (userRole === 'ADMIN') {
                            usersUrl += `?userRole=ADMIN&schoolId=${selectedSchoolId}`;
                          }
                          const usersRes = await api.get(usersUrl).catch(err => {
                            console.warn('Failed to fetch users for school:', err);
                            return { data: { users: [] } };
                          });
                          setUsers(usersRes.data.users || []);
                        } catch (error) {
                          console.error('Error fetching users for school:', error);
                        }
                      }
                    }}
                    required
                  >
                    <option value="">Chọn trường</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                )}
                {/* Hidden input để đảm bảo schoolId được gửi đi */}
                {(userRole === 'ADMIN' || userRole === 'TEACHER') && userSchoolId && (
                  <input
                    type="hidden"
                    value={userSchoolId.toString()}
                  />
                )}
              </div>
              <div className="common-form-group">
                <label>Lớp</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({...formData, classId: e.target.value})}
                  disabled={!formData.schoolId}
                >
                  <option value="">Chọn lớp (tùy chọn)</option>
                  {classes
                    .filter(classItem => {
                      // Chỉ hiển thị lớp của trường đã chọn
                      if (!formData.schoolId) return false;
                      return classItem.school?.id === parseInt(formData.schoolId);
                    })
                    .map(classItem => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                </select>
                {formData.schoolId && classes.filter(c => c.school?.id === parseInt(formData.schoolId)).length === 0 && (
                  <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                    Trường này chưa có lớp học
                  </small>
                )}
              </div>
              <div className="common-form-group">
                <label>Người tạo *</label>
                {editingAnnouncement ? (
                  // When editing, show original creator
                  editingAnnouncement.createdBy ? (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}>
                      <strong>{editingAnnouncement.createdBy.fullName || getUserName(editingAnnouncement.createdBy?.id)}</strong>
                      <span style={{ color: '#666' }}> ({editingAnnouncement.createdBy.role?.name || 'N/A'})</span>
                    </div>
                  ) : (
                    user && (
                      <div style={{
                        padding: '10px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px'
                      }}>
                        <strong>{user.fullName}</strong> <span style={{ color: '#666' }}>({user.role?.name || 'N/A'})</span>
                      </div>
                    )
                  )
                ) : (
                  // When creating, show current user
                  user && (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}>
                      <strong>{user.fullName}</strong> <span style={{ color: '#666' }}>({user.role?.name || 'N/A'})</span>
                    </div>
                  )
                )}
                <input
                  type="hidden"
                  value={editingAnnouncement 
                    ? (editingAnnouncement.createdBy?.id?.toString() || user?.id?.toString() || '')
                    : (user?.id?.toString() || '')
                  }
                />
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAnnouncement ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementListPage;
