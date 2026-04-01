import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/lib/api';
import './ScheduleListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';
import {
  DAY_COLUMNS,
  TIMELINE_MORNING,
  TIMELINE_AFTERNOON,
  formatTimeRange,
  MAX_PERIOD,
} from './schoolScheduleTimeline';
import { colorsForSubject } from './subjectColors';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';

const ScheduleListPage = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teachersForSelectedSubject, setTeachersForSelectedSubject] = useState([]);
  const [loadingTeachersBySubject, setLoadingTeachersBySubject] = useState(false);
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
    numberOfWeeks: 1,
    session: 'BOTH'
  });
  const [generateClassSections, setGenerateClassSections] = useState([]);
  const [loadingGenerateClassSections, setLoadingGenerateClassSections] = useState(false);

  /** Cập nhật mỗi phút để highlight tiết hiện tại */
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      // Lấy ID con đang được chọn (ví dụ từ localStorage)
      const activeStudentId = localStorage.getItem('activeStudentId');

      // Fetch classes
      const classesRes = await api.get('/classes');
      let allClasses = classesRes.data.classes || [];

      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter(cls => cls.school?.id === schoolId);
      } else if ((userRole === 'STUDENT' && user?.id) || (userRole === 'PARENT' && activeStudentId)) {
        // Nếu là học sinh hoặc phụ huynh đã chọn con
        const targetStudentId = userRole === 'STUDENT' ? user.id : activeStudentId;
        try {
          const enrollmentRes = await api.get(`/users/${targetStudentId}/enrollment`);
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
      // Chỉ lấy môn thuộc đúng trường (tránh lấy toàn DB)
      const subjectsRes = schoolId
        ? await api.get(`/subjects/school/${schoolId}`)
        : await api.get('/subjects');
      let subj = subjectsRes.data.subjects || [];
      // Nếu API trả nhiều hơn kỳ vọng, vẫn chặn lại theo school ở FE
      if (schoolId) {
        subj = subj.filter((s) => (s?.school?.id ?? s?.school_id) === schoolId);
      }
      setSubjects(subj);

      /**
       * BE UserService.getUsersFilteredAndEnriched:
       * - STUDENT + ?userRole=ADMIN → Forbidden (403)
       * - TEACHER/ADMIN thiếu schoolId trong query → rơi nhánh else → 403
       * - SUPER_ADMIN + ?userRole=ADMIN → chỉ trả ADMIN, không phải giáo viên
       * Dùng school từ user hoặc từ lớp đã lọc khi user chưa có school gắn.
       */
      const schoolIdForUsers =
        schoolId ||
        (allClasses[0]?.school?.id ?? allClasses[0]?.school_id) ||
        null;

      const buildTeachersUrl = () => {
        if (userRole === 'SUPER_ADMIN') {
          return '/users?userRole=TEACHER';
        }
        if (userRole === 'ADMIN' && schoolIdForUsers) {
          return `/users?userRole=ADMIN&schoolId=${schoolIdForUsers}`;
        }
        if (userRole === 'TEACHER' && schoolIdForUsers) {
          return `/users?userRole=TEACHER&schoolId=${schoolIdForUsers}`;
        }
        return null;
      };

      if (userRole === 'STUDENT') {
        setTeachers([]);
      } else {
        const teachersUrl = buildTeachersUrl();
        if (!teachersUrl) {
          setTeachers([]);
        } else {
          try {
            const teachersRes = await api.get(teachersUrl);
            const allUsers = teachersRes.data.users || [];
            const teacherUsers = allUsers.filter((userItem) => {
              const roleName = userItem.role?.name?.toUpperCase();
              const isTeacherRole =
                roleName === 'TEACHER' ||
                roleName?.startsWith('TEACHER') ||
                roleName === 'GIáO VIêN';

              if (!isTeacherRole) return false;

              if (schoolIdForUsers && (userRole === 'ADMIN' || userRole === 'TEACHER')) {
                return userItem.school?.id === schoolIdForUsers;
              }

              return true;
            });
            setTeachers(teacherUsers);
          } catch (teacherError) {
            console.error('Error fetching teachers:', teacherError);
            setTeachers([]);
          }
        }
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

  // Modal thêm/sửa lịch học:
  // lọc giáo viên theo đúng LỚP + MÔN từ dữ liệu lớp học phần (class_sections)
  useEffect(() => {
    const classIdRaw = formData.classId || selectedClassId;
    const classId = classIdRaw ? Number(classIdRaw) : null;
    const subjectId = formData.subjectId ? Number(formData.subjectId) : null;

    // Chưa chọn đủ lớp + môn thì chưa có cơ sở lọc theo lớp học phần
    if (!classId || !subjectId) {
      setTeachersForSelectedSubject([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingTeachersBySubject(true);
        const res = await api.get(`/class-sections/class/${classId}`);
        if (cancelled) return;
        const sections = res.data?.classSections || [];
        const list = [];
        const seen = new Set();
        sections.forEach((cs) => {
          const sid = cs?.subject?.id ?? cs?.subject_id;
          const t = cs?.teacher;
          const tid = t?.id;
          const st = (cs?.status || '').toUpperCase();
          if (Number(sid) !== subjectId) return;
          if (!tid) return;
          if (st && st !== 'ACTIVE') return;
          if (seen.has(tid)) return;
          seen.add(tid);
          list.push({ id: tid, fullName: t.fullName || `GV #${tid}` });
        });
        setTeachersForSelectedSubject(list);

        // Nếu giáo viên đang chọn không nằm trong lớp học phần của lớp+môn này -> reset
        const currentTeacherId = formData.teacherId ? String(formData.teacherId) : '';
        if (currentTeacherId) {
          const exists = list.some((t) => String(t.id) === currentTeacherId);
          if (!exists) {
            setFormData((p) => ({ ...p, teacherId: '' }));
          }
        }
      } catch (_) {
        if (cancelled) return;
        setTeachersForSelectedSubject([]);
      } finally {
        if (!cancelled) setLoadingTeachersBySubject(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [formData.classId, selectedClassId, formData.subjectId]);

  const fetchSchedules = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const activeStudentId = localStorage.getItem('activeStudentId');
      let schedulesData = [];

      if ((userRole === 'STUDENT' && user?.id) || (userRole === 'PARENT' && activeStudentId)) {
        const targetStudentId = userRole === 'STUDENT' ? user.id : activeStudentId;
        try {
          const response = await api.get(`/schedules/student/${targetStudentId}`);
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
        console.log('Date selected:', formData.date, '-> Sending:', schedulePayload.date);
      } else if (formData.dayOfWeek && formData.dayOfWeek.trim() !== '') {
        const dayOfWeekValue = parseInt(formData.dayOfWeek);
        if (dayOfWeekValue >= 1 && dayOfWeekValue <= 6) {
          schedulePayload.dayOfWeek = dayOfWeekValue;
          // Thứ 2 của tuần đang xem trên lưới — BE tính đúng ngày theo tuần admin chọn (không phải tuần hiện tại)
          schedulePayload.weekStart = formatDateToYYYYMMDD(currentWeekStart);
        } else {
          alert('Thứ trong tuần không hợp lệ. Vui lòng chọn từ Thứ 2 đến Thứ 7.');
          return;
        }
      } else {
        alert('Vui lòng chọn ngày cụ thể hoặc thứ trong tuần.');
        return;
      }

      console.log('Submitting schedule:', schedulePayload);
      console.log('Form data:', formData);

      let response;
      if (editingSchedule) {
        response = await api.put(`/schedules/${editingSchedule.id}`, schedulePayload);
        alert('Cập nhật lịch học thành công!');
      } else {
        response = await api.post('/schedules', schedulePayload);
        alert('Thêm lịch học thành công!');
      }

      const warning = response?.data?.warning;
      if (warning) {
        // Cảnh báo nhẹ: chưa có phân công chính thức lớp–môn–GV
        alert(warning);
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
      alert('Lỗi khi lưu lịch học: ' + errorMessage);
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
    const confirmMessage = `Bạn có chắc chắn muốn xóa TẤT CẢ thời khóa biểu của ${className}?\n\nHành động này không thể hoàn tác!`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.delete(`/schedules/class/${selectedClassId}`);
        const count = response.data.count || 0;
        alert(`Đã xóa ${count} lịch học của ${className} thành công.`);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting all schedules by class:', error);
        alert('Lỗi khi xóa thời khóa biểu: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ THỜI KHÓA BIỂU TRONG HỆ THỐNG?\n\nHành động này sẽ xóa toàn bộ lịch học và không thể hoàn tác!\n\nGõ "DELETE ALL" để xác nhận:`;

    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'DELETE ALL') {
      if (userInput !== null) {
        alert('Chuỗi xác nhận không khớp. Đã hủy thao tác.');
      }
      return;
    }

    if (window.confirm('Xác nhận lần cuối: XÓA TOÀN BỘ thời khóa biểu?')) {
      try {
        const response = await api.delete('/schedules/all');
        const count = response.data.count || 0;
        alert(`Đã xóa ${count} lịch học trên toàn hệ thống thành công.`);
        fetchSchedules();
        setSelectedClassId('');
      } catch (error) {
        console.error('Error deleting all schedules:', error);
        alert('Lỗi khi xóa thời khóa biểu: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleGenerate = async () => {
    try {
      if (!generateData.classId || generateData.subjectAssignments.length === 0) {
        alert('Vui lòng chọn lớp và thêm ít nhất một môn học.');
        return;
      }

      const schoolId = user?.school?.id;
      const payload = {
        classId: parseInt(generateData.classId),
        ...(schoolId != null && schoolId !== '' ? { schoolId: Number(schoolId) } : {}),
        subjectAssignments: generateData.subjectAssignments.map(a => ({
          subjectId: parseInt(a.subjectId),
          teacherId: parseInt(a.teacherId),
          periodsPerWeek: parseInt(a.periodsPerWeek)
        })),
        numberOfWeeks: parseInt(generateData.numberOfWeeks) || 1,
        session: generateData.session || 'BOTH'
      };

      const response = await api.post('/schedules/generate', payload);
      const data = response.data || {};
      const numberOfWeeksCreated = parseInt(generateData.numberOfWeeks) || 1;
      if (data.success) {
        setShowGenerateModal(false);
        setGenerateData({
          classId: '',
          subjectAssignments: [],
          numberOfWeeks: 1,
          session: 'BOTH'
        });
        await fetchSchedules();
        alert(
          `${data.message || 'Thành công.'}\n\n` +
            `Tiết yêu cầu (tổng/tuần): ${data.requestedPeriods ?? '-'} — Đã tạo: ${data.assignedPeriods ?? '-'}\n` +
            `Sức chứa tuần đầu: ${data.weeklyCapacity ?? '-'}\n\n` +
            `Đã tạo cho ${numberOfWeeksCreated} tuần. Dùng "Tuần sau →" để xem thêm.`
        );
      } else {
        const unmet = Array.isArray(data.unmetAssignments) ? data.unmetAssignments : [];
        const unmetText =
          unmet.length > 0
            ? '\n\nChưa đủ tiết:\n' +
              unmet
                .map(
                  (u) =>
                    `- Dòng ${u.lineIndex + 1}: ${u.subjectName ?? u.subjectId} / ${u.teacherName ?? u.teacherId} — cần ${u.requiredPeriods}, được ${u.assignedPeriods}`
                )
                .join('\n')
            : '';
        alert((data.message || 'Tạo TKB tự động không hoàn tất.') + unmetText);
      }
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
    // Đổi môn thì reset giáo viên để tránh chọn sai cặp lớp+môn
    if (field === 'subjectId') {
      updated[index] = { ...updated[index], subjectId: value, teacherId: '' };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setGenerateData({ ...generateData, subjectAssignments: updated });
  };

  /** Mỗi môn chỉ chọn một lần: ẩn môn đã dùng ở dòng khác (vẫn hiện môn đang chọn ở dòng này). */
  const getSubjectsForAssignmentRow = (rowIndex) => {
    const assignments = generateData.subjectAssignments;
    const takenElsewhere = new Set(
      assignments
        .map((a, i) =>
          i !== rowIndex && a.subjectId ? String(a.subjectId) : null
        )
        .filter(Boolean)
    );
    const currentId = assignments[rowIndex]?.subjectId
      ? String(assignments[rowIndex].subjectId)
      : '';
    return subjects.filter(
      (s) =>
        !takenElsewhere.has(String(s.id)) ||
        (currentId !== '' && String(s.id) === currentId)
    );
  };

  // Tạo TKB tự động: chỉ lấy giáo viên theo lớp học phần của lớp đang chọn
  useEffect(() => {
    const classId = generateData.classId ? Number(generateData.classId) : null;
    if (!classId) {
      setGenerateClassSections([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingGenerateClassSections(true);
        const res = await api.get(`/class-sections/class/${classId}`);
        if (cancelled) return;
        setGenerateClassSections(res.data?.classSections || []);
      } catch (_) {
        if (cancelled) return;
        setGenerateClassSections([]);
      } finally {
        if (!cancelled) setLoadingGenerateClassSections(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [generateData.classId]);

  const getTeachersForGenerateSubject = (subjectIdRaw) => {
    const subjectId = subjectIdRaw ? Number(subjectIdRaw) : null;
    if (!subjectId) return [];
    const seen = new Set();
    const out = [];
    (generateClassSections || []).forEach((cs) => {
      const sid = cs?.subject?.id ?? cs?.subject_id;
      const teacher = cs?.teacher;
      const tid = teacher?.id;
      const st = (cs?.status || '').toUpperCase();
      if (Number(sid) !== subjectId) return;
      if (!tid) return;
      if (st && st !== 'ACTIVE') return;
      if (seen.has(tid)) return;
      seen.add(tid);
      out.push({ id: tid, fullName: teacher.fullName || `GV #${tid}` });
    });
    return out;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
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

  // Cột có phải là ngày hôm nay không (để làm nổi bật)
  const isTodayColumn = (dayOfWeek) => {
    const todayStr = formatDateToYYYYMMDD(new Date());
    return getDateStringForDayOfWeek(dayOfWeek) === todayStr;
  };

  const nowMinutes = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, [clock]);

  const hasTodayInGrid = DAY_COLUMNS.some((d) => isTodayColumn(d));

  const isRowNow = (row) =>
    hasTodayInGrid &&
    typeof row.startMin === 'number' &&
    typeof row.endMin === 'number' &&
    nowMinutes >= row.startMin &&
    nowMinutes < row.endMin;

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

  /** Số ô tiết (sáng + chiều) có dữ liệu trong ngày — khớp logic getScheduleForDayAndPeriod */
  const getLessonCountForDay = (dayOfWeek) => {
    let n = 0;
    for (let p = 1; p <= MAX_PERIOD; p++) {
      if (getScheduleForDayAndPeriod(dayOfWeek, p)) n++;
    }
    return n;
  };

  const dayHeaderMeta = useMemo(() => {
    const short = ['', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
    return DAY_COLUMNS.map((d) => {
      const ymd = getDateStringForDayOfWeek(d);
      let dayNum = '';
      if (ymd) {
        const parts = ymd.split('-').map(Number);
        dayNum = String(parts[2]);
      }
      return { dayOfWeek: d, short: short[d], dayNum, count: getLessonCountForDay(d) };
    });
  }, [currentWeekStart, schedules]);

  const userRole = user?.role?.name?.toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin;
  const isStudent = userRole === 'STUDENT';
  const isTeacher = userRole === 'TEACHER';
  const isParent = userRole === 'PARENT';
  const canManage = isAdmin;

  if (loading) {
    return <div className="schedule-list-page"><div className="loading">Đang tải...</div></div>;
  }

  const isViewOnly = isStudent || isTeacher || isParent;
  const pageTitle = isViewOnly ? 'Xem thời khóa biểu' : 'Quản lý thời khóa biểu';

  return (
    <div className="schedule-list-page">
      <div className="common-page-header">
        <h1>{pageTitle}</h1>
        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
              Tạo TKB tự động
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
                title="Xóa toàn bộ TKB của lớp đang chọn"
              >
                Xóa toàn bộ TKB lớp này
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
            <span style={{ fontWeight: 'bold', color: '#856404' }}>Lưu ý:</span>
            <span style={{ color: '#856404' }}>Bạn chưa được xếp vào lớp nào. Vui lòng liên hệ quản trị viên.</span>
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
              Hôm nay
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

          {schedules.length === 0 && (
            <div className="schedule-empty-state schedule-empty-state--banner">
              {isStudent ? (
                <>
                  <p>Lớp của bạn hiện chưa có tiết học nào được xếp trên lưới tuần này.</p>
                  <p className="schedule-empty-state__hint">
                    Vui lòng liên hệ giáo viên chủ nhiệm nếu cần hỗ trợ.
                  </p>
                </>
              ) : isTeacher ? (
                <>
                  <p>Chưa có tiết dạy trên tuần đang xem.</p>
                  <p className="schedule-empty-state__hint">
                    Liên hệ quản trị viên để được phân công.
                  </p>
                </>
              ) : (
                <p>Chưa có dữ liệu thời khóa biểu cho lớp / tuần đang chọn.</p>
              )}
            </div>
          )}

          <div className="schedule-timetable-v2">
            <div className="tt-v2-header">
              <div className="tt-v2-corner">
                <span className="tt-v2-corner__label">Khung giờ</span>
              </div>
              {dayHeaderMeta.map(({ dayOfWeek, short, dayNum, count }) => {
                const today = isTodayColumn(dayOfWeek);
                const headClass = [
                  'tt-v2-day-head',
                  today && 'tt-v2-day-head--today',
                  count > 0 && 'tt-v2-day-head--has-lessons',
                  count === 0 && !today && 'tt-v2-day-head--sparse',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div key={dayOfWeek} className={headClass}>
                    <div className="tt-v2-day-head__num">{dayNum}</div>
                    <div className="tt-v2-day-head__dow">THỨ {short}</div>
                    <div className="tt-v2-day-head__sub">
                      {count > 0 ? (
                        <span className="tt-v2-day-head__badge">{count} tiết</span>
                      ) : (
                        <span className="tt-v2-day-head__pip" title="Không có tiết xếp" aria-label="Không có tiết" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tt-v2-section-title">Buổi sáng</div>
            {TIMELINE_MORNING.map((row) => {
              const rowNow = isRowNow(row);
              return (
                <div
                  key={row.id}
                  className={['tt-v2-row', `tt-v2-row--${row.type}`, rowNow && 'tt-v2-row--now']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={['tt-v2-time-rail', rowNow && 'tt-v2-time-rail--now'].filter(Boolean).join(' ')}>
                    <span className="tt-v2-time-range">{formatTimeRange(row.startMin, row.endMin)}</span>
                    <span className="tt-v2-time-label">{row.label}</span>
                  </div>
                  {DAY_COLUMNS.map((dayOfWeek) => {
                    if (row.type === 'homeroom' || row.type === 'short_break' || row.type === 'long_break') {
                      return (
                        <div
                          key={dayOfWeek}
                          className={`tt-v2-cell tt-v2-cell--meta${isTodayColumn(dayOfWeek) ? ' tt-v2-cell--today' : ''}`}
                        />
                      );
                    }
                    const schedule = getScheduleForDayAndPeriod(dayOfWeek, row.period);
                    const sid = schedule?.subject?.id ?? schedule?.subject_id;
                    const displayTitle = scheduleSubjectDisplayName(schedule, '');
                    const palette = colorsForSubject(sid, displayTitle);
                    const emptyTitle = canManage
                      ? 'Chưa có tiết — dùng nút Thêm lịch học để phân công.'
                      : 'Chưa có tiết học trong khung giờ này.';
                    return (
                      <div
                        key={dayOfWeek}
                        className={[
                          'tt-v2-cell',
                          'tt-v2-cell--lesson',
                          schedule ? 'tt-v2-cell--filled' : 'tt-v2-cell--empty',
                          isTodayColumn(dayOfWeek) ? 'tt-v2-cell--today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {schedule ? (
                          <div
                            className="tt-lesson-card tt-lesson-card--filled"
                            style={{
                              background: palette.bg,
                              borderLeft: `4px solid ${palette.accent}`,
                            }}
                          >
                            <div className="tt-lesson-card__time">{formatTimeRange(row.startMin, row.endMin)}</div>
                            <div className="tt-lesson-card__title" style={{ color: palette.title }}>
                              {scheduleSubjectDisplayName(schedule)}
                            </div>
                            <div className="tt-lesson-card__meta">{schedule.teacher?.fullName || '—'}</div>
                            <div className="tt-lesson-card__room">Phòng: {schedule.room || '—'}</div>
                            {canManage && (
                              <div className="tt-lesson-card__actions">
                                {!(schedule.fixedActivityCode || schedule.fixed_activity_code) && (
                                  <button
                                    type="button"
                                    className="tt-lesson-card__btn tt-lesson-card__btn--edit"
                                    onClick={() => handleEdit(schedule)}
                                    title="Sửa tiết học"
                                  >
                                    Sửa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="tt-lesson-card__btn tt-lesson-card__btn--del"
                                  onClick={() => handleDelete(schedule.id)}
                                  title="Xóa tiết học"
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`tt-lesson-card tt-lesson-card--empty${canManage ? ' tt-lesson-card--empty--manage' : ''}`}
                            title={emptyTitle}
                            aria-label={emptyTitle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="tt-v2-section-gap" aria-hidden="true" />
            <div className="tt-v2-section-divider" role="separator" aria-label="Chuyển sang buổi chiều">
              <span className="tt-v2-section-divider__line" aria-hidden="true" />
              <span className="tt-v2-section-divider__label">Buổi chiều</span>
              <span className="tt-v2-section-divider__line" aria-hidden="true" />
            </div>
            <p className="tt-v2-afternoon-note">
              Buổi chiều: tiết 6–10 trên lưới khớp số tiết 6–10 trên máy chủ.
            </p>
            {TIMELINE_AFTERNOON.map((row) => {
              const rowNow = isRowNow(row);
              return (
                <div
                  key={row.id}
                  className={['tt-v2-row', `tt-v2-row--${row.type}`, rowNow && 'tt-v2-row--now']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={['tt-v2-time-rail', rowNow && 'tt-v2-time-rail--now'].filter(Boolean).join(' ')}>
                    <span className="tt-v2-time-range">{formatTimeRange(row.startMin, row.endMin)}</span>
                    <span className="tt-v2-time-label">{row.label}</span>
                  </div>
                  {DAY_COLUMNS.map((dayOfWeek) => {
                    if (row.type === 'long_break') {
                      return (
                        <div
                          key={dayOfWeek}
                          className={`tt-v2-cell tt-v2-cell--meta${isTodayColumn(dayOfWeek) ? ' tt-v2-cell--today' : ''}`}
                        />
                      );
                    }
                    const schedule = row.period != null
                      ? getScheduleForDayAndPeriod(dayOfWeek, row.period)
                      : null;
                    const sid = schedule?.subject?.id ?? schedule?.subject_id;
                    const displayTitle = scheduleSubjectDisplayName(schedule, '');
                    const palette = colorsForSubject(sid, displayTitle);
                    const emptyTitle = canManage
                      ? 'Chưa có tiết — dùng nút Thêm lịch học, chọn tiết 6–10 (buổi chiều).'
                      : 'Chưa có tiết học trong khung giờ này.';
                    return (
                      <div
                        key={dayOfWeek}
                        className={[
                          'tt-v2-cell',
                          'tt-v2-cell--lesson',
                          schedule ? 'tt-v2-cell--filled' : 'tt-v2-cell--empty',
                          isTodayColumn(dayOfWeek) ? 'tt-v2-cell--today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {schedule ? (
                          <div
                            className="tt-lesson-card tt-lesson-card--filled"
                            style={{
                              background: palette.bg,
                              borderLeft: `4px solid ${palette.accent}`,
                            }}
                          >
                            <div className="tt-lesson-card__time">{formatTimeRange(row.startMin, row.endMin)}</div>
                            <div className="tt-lesson-card__title" style={{ color: palette.title }}>
                              {scheduleSubjectDisplayName(schedule)}
                            </div>
                            <div className="tt-lesson-card__meta">{schedule.teacher?.fullName || '—'}</div>
                            <div className="tt-lesson-card__room">Phòng: {schedule.room || '—'}</div>
                            {canManage && (
                              <div className="tt-lesson-card__actions">
                                {!(schedule.fixedActivityCode || schedule.fixed_activity_code) && (
                                  <button
                                    type="button"
                                    className="tt-lesson-card__btn tt-lesson-card__btn--edit"
                                    onClick={() => handleEdit(schedule)}
                                    title="Sửa tiết học"
                                  >
                                    Sửa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="tt-lesson-card__btn tt-lesson-card__btn--del"
                                  onClick={() => handleDelete(schedule.id)}
                                  title="Xóa tiết học"
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`tt-lesson-card tt-lesson-card--empty${canManage ? ' tt-lesson-card--empty--manage' : ''}`}
                            title={emptyTitle}
                            aria-label={emptyTitle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal t?o/s?a l?ch h?c */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSchedule ? 'Sửa lịch học' : 'Thêm lịch học'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Lớp *</label>
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
                  disabled={!formData.subjectId || !(formData.classId || selectedClassId)}
                >
                  <option value="">
                    {!formData.subjectId
                      ? '-- Chọn môn trước --'
                      : loadingTeachersBySubject
                        ? '-- Đang tải giáo viên --'
                        : '-- Chọn giáo viên --'}
                  </option>
                  {teachersForSelectedSubject.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ngày (YYYY-MM-DD) hoặc thứ trong tuần</label>
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
                  <optgroup label="Buổi sáng">
                    <option value="1">Tiết 1</option>
                    <option value="2">Tiết 2</option>
                    <option value="3">Tiết 3</option>
                    <option value="4">Tiết 4</option>
                    <option value="5">Tiết 5</option>
                  </optgroup>
                  <optgroup label="Buổi chiều">
                    <option value="6">Tiết 6</option>
                    <option value="7">Tiết 7</option>
                    <option value="8">Tiết 8</option>
                    <option value="9">Tiết 9</option>
                    <option value="10">Tiết 10</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label>Phòng học</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="VD: A101"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingSchedule ? 'Cập nhật' : 'Thêm mới'}
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

      {/* Modal t?o t? ??ng */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Tạo thời khóa biểu tự động</h2>
            <div className="form-group">
              <label>Lớp *</label>
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
              <label>Số tuần *</label>
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
                Thời khóa biểu sẽ được tạo từ tuần hiện tại cho số tuần đã chọn.
              </small>
            </div>

            <div className="form-group">
              <label>Buổi tạo lịch *</label>
              <select
                value={generateData.session}
                onChange={(e) => setGenerateData({ ...generateData, session: e.target.value })}
                required
                style={{ width: '100%' }}
              >
                <option value="BOTH">Cả ngày (sáng + chiều)</option>
                <option value="MORNING">Chỉ buổi sáng</option>
                <option value="AFTERNOON">Chỉ buổi chiều</option>
              </select>
              <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Nếu chọn sáng thì không tạo tiết chiều, và ngược lại.
              </small>
            </div>

            <div className="form-group">
              <label>Phân bổ môn học</label>
              {generateData.subjectAssignments.map((assignment, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                  {(() => {
                    const eligibleTeachers = getTeachersForGenerateSubject(assignment.subjectId);
                    return (
                      <>
                  <select
                    value={assignment.subjectId}
                    onChange={(e) => updateSubjectAssignment(index, 'subjectId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Môn học --</option>
                    {getSubjectsForAssignmentRow(index).map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  <select
                    value={assignment.teacherId}
                    onChange={(e) => updateSubjectAssignment(index, 'teacherId', e.target.value)}
                    style={{ flex: 1 }}
                    disabled={!generateData.classId || !assignment.subjectId || loadingGenerateClassSections}
                  >
                    <option value="">
                      {!generateData.classId
                        ? '-- Chọn lớp trước --'
                        : !assignment.subjectId
                          ? '-- Chọn môn trước --'
                          : loadingGenerateClassSections
                            ? '-- Đang tải giáo viên --'
                            : '-- Giáo viên --'}
                    </option>
                    {eligibleTeachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={assignment.periodsPerWeek}
                    onChange={(e) => updateSubjectAssignment(index, 'periodsPerWeek', e.target.value)}
                    placeholder="Tiết/tuần"
                    min="1"
                    max="10"
                    style={{ width: '100px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeSubjectAssignment(index)}
                  >
                    Xóa
                  </button>
                      </>
                    );
                  })()}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addSubjectAssignment}
              >
                + Thêm môn
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
