import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ScheduleListPage.css';
import { useAuth } from '../contexts/AuthContext';

const ScheduleListPage = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Tính ngày thứ 2 của tuần hiện tại
    const today = new Date();
    const day = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    // Tính số ngày cần lùi lại để đến thứ 2
    // Thứ 2 (1) -> 0 ngày, Thứ 3 (2) -> -1 ngày, ..., Chủ nhật (0) -> -6 ngày
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    date: '',
    dayOfWeek: '',
    period: '',
    room: ''
  });
  const [generateData, setGenerateData] = useState({
    classId: '',
    subjectAssignments: [],
    numberOfWeeks: 1
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      
      // Fetch classes
      const classesRes = await api.get('/classes');
      let allClasses = classesRes.data.classes || [];
      
      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter(cls => cls.school?.id === schoolId);
      } else if (userRole === 'STUDENT' && user?.id) {
        // For student, fetch their enrollment to get their class
        try {
          const enrollmentRes = await api.get(`/users/${user.id}/enrollment`);
          console.log('Enrollment API response:', enrollmentRes.data);
          
          // API trả về format: { enrollment: {...}, enrollments: [...] }
          const enrollment = enrollmentRes.data.enrollment || enrollmentRes.data;
          
          if (enrollment?.classId) {
            // Filter to show only the student's class
            allClasses = allClasses.filter(cls => cls.id === enrollment.classId);
            // Automatically select the student's class
            if (allClasses.length > 0) {
              setSelectedClassId(allClasses[0].id.toString());
            }
            console.log('✅ Student class:', enrollment.className, 'Class ID:', enrollment.classId);
          } else {
            allClasses = [];
            console.log('⚠️ Student has no active enrollment. Response:', enrollmentRes.data);
            if (enrollmentRes.data.message) {
              console.log('Message:', enrollmentRes.data.message);
            }
          }
        } catch (enrollmentError) {
          console.error('❌ Error fetching student enrollment:', enrollmentError);
          console.error('Error response:', enrollmentError.response?.data);
          allClasses = [];
        }
      } else if (userRole === 'TEACHER' && user?.id) {
        // Filter classes for teacher - show all classes they teach (from schedules) + classes they are homeroom teacher for
        try {
          // Fetch schedules for this teacher to get all classes they teach
          const schedulesRes = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesRes.data.schedules || [];
          
          // Get unique class IDs from schedules
          const taughtClassIds = new Set();
          teacherSchedules.forEach(schedule => {
            const classId = schedule.classEntity?.id || schedule.class_id;
            if (classId) {
              taughtClassIds.add(classId);
            }
          });
          
          console.log('Teacher schedules:', teacherSchedules.length);
          console.log('Classes taught by teacher (from schedules):', Array.from(taughtClassIds));
          
          // Filter classes: show classes they teach OR classes they are homeroom teacher for
          allClasses = allClasses.filter(cls => {
            const isSameSchool = cls.school?.id === schoolId;
            if (!isSameSchool) return false;
            
            // Check if teacher is homeroom teacher
            const homeroomTeacherId = cls.homeroomTeacher?.id || cls.homeroomTeacherId;
            const isHomeroomTeacher = homeroomTeacherId === user.id;
            
            // Check if teacher teaches this class (from schedules)
            const isTeachingClass = taughtClassIds.has(cls.id);
            
            return isHomeroomTeacher || isTeachingClass;
          });
          
          console.log('Filtered classes for teacher (all classes they teach):', allClasses.length);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, show no classes for teacher
          allClasses = [];
        }
      }
      setClasses(allClasses);

      // Fetch subjects
      const subjectsRes = await api.get('/subjects');
      setSubjects(subjectsRes.data.subjects || []);

      // Fetch teachers
      let teachersUrl = '/users';
      if (userRole === 'ADMIN' && schoolId) {
        teachersUrl += `?userRole=ADMIN&schoolId=${schoolId}`;
      } else if (userRole === 'TEACHER' && schoolId) {
        teachersUrl += `?userRole=TEACHER&schoolId=${schoolId}`;
      } else {
        teachersUrl += '?userRole=ADMIN';
      }
      
      try {
        const teachersRes = await api.get(teachersUrl);
        const allUsers = teachersRes.data.users || [];
        const teacherUsers = allUsers.filter(userItem => {
          const roleName = userItem.role?.name?.toUpperCase();
          const isTeacherRole = roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIÁO VIÊN';
          
          if (!isTeacherRole) return false;
          
          if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
            return userItem.school?.id === schoolId;
          }
          
          return true;
        });
        setTeachers(teacherUsers);
      } catch (teacherError) {
        console.error('Error fetching teachers:', teacherError);
        setTeachers([]);
      }

      if (allClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(allClasses[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return; // Đợi fetchData hoàn thành
    
    const userRole = user?.role?.name?.toUpperCase();
    if (selectedClassId || 
        (userRole === 'TEACHER' && user?.id) || 
        (userRole === 'STUDENT' && user?.id)) {
      fetchSchedules();
    }
  }, [selectedClassId, user, loading]);

  const fetchSchedules = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      let schedulesData = [];
      
      if (userRole === 'STUDENT' && user?.id) {
        // For student, fetch their schedules directly
        try {
          const response = await api.get(`/schedules/student/${user.id}`);
          schedulesData = response.data.schedules || [];
          console.log('Student schedules fetched:', schedulesData.length);
        } catch (studentError) {
          console.error('Error fetching student schedules:', studentError);
          schedulesData = [];
        }
      } else if (userRole === 'TEACHER' && user?.id) {
        // For teacher, fetch all their schedules and filter by selected class
        try {
          const response = await api.get(`/schedules/teacher/${user.id}`);
          const allTeacherSchedules = response.data.schedules || [];
          console.log('Teacher schedules fetched:', allTeacherSchedules.length);
          
          // Filter by selected class if a class is selected
          if (selectedClassId) {
            schedulesData = allTeacherSchedules.filter(schedule => {
              const classId = schedule.classEntity?.id || schedule.class_id;
              return classId && classId.toString() === selectedClassId;
            });
            console.log('Filtered schedules for class', selectedClassId, ':', schedulesData.length);
          } else {
            schedulesData = allTeacherSchedules;
          }
        } catch (teacherError) {
          console.error('Error fetching teacher schedules:', teacherError);
          schedulesData = [];
        }
      } else if (selectedClassId) {
        // For admin, fetch schedules by class
        const response = await api.get(`/schedules/class/${selectedClassId}`);
        schedulesData = response.data.schedules || [];
      }
      
      console.log('Fetched schedules:', schedulesData.length, 'schedules');
      
      // Sắp xếp theo date và period
      schedulesData.sort((a, b) => {
        if (a.date && b.date) {
          // So sánh date string trực tiếp (YYYY-MM-DD)
          const dateA = typeof a.date === 'string' ? a.date.split('T')[0] : formatDateToYYYYMMDD(new Date(a.date));
          const dateB = typeof b.date === 'string' ? b.date.split('T')[0] : formatDateToYYYYMMDD(new Date(b.date));
          const dateCompare = dateA.localeCompare(dateB);
          if (dateCompare !== 0) return dateCompare;
        }
        return (a.period || 0) - (b.period || 0);
      });
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const schedulePayload = {
        classId: parseInt(formData.classId),
        subjectId: formData.subjectId ? parseInt(formData.subjectId) : null,
        teacherId: formData.teacherId ? parseInt(formData.teacherId) : null,
        period: parseInt(formData.period),
        room: formData.room || null
      };

      // Xử lý date - ưu tiên date hơn dayOfWeek
      if (formData.date && formData.date.trim() !== '') {
        // Đảm bảo date được format đúng YYYY-MM-DD (không có timezone)
        // Input type="date" trả về YYYY-MM-DD, nhưng cần đảm bảo không bị chuyển đổi
        const dateValue = formData.date.trim();
        // Nếu date có format YYYY-MM-DD, dùng trực tiếp
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          schedulePayload.date = dateValue;
          // Clear dayOfWeek nếu có date
          schedulePayload.dayOfWeek = null;
        } else {
          // Nếu không, parse và format lại
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            schedulePayload.date = `${year}-${month}-${day}`;
            schedulePayload.dayOfWeek = null;
          } else {
            alert('Ngày không hợp lệ. Vui lòng chọn lại.');
            return;
          }
        }
        console.log('✅ Date selected:', formData.date, '-> Sending:', schedulePayload.date);
      } else if (formData.dayOfWeek && formData.dayOfWeek.trim() !== '') {
        const dayOfWeekValue = parseInt(formData.dayOfWeek);
        if (dayOfWeekValue >= 1 && dayOfWeekValue <= 6) {
          schedulePayload.dayOfWeek = dayOfWeekValue;
        } else {
          alert('Thứ trong tuần không hợp lệ. Vui lòng chọn từ Thứ 2 đến Thứ 7.');
          return;
        }
      } else {
        alert('Vui lòng chọn ngày hoặc thứ trong tuần');
        return;
      }

      console.log('Submitting schedule:', schedulePayload);
      console.log('Form data:', formData);

      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, schedulePayload);
        alert('Cập nhật lịch học thành công!');
      } else {
        await api.post('/schedules', schedulePayload);
        alert('Thêm lịch học thành công!');
      }

      setShowModal(false);
      setEditingSchedule(null);
      setFormData({
        classId: '',
        subjectId: '',
        teacherId: '',
        date: '',
        dayOfWeek: '',
        period: '',
        room: ''
      });
      await fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi không xác định';
      alert('Lỗi khi lưu thời khóa biểu: ' + errorMessage);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    
    // Format date để hiển thị trong input type="date" (YYYY-MM-DD)
    let dateValue = '';
    if (schedule.date) {
      // Nếu date đã là string YYYY-MM-DD, dùng trực tiếp
      if (typeof schedule.date === 'string' && schedule.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        dateValue = schedule.date.split('T')[0]; // Lấy phần YYYY-MM-DD nếu có time
      } else {
        // Parse date và format lại theo local timezone
        const date = new Date(schedule.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateValue = `${year}-${month}-${day}`;
      }
    }
    
    setFormData({
      classId: schedule.classEntity?.id?.toString() || schedule.class_id?.toString() || '',
      subjectId: schedule.subject?.id?.toString() || schedule.subject_id?.toString() || '',
      teacherId: schedule.teacher?.id?.toString() || schedule.teacher_id?.toString() || '',
      date: dateValue,
      dayOfWeek: schedule.dayOfWeek?.toString() || schedule.day_of_week?.toString() || '',
      period: schedule.period?.toString() || '',
      room: schedule.room || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch học này?')) {
      try {
        await api.delete(`/schedules/${id}`);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Lỗi khi xóa lịch học');
      }
    }
  };

  const handleDeleteAllByClass = async () => {
    if (!selectedClassId) {
      alert('Vui lòng chọn lớp trước');
      return;
    }

    const className = classes.find(c => c.id.toString() === selectedClassId)?.name || 'lớp này';
    const confirmMessage = `Bạn có chắc chắn muốn xóa TOÀN BỘ lịch học của ${className}?\n\nHành động này không thể hoàn tác!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.delete(`/schedules/class/${selectedClassId}`);
        const count = response.data.count || 0;
        alert(`Đã xóa thành công ${count} lịch học của ${className}`);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting all schedules by class:', error);
        alert('Lỗi khi xóa lịch học: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ LỊCH HỌC TRONG HỆ THỐNG?\n\nHành động này sẽ xóa TẤT CẢ lịch học và KHÔNG THỂ hoàn tác!\n\nNhập "XÓA TẤT CẢ" để xác nhận:`;
    
    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'XÓA TẤT CẢ') {
      if (userInput !== null) {
        alert('Xác nhận không đúng. Hành động đã bị hủy.');
      }
      return;
    }

    if (window.confirm('Lần xác nhận cuối cùng: Bạn có chắc chắn muốn xóa TOÀN BỘ lịch học?')) {
      try {
        const response = await api.delete('/schedules/all');
        const count = response.data.count || 0;
        alert(`Đã xóa thành công ${count} lịch học trong toàn hệ thống`);
        fetchSchedules();
        setSelectedClassId('');
      } catch (error) {
        console.error('Error deleting all schedules:', error);
        alert('Lỗi khi xóa lịch học: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleGenerate = async () => {
    try {
      if (!generateData.classId || generateData.subjectAssignments.length === 0) {
        alert('Vui lòng chọn lớp và thêm ít nhất một môn học');
        return;
      }

      const payload = {
        classId: parseInt(generateData.classId),
        subjectAssignments: generateData.subjectAssignments.map(a => ({
          subjectId: parseInt(a.subjectId),
          teacherId: parseInt(a.teacherId),
          periodsPerWeek: parseInt(a.periodsPerWeek)
        })),
        numberOfWeeks: parseInt(generateData.numberOfWeeks) || 1
      };

      const response = await api.post('/schedules/generate', payload);
      const createdCount = response.data.count || 0;
      const numberOfWeeksCreated = parseInt(generateData.numberOfWeeks) || 1;
      setShowGenerateModal(false);
      setGenerateData({
        classId: '',
        subjectAssignments: [],
        numberOfWeeks: 1
      });
      await fetchSchedules();
      alert(`Tạo thời khóa biểu tự động thành công!\n\nĐã tạo ${createdCount} lịch học cho ${numberOfWeeksCreated} tuần.\n\nSử dụng nút "Tuần sau →" để xem các tuần tiếp theo.`);
    } catch (error) {
      console.error('Error generating schedules:', error);
      alert('Lỗi khi tạo thời khóa biểu: ' + (error.response?.data?.error || error.message));
    }
  };

  const addSubjectAssignment = () => {
    setGenerateData({
      ...generateData,
      subjectAssignments: [
        ...generateData.subjectAssignments,
        { subjectId: '', teacherId: '', periodsPerWeek: '' }
      ]
    });
  };

  const removeSubjectAssignment = (index) => {
    setGenerateData({
      ...generateData,
      subjectAssignments: generateData.subjectAssignments.filter((_, i) => i !== index)
    });
  };

  const updateSubjectAssignment = (index, field, value) => {
    const updated = [...generateData.subjectAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setGenerateData({ ...generateData, subjectAssignments: updated });
  };

  const getDayName = (dayOfWeek) => {
    const days = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayOfWeek] || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getDayOfWeekFromDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDay();
    // Chuyển từ 0-6 (CN-Thứ 7) sang 1-6 (Thứ 2-Thứ 7)
    return day === 0 ? 7 : day;
  };

  // Format date thành YYYY-MM-DD (không có timezone)
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tính ngày cho mỗi thứ trong tuần dựa trên currentWeekStart
  const getDateForDayOfWeek = (dayOfWeek) => {
    if (!currentWeekStart) return '';
    
    const targetDate = new Date(currentWeekStart);
    const daysDiff = dayOfWeek - 1; // dayOfWeek: 1=Thứ 2, 2=Thứ 3, ...
    targetDate.setDate(currentWeekStart.getDate() + daysDiff);
    
    // Format theo local timezone để hiển thị
    return formatDate(formatDateToYYYYMMDD(targetDate));
  };

  // Lấy ngày Date object cho mỗi thứ trong tuần (trả về YYYY-MM-DD string)
  const getDateStringForDayOfWeek = (dayOfWeek) => {
    if (!currentWeekStart) return null;
    
    const targetDate = new Date(currentWeekStart);
    const daysDiff = dayOfWeek - 1;
    targetDate.setDate(currentWeekStart.getDate() + daysDiff);
    return formatDateToYYYYMMDD(targetDate);
  };

  // Nhóm schedules theo ngày và tiết học để hiển thị dạng timetable
  const getScheduleForDayAndPeriod = (dayOfWeek, period) => {
    const targetDateStr = getDateStringForDayOfWeek(dayOfWeek);
    if (!targetDateStr) return null;
    
    return schedules.find(schedule => {
      // Kiểm tra period trước
      if (schedule.period !== period) return false;
      
      const sDate = schedule.date;
      
      // Nếu schedule có date, so sánh trực tiếp với ngày đích
      if (sDate) {
        // Format schedule date thành YYYY-MM-DD để so sánh
        let scheduleDateStr;
        if (typeof sDate === 'string') {
          // Nếu đã là YYYY-MM-DD, dùng trực tiếp
          if (sDate.match(/^\d{4}-\d{2}-\d{2}/)) {
            scheduleDateStr = sDate.split('T')[0].split(' ')[0]; // Lấy phần YYYY-MM-DD
          } else {
            // Parse và format lại
            scheduleDateStr = formatDateToYYYYMMDD(new Date(sDate));
          }
        } else {
          scheduleDateStr = formatDateToYYYYMMDD(new Date(sDate));
        }
        return scheduleDateStr === targetDateStr;
      }
      
      // Nếu không có date nhưng có dayOfWeek, kiểm tra xem có thuộc tuần hiện tại không
      const sDay = schedule.dayOfWeek;
      if (sDay && sDay === dayOfWeek) {
        // Nếu schedule chỉ có dayOfWeek (không có date), hiển thị cho tất cả các tuần có cùng dayOfWeek
        // Nhưng để chính xác hơn, ta chỉ hiển thị nếu không có schedule nào khác có date cho ngày này
        const hasDateSchedule = schedules.some(s => {
          if (!s.date || s.period !== period) return false;
          let sDateStr;
          if (typeof s.date === 'string') {
            if (s.date.match(/^\d{4}-\d{2}-\d{2}/)) {
              sDateStr = s.date.split('T')[0].split(' ')[0];
            } else {
              sDateStr = formatDateToYYYYMMDD(new Date(s.date));
            }
          } else {
            sDateStr = formatDateToYYYYMMDD(new Date(s.date));
          }
          return sDateStr === targetDateStr;
        });
        
        // Nếu không có schedule nào có date cho ngày này, hiển thị schedule có dayOfWeek
        return !hasDateSchedule;
      }
      
      return false;
    }) || null;
  };

  // Điều hướng tuần
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    // Tính số ngày cần lùi lại để đến thứ 2
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  // Lấy thông tin tuần hiện tại
  const getWeekInfo = () => {
    if (!currentWeekStart) return '';
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    return `${formatDate(formatDateToYYYYMMDD(currentWeekStart))} - ${formatDate(formatDateToYYYYMMDD(weekEnd))}`;
  };


  const userRole = user?.role?.name?.toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isStudent = userRole === 'STUDENT';
  const canManage = isAdmin;

  if (loading) {
    return <div className="schedule-list-page"><div className="loading">Đang tải...</div></div>;
  }

  const isTeacher = userRole === 'TEACHER';
  const pageTitle = isStudent ? 'Xem thời khóa biểu' : isTeacher ? 'Xem thời khóa biểu' : 'Quản lý thời khóa biểu';

  return (
    <div className="schedule-list-page">
      <div className="common-page-header">
        <h1>{pageTitle}</h1>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
              Tạo tự động
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setFormData({
                  classId: selectedClassId || '',
                  subjectId: '',
                  teacherId: '',
                  date: '',
                  dayOfWeek: '',
                  period: '',
                  room: ''
                });
                setEditingSchedule(null);
                setShowModal(true);
              }}
            >
              Thêm lịch học
            </button>
          </div>
        )}
      </div>

      {!isStudent && (
        <div className="schedule-filters">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Chọn lớp:
              <select 
                value={selectedClassId} 
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={{ padding: '5px' }}
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </label>
            {canManage && selectedClassId && (
              <button 
                className="btn btn-danger"
                onClick={handleDeleteAllByClass}
                title="Xóa toàn bộ lịch của lớp đã chọn"
              >
                🗑️ Xóa toàn bộ lịch lớp
              </button>
            )}
          </div>
        </div>
      )}
      
      {isStudent && classes.length > 0 && (
        <div className="schedule-filters" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>Lớp của bạn:</span>
            <span>{classes.length > 0 ? classes[0].name : 'N/A'}</span>
          </div>
        </div>
      )}
      
      {isStudent && classes.length === 0 && !loading && (
        <div className="schedule-filters" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffc107' }}>
            <span style={{ fontWeight: 'bold', color: '#856404' }}>⚠️ Thông báo:</span>
            <span style={{ color: '#856404' }}>Bạn chưa được gán vào lớp học nào. Vui lòng liên hệ quản trị viên.</span>
          </div>
        </div>
      )}

      {(selectedClassId || isStudent) && (
        <div className="schedule-timetable-wrapper">
          {/* Navigation controls */}
          <div className="timetable-navigation">
            <button 
              className="btn btn-secondary"
              onClick={goToPreviousWeek}
              title="Tuần trước"
            >
              ← Tuần trước
            </button>
            <button 
              className="btn btn-primary"
              onClick={goToToday}
              title="Hôm nay"
            >
              📅 Hôm nay
            </button>
            <button 
              className="btn btn-secondary"
              onClick={goToNextWeek}
              title="Tuần sau"
            >
              Tuần sau →
            </button>
            <div className="week-info">
              <span className="week-label">Tuần:</span>
              <span className="week-dates">{getWeekInfo()}</span>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="schedule-empty-state">
              {isStudent ? (
                <>
                  <p>Lớp của bạn chưa có lịch học nào.</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    Vui lòng liên hệ giáo viên chủ nhiệm để biết thêm thông tin.
                  </p>
                </>
              ) : isTeacher ? (
                <>
                  <p>Bạn chưa có lịch học nào được phân công.</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    Vui lòng liên hệ Admin để được phân công lịch dạy.
                  </p>
                </>
              ) : (
                'Chưa có lịch học nào'
              )}
            </div>
          ) : (
            <div className="schedule-timetable">
              {/* Header với các thứ trong tuần */}
              <div className="timetable-header">
                <div className="timetable-corner"></div>
                {[1, 2, 3, 4, 5, 6].map(dayOfWeek => (
                  <div key={dayOfWeek} className="timetable-day-header">
                    <div className="day-label">{getDayName(dayOfWeek)}</div>
                    {getDateForDayOfWeek(dayOfWeek) && (
                      <div className="day-date">{getDateForDayOfWeek(dayOfWeek)}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Các hàng tiết học */}
              {[1, 2, 3, 4, 5].map(period => (
                <div key={period} className="timetable-row">
                  <div className="timetable-period-label">
                    <span className="period-number">{period}</span>
                    <span className="period-text">Tiết</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                    const schedule = getScheduleForDayAndPeriod(dayOfWeek, period);
                    return (
                      <div key={dayOfWeek} className="timetable-slot">
                        {schedule ? (
                          <div className="schedule-card">
                            <div className="schedule-card-header">
                              <span className="schedule-subject">{schedule.subject?.name || 'N/A'}</span>
                            </div>
                            <div className="schedule-card-body">
                              <div className="schedule-info-item">
                                <span className="info-icon">👤</span>
                                <span className="info-text">{schedule.teacher?.fullName || 'N/A'}</span>
                              </div>
                              <div className="schedule-info-item">
                                <span className="info-icon">🏢</span>
                                <span className="info-text">{schedule.room || 'N/A'}</span>
                              </div>
                            </div>
                            {canManage && (
                              <div className="schedule-card-actions">
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={() => handleEdit(schedule)}
                                  title="Sửa"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={() => handleDelete(schedule.id)}
                                  title="Xóa"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="schedule-empty-slot"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal tạo/sửa lịch học */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSchedule ? 'Sửa lịch học' : 'Thêm lịch học'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Lớp học *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Môn học</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Giáo viên</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ngày (YYYY-MM-DD) hoặc Thứ trong tuần</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, dayOfWeek: '' })}
                    placeholder="Ngày cụ thể"
                  />
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value, date: '' })}
                  >
                    <option value="">-- Chọn thứ --</option>
                    <option value="1">Thứ 2</option>
                    <option value="2">Thứ 3</option>
                    <option value="3">Thứ 4</option>
                    <option value="4">Thứ 5</option>
                    <option value="5">Thứ 6</option>
                    <option value="6">Thứ 7</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tiết học *</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  required
                >
                  <option value="">-- Chọn tiết --</option>
                  <option value="1">Tiết 1</option>
                  <option value="2">Tiết 2</option>
                  <option value="3">Tiết 3</option>
                  <option value="4">Tiết 4</option>
                  <option value="5">Tiết 5</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phòng học</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="Ví dụ: A101"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingSchedule ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tạo tự động */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Tạo thời khóa biểu tự động</h2>
            <div className="form-group">
              <label>Lớp học *</label>
              <select
                value={generateData.classId}
                onChange={(e) => setGenerateData({ ...generateData, classId: e.target.value })}
                required
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Số tuần muốn tạo *</label>
              <input
                type="number"
                value={generateData.numberOfWeeks}
                onChange={(e) => setGenerateData({ ...generateData, numberOfWeeks: e.target.value })}
                min="1"
                max="20"
                required
                placeholder="Nhập số tuần (1-20)"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Lịch sẽ được tạo từ tuần hiện tại cho đến số tuần bạn chọn
              </small>
            </div>

            <div className="form-group">
              <label>Phân công môn học</label>
              {generateData.subjectAssignments.map((assignment, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                  <select
                    value={assignment.subjectId}
                    onChange={(e) => updateSubjectAssignment(index, 'subjectId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Môn học --</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  <select
                    value={assignment.teacherId}
                    onChange={(e) => updateSubjectAssignment(index, 'teacherId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Giáo viên --</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={assignment.periodsPerWeek}
                    onChange={(e) => updateSubjectAssignment(index, 'periodsPerWeek', e.target.value)}
                    placeholder="Số tiết/tuần"
                    min="1"
                    max="5"
                    style={{ width: '100px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeSubjectAssignment(index)}
                  >
                    Xóa
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addSubjectAssignment}
              >
                + Thêm môn học
              </button>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleGenerate}
              >
                Tạo tự động
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowGenerateModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleListPage;

