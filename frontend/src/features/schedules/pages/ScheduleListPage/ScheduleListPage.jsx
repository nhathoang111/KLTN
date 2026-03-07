import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './ScheduleListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';

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
    // Tính ngày th? 2 c?a tu?n hi?n t?i
    const today = new Date();
    const day = today.getDay(); // 0 = Ch? nh?t, 1 = Mon, ..., 6 = Sat
    // Tính s? ngày c?n lùi l?i ?? ??n th? 2
    // Mon (1) -> 0 ngày, Tue (2) -> -1 ngày, ..., Ch? nh?t (0) -> -6 ngày
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

          // API tr? v? format: { enrollment: {...}, enrollments: [...] }
          const enrollment = enrollmentRes.data.enrollment || enrollmentRes.data;

          if (enrollment?.classId) {
            // Filter to show only the student's class
            allClasses = allClasses.filter(cls => cls.id === enrollment.classId);
            // Automatically select the student's class
            if (allClasses.length > 0) {
              setSelectedClassId(allClasses[0].id.toString());
            }
            console.log('Student class:', enrollment.className, 'Class ID:', enrollment.classId);
          } else {
            allClasses = [];
            console.log('Student has no active enrollment. Response:', enrollmentRes.data);
            if (enrollmentRes.data.message) {
              console.log('Message:', enrollmentRes.data.message);
            }
          }
        } catch (enrollmentError) {
          console.error('Error fetching student enrollment:', enrollmentError);
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
          const isTeacherRole = roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIáO VIêN';

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
    if (loading) return; // Wait for fetchData to complete

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

      // S?p x?p theo date và period
      schedulesData.sort((a, b) => {
        if (a.date && b.date) {
          // So sánh date string tr?c ti?p (YYYY-MM-DD)
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

      // X? ly date - ?u tiên date h?n dayOfWeek
      if (formData.date && formData.date.trim() !== '') {
        // ??m b?o date ???c format ?úng YYYY-MM-DD (kh?ng có timezone)
        // Input type="date" tr? v? YYYY-MM-DD, nh?ng c?n ??m b?o kh?ng b? chuy?n ??i
        const dateValue = formData.date.trim();
        // N?u date có format YYYY-MM-DD, dùng tr?c ti?p
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          schedulePayload.date = dateValue;
          // Clear dayOfWeek n?u có date
          schedulePayload.dayOfWeek = null;
        } else {
          // N?u kh?ng, parse và format l?i
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            schedulePayload.date = `${year}-${month}-${day}`;
            schedulePayload.dayOfWeek = null;
          } else {
            alert('Invalid date. Please select again.');
            return;
          }
        }
        console.log('Date selected:', formData.date, '-> Sending:', schedulePayload.date);
      } else if (formData.dayOfWeek && formData.dayOfWeek.trim() !== '') {
        const dayOfWeekValue = parseInt(formData.dayOfWeek);
        if (dayOfWeekValue >= 1 && dayOfWeekValue <= 6) {
          schedulePayload.dayOfWeek = dayOfWeekValue;
        } else {
          alert('Invalid weekday. Please select from Mon to Sat.');
          return;
        }
      } else {
        alert('Please select a date or weekday.');
        return;
      }

      console.log('Submitting schedule:', schedulePayload);
      console.log('Form data:', formData);

      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, schedulePayload);
        alert('Schedule updated successfully!');
      } else {
        await api.post('/schedules', schedulePayload);
        alert('Schedule added successfully!');
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
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert('Error saving schedule: ' + errorMessage);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);

    // Format date ?? hi?n th? trong input type="date" (YYYY-MM-DD)
    let dateValue = '';
    if (schedule.date) {
      // N?u date ?? là string YYYY-MM-DD, dùng tr?c ti?p
      if (typeof schedule.date === 'string' && schedule.date.match(/^\d{4}-\d{2}-\d{2}/)) {
        dateValue = schedule.date.split('T')[0]; // L?y ph?n YYYY-MM-DD n?u có time
      } else {
        // Parse date và format l?i theo local timezone
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
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await api.delete(`/schedules/${id}`);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Error deleting schedule');
      }
    }
  };

  const handleDeleteAllByClass = async () => {
    if (!selectedClassId) {
      alert('Please select a class first');
      return;
    }

    const className = classes.find(c => c.id.toString() === selectedClassId)?.name || 'this class';
    const confirmMessage = `Are you sure you want to delete ALL schedules of ${className}?\n\nThis action cannot be undone!`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.delete(`/schedules/class/${selectedClassId}`);
        const count = response.data.count || 0;
        alert(`Deleted ${count} schedules of ${className} successfully.`);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting all schedules by class:', error);
        alert('Error deleting schedules: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `ARE YOU SURE YOU WANT TO DELETE ALL SCHEDULES IN THE SYSTEM?\n\nThis action will remove all schedules and cannot be undone!\n\nType "DELETE ALL" to confirm:`;

    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'DELETE ALL') {
      if (userInput !== null) {
        alert('Confirmation text does not match. Action canceled.');
      }
      return;
    }

    if (window.confirm('Final confirmation: delete ALL schedules?')) {
      try {
        const response = await api.delete('/schedules/all');
        const count = response.data.count || 0;
        alert(`Deleted ${count} schedules across the whole system successfully.`);
        fetchSchedules();
        setSelectedClassId('');
      } catch (error) {
        console.error('Error deleting all schedules:', error);
        alert('Error deleting schedules: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleGenerate = async () => {
    try {
      if (!generateData.classId || generateData.subjectAssignments.length === 0) {
        alert('Please select a class and add at least one subject.');
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
      alert(`Timetable generated successfully.\n\nCreated ${createdCount} schedules for ${numberOfWeeksCreated} week(s).\n\nUse "Next Week ->" to view following weeks.`);
    } catch (error) {
      console.error('Error generating schedules:', error);
      alert('Error generating timetable: ' + (error.response?.data?.error || error.message));
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
    const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    // Chuy?n t? 0-6 (CN-Sat) sang 1-6 (Mon-Sat)
    return day === 0 ? 7 : day;
  };

  // Format date thành YYYY-MM-DD (kh?ng có timezone)
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tính ngày cho m?i th? trong tu?n d?a trên currentWeekStart
  const getDateForDayOfWeek = (dayOfWeek) => {
    if (!currentWeekStart) return '';

    const targetDate = new Date(currentWeekStart);
    const daysDiff = dayOfWeek - 1; // dayOfWeek: 1=Mon, 2=Tue, ...
    targetDate.setDate(currentWeekStart.getDate() + daysDiff);

    // Format theo local timezone ?? hi?n th?
    return formatDate(formatDateToYYYYMMDD(targetDate));
  };

  // L?y ngày Date object cho m?i th? trong tu?n (tr? v? YYYY-MM-DD string)
  const getDateStringForDayOfWeek = (dayOfWeek) => {
    if (!currentWeekStart) return null;

    const targetDate = new Date(currentWeekStart);
    const daysDiff = dayOfWeek - 1;
    targetDate.setDate(currentWeekStart.getDate() + daysDiff);
    return formatDateToYYYYMMDD(targetDate);
  };

  // Nhóm schedules theo ngày và ti?t h?c ?? hi?n th? d?ng timetable
  const getScheduleForDayAndPeriod = (dayOfWeek, period) => {
    const targetDateStr = getDateStringForDayOfWeek(dayOfWeek);
    if (!targetDateStr) return null;

    return schedules.find(schedule => {
      // Ki?m tra period tr??c
      if (schedule.period !== period) return false;

      const sDate = schedule.date;

      // N?u schedule có date, so sánh tr?c ti?p v?i ngày ?ích
      if (sDate) {
        // Format schedule date thành YYYY-MM-DD ?? so sánh
        let scheduleDateStr;
        if (typeof sDate === 'string') {
          // N?u ?? là YYYY-MM-DD, dùng tr?c ti?p
          if (sDate.match(/^\d{4}-\d{2}-\d{2}/)) {
            scheduleDateStr = sDate.split('T')[0].split(' ')[0]; // L?y ph?n YYYY-MM-DD
          } else {
            // Parse và format l?i
            scheduleDateStr = formatDateToYYYYMMDD(new Date(sDate));
          }
        } else {
          scheduleDateStr = formatDateToYYYYMMDD(new Date(sDate));
        }
        return scheduleDateStr === targetDateStr;
      }

      // N?u kh?ng có date nh?ng có dayOfWeek, ki?m tra xem có thu?c tu?n hi?n t?i kh?ng
      const sDay = schedule.dayOfWeek;
      if (sDay && sDay === dayOfWeek) {
        // N?u schedule ch? có dayOfWeek (kh?ng có date), hi?n th? cho t?t c? các tu?n có cùng dayOfWeek
        // Nh?ng ?? chính xác h?n, ta ch? hi?n th? n?u kh?ng có schedule nào khác có date cho ngày này
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

        // N?u kh?ng có schedule nào có date cho ngày này, hi?n th? schedule có dayOfWeek
        return !hasDateSchedule;
      }

      return false;
    }) || null;
  };

  // ?i?u h??ng tu?n
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Ch? nh?t, 1 = Mon, ..., 6 = Sat
    // Tính s? ngày c?n lùi l?i ?? ??n th? 2
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

  // L?y th?ng tin tu?n hi?n t?i
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
    return <div className="schedule-list-page"><div className="loading">Loading...</div></div>;
  }

  const isTeacher = userRole === 'TEACHER';
  const pageTitle = isStudent ? 'View Timetable' : isTeacher ? 'View Timetable' : 'Schedule Management';

  return (
    <div className="schedule-list-page">
      <div className="common-page-header">
        <h1>{pageTitle}</h1>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
              Auto Generate
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
              Add Schedule
            </button>
          </div>
        )}
      </div>

      {!isStudent && (
        <div className="schedule-filters">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Select class:
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={{ padding: '5px' }}
              >
                <option value="">-- Select Class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </label>
            {canManage && selectedClassId && (
              <button
                className="btn btn-danger"
                onClick={handleDeleteAllByClass}
                title="Delete all schedules of selected class"
              >
                Delete all class schedules
              </button>
            )}
          </div>
        </div>
      )}

      {isStudent && classes.length > 0 && (
        <div className="schedule-filters" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>Your class:</span>
            <span>{classes.length > 0 ? classes[0].name : 'Không có'}</span>
          </div>
        </div>
      )}

      {isStudent && classes.length === 0 && !loading && (
        <div className="schedule-filters" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffc107' }}>
            <span style={{ fontWeight: 'bold', color: '#856404' }}>Notice:</span>
            <span style={{ color: '#856404' }}>You are not assigned to any class. Please contact the administrator.</span>
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
              title="Previous Week"
            >
              ← Previous Week
            </button>
            <button
              className="btn btn-primary"
              onClick={goToToday}
              title="Today"
            >
              Today
            </button>
            <button
              className="btn btn-secondary"
              onClick={goToNextWeek}
              title="Next Week"
            >
              Next Week →
            </button>
            <div className="week-info">
              <span className="week-label">Week:</span>
              <span className="week-dates">{getWeekInfo()}</span>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="schedule-empty-state">
              {isStudent ? (
                <>
                  <p>Your class has no schedules yet.</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    Please contact your homeroom teacher for more information.
                  </p>
                </>
              ) : isTeacher ? (
                <>
                  <p>You have no assigned schedules yet.</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    Please contact the admin to get teaching assignments.
                  </p>
                </>
              ) : (
                'No schedules yet'
              )}
            </div>
          ) : (
            <div className="schedule-timetable">
              {/* Header v?i các th? trong tu?n */}
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

              {/* Các hàng ti?t h?c */}
              {[1, 2, 3, 4, 5].map(period => (
                <div key={period} className="timetable-row">
                  <div className="timetable-period-label">
                    <span className="period-number">{period}</span>
                    <span className="period-text">Period</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                    const schedule = getScheduleForDayAndPeriod(dayOfWeek, period);
                    return (
                      <div key={dayOfWeek} className="timetable-slot">
                        {schedule ? (
                          <div className="schedule-card">
                            <div className="schedule-card-header">
                              <span className="schedule-subject">{schedule.subject?.name || 'Không có'}</span>
                            </div>
                            <div className="schedule-card-body">
                              <div className="schedule-info-item">
                                <span className="info-icon">Info:</span>
                                <span className="info-text">{schedule.teacher?.fullName || 'Không có'}</span>
                              </div>
                              <div className="schedule-info-item">
                                <span className="info-icon">Info:</span>
                                <span className="info-text">{schedule.room || 'Không có'}</span>
                              </div>
                            </div>
                            {canManage && (
                              <div className="schedule-card-actions">
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => handleEdit(schedule)}
                                  title="Edit"
                                >
                                  E
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  onClick={() => handleDelete(schedule.id)}
                                  title="Delete"
                                >
                                  D
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

      {/* Modal t?o/s?a l?ch h?c */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Class *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">-- Select subject --</option>
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
                  <option value="">-- Select teacher --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date (YYYY-MM-DD) or weekday</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, dayOfWeek: '' })}
                    placeholder="Specific date"
                  />
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value, date: '' })}
                  >
                    <option value="">-- Select day --</option>
                    <option value="1">Mon</option>
                    <option value="2">Tue</option>
                    <option value="3">Wed</option>
                    <option value="4">Thu</option>
                    <option value="5">Fri</option>
                    <option value="6">Sat</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Period *</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  required
                >
                  <option value="">-- Select period --</option>
                  <option value="1">Period 1</option>
                  <option value="2">Period 2</option>
                  <option value="3">Period 3</option>
                  <option value="4">Period 4</option>
                  <option value="5">Period 5</option>
                </select>
              </div>

              <div className="form-group">
                <label>Room</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. A101"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingSchedule ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal t?o t? ??ng */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Auto Generate Timetable</h2>
            <div className="form-group">
              <label>Class *</label>
              <select
                value={generateData.classId}
                onChange={(e) => setGenerateData({ ...generateData, classId: e.target.value })}
                required
              >
                <option value="">-- Select Class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Number of weeks *</label>
              <input
                type="number"
                value={generateData.numberOfWeeks}
                onChange={(e) => setGenerateData({ ...generateData, numberOfWeeks: e.target.value })}
                min="1"
                max="20"
                required
                placeholder="Enter weeks (1-20)"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Timetable will be generated from current week for the selected number of weeks.
              </small>
            </div>

            <div className="form-group">
              <label>Subject Assignment</label>
              {generateData.subjectAssignments.map((assignment, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                  <select
                    value={assignment.subjectId}
                    onChange={(e) => updateSubjectAssignment(index, 'subjectId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Subject --</option>
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
                    placeholder="Periods/week"
                    min="1"
                    max="5"
                    style={{ width: '100px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeSubjectAssignment(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addSubjectAssignment}
              >
                + Add Subject
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
              >
                Auto Generate
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleListPage;









