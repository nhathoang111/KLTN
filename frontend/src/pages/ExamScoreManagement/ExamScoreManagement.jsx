import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ExamScoreManagement.css';
import { useAuth } from '../../contexts/AuthContext';

const ExamScoreManagement = () => {
  const { user } = useAuth();
  const [examScores, setExamScores] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isScoreLocked, setIsScoreLocked] = useState(false);
  const [selectedClassForScore, setSelectedClassForScore] = useState('');
  const [selectedSubjectForScore, setSelectedSubjectForScore] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [classScoreData, setClassScoreData] = useState({}); // {studentId: {score15P, score1Tiet, scoreCuoiKi, note15P, note1Tiet, noteCuoiKi}}
  const [filteredSubjectsForClass, setFilteredSubjectsForClass] = useState([]); // Subjects được phân công cho lớp đã chọn
  const [displayFilterClassId, setDisplayFilterClassId] = useState(''); // Lớp đã chọn để filter hiển thị (cho Teacher)
  const [isEditMode, setIsEditMode] = useState(false); // Phân biệt giữa nhập điểm mới và sửa điểm

  useEffect(() => {
    fetchExamScores();
    fetchStudents();
    fetchSubjects();
    fetchClasses();
    fetchScoreLockStatus();
  }, [user]);

  const fetchScoreLockStatus = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      // Only fetch lock status for admin and teacher
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        const response = await api.get(`/exam-scores/lock-status/${schoolId}`);
        setIsScoreLocked(response.data.scoreLocked || false);
      }
    } catch (error) {
      console.error('Error fetching score lock status:', error);
      // Default to unlocked if error
      setIsScoreLocked(false);
    }
  };

  const fetchExamScores = async () => {
    try {
      const response = await api.get('/exam-scores');
      let allScores = response.data.examScores || [];
      const userRole = user?.role?.name?.toUpperCase();

      // Filter exam scores for admin, teacher, and student - only show scores from their own school
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
        allScores = allScores.filter(score => {
          const studentSchoolId = score.student?.school?.id || score.school?.id;
          return studentSchoolId === user.school.id;
        });
      }

      // For students, only show their own scores
      if (userRole === 'STUDENT' && user?.id) {
        allScores = allScores.filter(score => score.student?.id === user.id);
      }

      // For teachers, only show scores for subjects they teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          // Fetch schedules for this teacher
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];

          // Get unique subject IDs from schedules
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });

          console.log('Teacher assigned subject IDs:', Array.from(assignedSubjectIds));

          // Filter scores to only show those for assigned subjects
          allScores = allScores.filter(score => {
            const scoreSubjectId = score.subject?.id || score.subject_id;
            return assignedSubjectIds.has(scoreSubjectId);
          });

          console.log('Filtered exam scores for teacher:', allScores.length);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, show no scores for teacher
          allScores = [];
        }
      }

      // Log để debug scoreType
      console.log('=== FETCHED EXAM SCORES ===');
      console.log('Total scores:', allScores.length);
      allScores.forEach(score => {
        console.log(`Score ID ${score.id}: scoreType = "${score.scoreType || score.score_type || 'N/A'}"`);
        console.log(`  - score.scoreType: "${score.scoreType}"`);
        console.log(`  - score.score_type: "${score.score_type}"`);
      });

      setExamScores(allScores);
    } catch (error) {
      console.error('Error fetching exam scores:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      const isStudent = userRole === 'STUDENT';

      // Don't fetch users if student (to avoid 403)
      if (isStudent) {
        setStudents([]);
        return;
      }

      let url = '/users';
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
      }

      const response = await api.get(url);
      let allUsers = response.data.users || [];

      // Filter students and filter by admin/teacher's school
      let studentUsers = allUsers.filter(user => {
        const roleName = user.role?.name?.toUpperCase();
        return roleName === 'STUDENT' || roleName?.startsWith('STUDENT');
      });

      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        studentUsers = studentUsers.filter(student => student.school?.id === schoolId);
      }

      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      let allSubjects = response.data.subjects || [];

      const userRole = user?.role?.name?.toUpperCase();

      // Filter subjects for admin - only show subjects from their own school
      if (userRole === 'ADMIN' && user?.school?.id) {
        allSubjects = allSubjects.filter(subject => subject.school?.id === user.school.id);
      }

      // Filter subjects for teacher - only show subjects they are assigned to teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          // Fetch schedules for this teacher
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];

          // Get unique subject IDs from schedules
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });

          console.log('Teacher assigned subject IDs:', Array.from(assignedSubjectIds));

          // Filter subjects to only show assigned ones
          allSubjects = allSubjects.filter(subject => {
            const subjectId = subject.id;
            const isAssigned = assignedSubjectIds.has(subjectId);
            const isSameSchool = subject.school?.id === user.school?.id;
            return isAssigned && isSameSchool;
          });

          console.log('Filtered subjects for teacher:', allSubjects);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, still filter by school only
          if (user?.school?.id) {
            allSubjects = allSubjects.filter(subject => subject.school?.id === user.school.id);
          }
        }
      }

      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      let allClasses = response.data.classes || [];
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      // Filter classes for admin - only show classes from their own school
      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter(cls => cls.school?.id === schoolId);
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
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, show no classes for teacher
          allClasses = [];
        }
      }
      setClasses(allClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = async (group) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể chỉnh sửa điểm.');
      return;
    }

    // Mở modal nhập điểm theo lớp với lớp và môn học đã được chọn
    const classId = group.classEntity?.id?.toString() || '';
    const subjectId = group.subject?.id?.toString() || '';

    setSelectedClassForScore(classId);
    setSelectedSubjectForScore(subjectId);
    setIsEditMode(true); // Đặt chế độ sửa

    // Fetch schedules của lớp để lấy danh sách môn học được phân công
    if (classId) {
      try {
        const schedulesResponse = await api.get(`/schedules/class/${classId}`);
        const classSchedules = schedulesResponse.data.schedules || [];

        // Lấy danh sách subject IDs từ schedules
        const assignedSubjectIds = new Set();
        classSchedules.forEach(schedule => {
          const scheduleSubjectId = schedule.subject?.id || schedule.subject_id;
          if (scheduleSubjectId) {
            assignedSubjectIds.add(scheduleSubjectId);
          }
        });

        // Filter subjects để chỉ hiển thị các môn được phân công cho lớp này
        const userRole = user?.role?.name?.toUpperCase();
        let filteredSubjects = subjects.filter(subject => {
          const subjectId = subject.id;
          const isAssignedToClass = assignedSubjectIds.has(subjectId);

          // Nếu là teacher, cũng cần kiểm tra xem teacher có dạy môn này không
          if (userRole === 'TEACHER' && user?.id) {
            const isTaughtByTeacher = classSchedules.some(schedule => {
              const scheduleTeacherId = schedule.teacher?.id || schedule.teacher_id;
              const scheduleSubjectId = schedule.subject?.id || schedule.subject_id;
              return scheduleTeacherId === user.id && scheduleSubjectId === subjectId;
            });
            return isAssignedToClass && isTaughtByTeacher;
          }

          return isAssignedToClass;
        });

        setFilteredSubjectsForClass(filteredSubjects);
      } catch (error) {
        console.error('Error fetching schedules for class:', error);
        setFilteredSubjectsForClass(subjects);
      }
    }

    // Load danh sách học sinh và điểm hiện có
    // Refresh examScores trước để đảm bảo có dữ liệu mới nhất
    await fetchExamScores();
    await fetchStudentsByClass(classId);
    setShowClassModal(true);
  };

  const handleDelete = async (scoreId) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể xóa điểm.');
      return;
    }

    try {
      await api.delete(`/exam-scores/${scoreId}`);
      console.log('✅ Deleted score ID:', scoreId);
    } catch (error) {
      console.error('❌ Error deleting exam score:', error);
      throw error; // Re-throw để xử lý ở nơi gọi
    }
  };

  const handleDeleteAll = async (group) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể xóa điểm.');
      return;
    }

    const scoresToDelete = [];
    if (group.score15P) {
      scoresToDelete.push({ type: '15 phút', id: group.score15P.id });
    }
    if (group.score1Tiet) {
      scoresToDelete.push({ type: '1 tiết', id: group.score1Tiet.id });
    }
    if (group.scoreCuoiKi) {
      scoresToDelete.push({ type: 'cuối kỳ', id: group.scoreCuoiKi.id });
    }

    if (scoresToDelete.length === 0) {
      alert('Không có điểm nào để xóa');
      return;
    }

    const confirmMessage = scoresToDelete.length === 1
      ? `Bạn có chắc chắn muốn xóa điểm ${scoresToDelete[0].type}?`
      : `Bạn có chắc chắn muốn xóa tất cả điểm (${scoresToDelete.map(s => s.type).join(', ')})?`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log('=== DELETING ALL SCORES ===');
        console.log('Scores to delete:', scoresToDelete);

        // Xóa tất cả điểm đồng thời và đợi tất cả hoàn thành
        const deletePromises = scoresToDelete.map(({ id, type }) => {
          console.log(`Deleting ${type} score ID:`, id);
          return handleDelete(id);
        });

        await Promise.all(deletePromises);
        console.log('✅ All scores deleted successfully');

        // Đợi một chút để đảm bảo database đã cập nhật
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh danh sách điểm
        await fetchExamScores();

        alert('Xóa điểm thành công!');
      } catch (error) {
        console.error('❌ Error deleting scores:', error);
        alert('Có lỗi xảy ra khi xóa điểm số');
      }
    }
  };


  // Lấy danh sách học sinh theo lớp
  const fetchStudentsByClass = async (classId) => {
    if (!classId) {
      setClassStudents([]);
      setClassScoreData({});
      return;
    }

    try {
      console.log('=== FETCH STUDENTS BY CLASS ===');
      console.log('Class ID:', classId);
      console.log('Selected Subject:', selectedSubjectForScore);

      let studentsInClass = [];

      // Thử lấy học sinh từ API theo lớp
      try {
        console.log('Calling API: /classes/' + classId + '/students');
        const response = await api.get(`/classes/${classId}/students`);
        console.log('✅ API Response received:', response);
        console.log('Response data:', response.data);
        studentsInClass = response.data.students || [];
        console.log('✅ Fetched students by class:', studentsInClass.length);
        console.log('✅ Students data:', studentsInClass);

        if (studentsInClass.length === 0) {
          console.warn('⚠️ API returned empty students array. This class may have no enrolled students.');
        }
      } catch (apiError) {
        console.error('❌ API error when fetching students by class:', apiError);
        console.error('Error status:', apiError.response?.status);
        console.error('Error message:', apiError.message);
        console.error('Error response data:', apiError.response?.data);

        // Nếu API trả về 404, class không tồn tại hoặc route không được match
        if (apiError.response?.status === 404) {
          console.error('❌ Class not found (404). Route may not be matched correctly.');
          console.error('Please check backend logs to see if endpoint was called.');
        }
        studentsInClass = [];
      }

      // Chỉ hiển thị học sinh từ enrollments của lớp đã chọn
      if (studentsInClass.length === 0) {
        console.log('⚠️ No students enrolled in this class. Only students enrolled in the selected class will be displayed.');
      } else {
        console.log('✅ Successfully fetched', studentsInClass.length, 'students enrolled in class from API');
      }

      setClassStudents(studentsInClass);

      // Khởi tạo classScoreData với các học sinh
      const initialScoreData = {};
      studentsInClass.forEach(student => {
        // Tìm điểm hiện có của học sinh này cho môn học đã chọn
        const subjectId = selectedSubjectForScore ? parseInt(selectedSubjectForScore) : null;
        let existing15P = '', existing1Tiet = '', existingCuoiKi = '';
        let note15P = '', note1Tiet = '', noteCuoiKi = '';

        if (subjectId) {
          const existingScores = examScores.filter(score =>
            score.student?.id === student.id &&
            score.subject?.id === subjectId
          );

          const score15P = existingScores.find(s => {
            const st = (s.scoreType || s.score_type || '15P').toUpperCase();
            return st === '15P';
          });
          const score1Tiet = existingScores.find(s => {
            const st = (s.scoreType || s.score_type || '').toUpperCase();
            return st === '1TIET';
          });
          const scoreCuoiKi = existingScores.find(s => {
            const st = (s.scoreType || s.score_type || '').toUpperCase();
            return st === 'CUOIKI';
          });

          existing15P = score15P?.score?.toString() || '';
          existing1Tiet = score1Tiet?.score?.toString() || '';
          existingCuoiKi = scoreCuoiKi?.score?.toString() || '';
          note15P = score15P?.note || '';
          note1Tiet = score1Tiet?.note || '';
          noteCuoiKi = scoreCuoiKi?.note || '';
        }

        initialScoreData[student.id] = {
          score15P: existing15P,
          score1Tiet: existing1Tiet,
          scoreCuoiKi: existingCuoiKi,
          note15P: note15P,
          note1Tiet: note1Tiet,
          noteCuoiKi: noteCuoiKi
        };
      });
      setClassScoreData(initialScoreData);
    } catch (error) {
      console.error('Error fetching students by class:', error);
      setClassStudents([]);
      setClassScoreData({});
    }
  };

  // Xử lý khi chọn lớp
  const handleClassSelect = async (classId) => {
    setSelectedClassForScore(classId);
    setSelectedSubjectForScore(''); // Reset môn học khi đổi lớp
    setFilteredSubjectsForClass([]); // Reset filtered subjects

    // Fetch schedules của lớp để lấy danh sách môn học được phân công
    if (classId) {
      try {
        console.log('Fetching schedules for class ID:', classId);
        const schedulesResponse = await api.get(`/schedules/class/${classId}`);
        const classSchedules = schedulesResponse.data.schedules || [];

        console.log('Schedules for class:', classSchedules);

        // Lấy danh sách subject IDs từ schedules
        const assignedSubjectIds = new Set();
        classSchedules.forEach(schedule => {
          const subjectId = schedule.subject?.id || schedule.subject_id;
          if (subjectId) {
            assignedSubjectIds.add(subjectId);
          }
        });

        console.log('Assigned subject IDs for class:', Array.from(assignedSubjectIds));

        // Filter subjects để chỉ hiển thị các môn được phân công cho lớp này
        // Nếu là teacher, cũng cần filter theo môn mà teacher đó dạy
        const userRole = user?.role?.name?.toUpperCase();
        let filteredSubjects = subjects.filter(subject => {
          const subjectId = subject.id;
          const isAssignedToClass = assignedSubjectIds.has(subjectId);

          // Nếu là teacher, cũng cần kiểm tra xem teacher có dạy môn này không
          if (userRole === 'TEACHER' && user?.id) {
            // Kiểm tra xem schedule có teacher_id trùng với user.id không
            const isTaughtByTeacher = classSchedules.some(schedule => {
              const scheduleTeacherId = schedule.teacher?.id || schedule.teacher_id;
              const scheduleSubjectId = schedule.subject?.id || schedule.subject_id;
              return scheduleTeacherId === user.id && scheduleSubjectId === subjectId;
            });
            return isAssignedToClass && isTaughtByTeacher;
          }

          return isAssignedToClass;
        });

        console.log('Filtered subjects for class:', filteredSubjects);
        setFilteredSubjectsForClass(filteredSubjects);
      } catch (error) {
        console.error('Error fetching schedules for class:', error);
        // Nếu lỗi, hiển thị tất cả subjects (fallback)
        setFilteredSubjectsForClass(subjects);
      }
    } else {
      // Nếu không chọn lớp, hiển thị tất cả subjects
      setFilteredSubjectsForClass(subjects);
    }

    await fetchStudentsByClass(classId);
  };

  // Xử lý khi chọn môn học (reload danh sách học sinh với điểm hiện có)
  const handleSubjectSelectForClass = async (subjectId) => {
    setSelectedSubjectForScore(subjectId);
    if (selectedClassForScore) {
      await fetchStudentsByClass(selectedClassForScore);
    }
  };

  // Xử lý submit điểm theo lớp
  const handleClassScoreSubmit = async (e) => {
    e.preventDefault();

    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể thêm hoặc chỉnh sửa điểm.');
      return;
    }

    if (!selectedClassForScore || !selectedSubjectForScore) {
      alert('Vui lòng chọn lớp và môn học');
      return;
    }

    // Lưu isEditMode vào biến local trước khi reset
    const currentEditMode = isEditMode;
    console.log('🔍 handleClassScoreSubmit - isEditMode:', isEditMode, 'currentEditMode:', currentEditMode);

    // Refresh examScores trước khi submit để đảm bảo có dữ liệu mới nhất
    console.log('🔄 Fetching fresh examScores before submit...');
    let freshExamScores = [];
    try {
      const response = await api.get('/exam-scores');
      let allScores = response.data.examScores || [];
      const userRole = user?.role?.name?.toUpperCase();

      // Filter exam scores for admin, teacher, and student - only show scores from their own school
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
        allScores = allScores.filter(score => {
          const studentSchoolId = score.student?.school?.id || score.school?.id;
          return studentSchoolId === user.school.id;
        });
      }

      // For students, only show their own scores
      if (userRole === 'STUDENT' && user?.id) {
        allScores = allScores.filter(score => score.student?.id === user.id);
      }

      // For teachers, only show scores for subjects they teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });
          allScores = allScores.filter(score => {
            const scoreSubjectId = score.subject?.id || score.subject_id;
            return assignedSubjectIds.has(scoreSubjectId);
          });
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          allScores = [];
        }
      }

      freshExamScores = allScores;
      console.log('✅ Fresh examScores fetched, total:', freshExamScores.length);
    } catch (error) {
      console.error('Error fetching fresh examScores:', error);
      // Fallback to existing examScores state
      freshExamScores = examScores;
      console.log('⚠️ Using existing examScores state, total:', freshExamScores.length);
    }

    try {
      const classId = parseInt(selectedClassForScore);
      const subjectId = parseInt(selectedSubjectForScore);
      const promises = [];

      // Xử lý điểm cho từng học sinh
      Object.keys(classScoreData).forEach(studentId => {
        const studentData = classScoreData[studentId];
        const studentIdInt = parseInt(studentId);

        // Tìm điểm hiện có của học sinh này từ freshExamScores
        // Kiểm tra cả student.id và student_id, subject.id và subject_id
        const existingScores = freshExamScores.filter(score => {
          const scoreStudentId = score.student?.id || score.student_id;
          const scoreSubjectId = score.subject?.id || score.subject_id;
          const scoreClassId = score.classEntity?.id || score.class_id;

          // So sánh với parseInt để đảm bảo cùng kiểu dữ liệu
          const studentMatch = scoreStudentId === studentIdInt || parseInt(scoreStudentId) === studentIdInt;
          const subjectMatch = scoreSubjectId === subjectId || parseInt(scoreSubjectId) === subjectId;
          const classMatch = scoreClassId === classId || parseInt(scoreClassId) === classId;

          const match = studentMatch && subjectMatch && classMatch;

          if (match) {
            console.log(`✅ Found existing score:`, {
              id: score.id,
              studentId: scoreStudentId,
              subjectId: scoreSubjectId,
              classId: scoreClassId,
              scoreType: score.scoreType || score.score_type,
              score: score.score,
              matching: { student: studentMatch, subject: subjectMatch, class: classMatch }
            });
          } else {
            // Log để debug tại sao không match
            console.log(`❌ Score not matching:`, {
              id: score.id,
              scoreStudentId, studentIdInt, studentMatch,
              scoreSubjectId, subjectId, subjectMatch,
              scoreClassId, classId, classMatch
            });
          }
          return match;
        });

        console.log(`Student ${studentIdInt} - Total existing scores found:`, existingScores.length);
        if (existingScores.length > 0) {
          console.log(`✅ Found scores:`, existingScores.map(s => ({
            id: s.id,
            type: s.scoreType || s.score_type,
            score: s.score
          })));
        } else {
          console.log(`⚠️ No existing scores found for student ${studentIdInt}, subject ${subjectId}, class ${classId}`);
        }

        const existing15P = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '15P').toUpperCase();
          return st === '15P';
        });
        const existing1Tiet = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '').toUpperCase();
          return st === '1TIET';
        });
        const existingCuoiKi = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '').toUpperCase();
          return st === 'CUOIKI';
        });

        // Xử lý điểm 15p
        const score15PInput = studentData.score15P ? studentData.score15P.trim() : '';
        if (score15PInput !== '') {
          const score15PValue = parseFloat(score15PInput);
          if (!isNaN(score15PValue) && score15PValue >= 0 && score15PValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: score15PValue,
              scoreType: '15P',
              note: studentData.note15P || ''
            };

            if (existing15P) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - 15P: updating existing score ${existing15P.id} to ${score15PValue}`);
              promises.push(api.put(`/exam-scores/${existing15P.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing15P && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, có thể xóa điểm (tùy chọn)
          // Hoặc giữ nguyên điểm cũ (không làm gì)
          // Ở đây tôi sẽ giữ nguyên điểm cũ (không xóa)
        }

        // Xử lý điểm 1 tiết
        const score1TietInput = studentData.score1Tiet ? studentData.score1Tiet.trim() : '';
        if (score1TietInput !== '') {
          const score1TietValue = parseFloat(score1TietInput);
          if (!isNaN(score1TietValue) && score1TietValue >= 0 && score1TietValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: score1TietValue,
              scoreType: '1TIET',
              note: studentData.note1Tiet || ''
            };

            if (existing1Tiet) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - 1Tiet: updating existing score ${existing1Tiet.id} to ${score1TietValue}`);
              promises.push(api.put(`/exam-scores/${existing1Tiet.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing1Tiet && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, giữ nguyên điểm cũ
        }

        // Xử lý điểm cuối kỳ
        const scoreCuoiKiInput = studentData.scoreCuoiKi ? studentData.scoreCuoiKi.trim() : '';
        if (scoreCuoiKiInput !== '') {
          const scoreCuoiKiValue = parseFloat(scoreCuoiKiInput);
          if (!isNaN(scoreCuoiKiValue) && scoreCuoiKiValue >= 0 && scoreCuoiKiValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: scoreCuoiKiValue,
              scoreType: 'CUOIKI',
              note: studentData.noteCuoiKi || ''
            };

            if (existingCuoiKi) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - CuoiKi: updating existing score ${existingCuoiKi.id} to ${scoreCuoiKiValue}`);
              promises.push(api.put(`/exam-scores/${existingCuoiKi.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existingCuoiKi && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, giữ nguyên điểm cũ
        }
      });

      console.log('=== SUBMIT SCORES DEBUG ===');
      console.log('isEditMode (state):', isEditMode);
      console.log('currentEditMode (local):', currentEditMode);
      console.log('Total promises:', promises.length);
      console.log('classScoreData:', classScoreData);
      console.log('selectedClassForScore:', selectedClassForScore);
      console.log('selectedSubjectForScore:', selectedSubjectForScore);
      console.log('Total freshExamScores:', freshExamScores.length);
      console.log('freshExamScores for this subject:', freshExamScores.filter(s => {
        const sSubjectId = s.subject?.id || s.subject_id;
        return sSubjectId === parseInt(selectedSubjectForScore);
      }));
      console.log('freshExamScores for this class:', freshExamScores.filter(s => {
        const sClassId = s.classEntity?.id || s.class_id;
        return sClassId === parseInt(selectedClassForScore);
      }));

      if (promises.length === 0) {
        console.log('⚠️ No promises to execute');
        if (currentEditMode) {
          alert('Không có thay đổi nào để lưu. Vui lòng thay đổi điểm trước khi lưu.');
        } else {
          alert('Vui lòng nhập ít nhất một điểm');
        }
        return;
      }

      console.log('✅ Executing', promises.length, 'promises');

      try {
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchExamScores();

        // Lưu lớp đã chọn để filter hiển thị (cho Teacher)
        const userRole = user?.role?.name?.toUpperCase();
        if (userRole === 'TEACHER') {
          setDisplayFilterClassId(selectedClassForScore);
        }

        // Reset form
        setSelectedClassForScore('');
        setSelectedSubjectForScore('');
        setClassStudents([]);
        setClassScoreData({});
        setIsEditMode(false);
        setShowClassModal(false);

        alert(currentEditMode ? 'Sửa điểm thành công!' : 'Nhập điểm theo lớp thành công!');
      } catch (submitError) {
        console.error('Error submitting scores:', submitError);
        alert('Có lỗi xảy ra khi lưu điểm số. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error saving class scores:', error);
      alert('Có lỗi xảy ra khi lưu điểm số');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#28a745';
    if (score >= 6.5) return '#ffc107';
    if (score >= 5) return '#fd7e14';
    return '#dc3545';
  };

  const getScoreTypeLabel = (scoreType) => {
    switch (scoreType) {
      case '15P':
        return '15 phút';
      case '1TIET':
        return '1 tiết';
      case 'CUOIKI':
        return 'Cuối kì';
      default:
        return scoreType || '15 phút';
    }
  };

  // Nhóm điểm theo học sinh và môn học
  const groupScoresByStudentAndSubject = () => {
    const grouped = {};
    const userRole = user?.role?.name?.toUpperCase();

    // Filter scores theo lớp đã chọn nếu là Teacher và đã chọn lớp
    let filteredScores = examScores;
    if (userRole === 'TEACHER' && displayFilterClassId) {
      filteredScores = examScores.filter(score => {
        const scoreClassId = score.classEntity?.id || score.class_id;
        return scoreClassId && scoreClassId.toString() === displayFilterClassId.toString();
      });
    }

    filteredScores.forEach(score => {
      const studentId = score.student?.id;
      const subjectId = score.subject?.id;
      const key = `${studentId}-${subjectId}`;

      if (!grouped[key]) {
        grouped[key] = {
          student: score.student,
          subject: score.subject,
          classEntity: score.classEntity,
          score15P: null, // Chỉ lưu 1 điểm 15p (điểm đầu tiên)
          score1Tiet: null,
          scoreCuoiKi: null,
          allScores: []
        };
      }

      grouped[key].allScores.push(score);

      // Phân loại điểm - chuyển sang uppercase để so sánh nhất quán
      const scoreType = (score.scoreType || score.score_type || '15P').toUpperCase();

      if (scoreType === '15P') {
        // Chỉ lưu điểm 15p đầu tiên (không tính trung bình)
        if (grouped[key].score15P === null) {
          grouped[key].score15P = score;
        }
      } else if (scoreType === '1TIET') {
        grouped[key].score1Tiet = score;
      } else if (scoreType === 'CUOIKI') {
        grouped[key].scoreCuoiKi = score;
      } else {
        // Nếu không xác định được, mặc định là 15P
        if (grouped[key].score15P === null) {
          grouped[key].score15P = score;
        }
      }
    });

    return Object.values(grouped);
  };


  if (loading) {
    return (
      <div className="exam-score-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isAdmin = userRole === 'ADMIN';

  const handleToggleLock = async () => {
    const userRole = user?.role?.name?.toUpperCase();
    const schoolId = user?.school?.id;

    // Only admin can lock/unlock scores
    if (userRole !== 'ADMIN' || !schoolId) {
      alert('Chỉ admin mới có quyền khóa/mở khóa điểm số');
      return;
    }

    const newLockStatus = !isScoreLocked;
    const confirmMessage = newLockStatus
      ? 'Bạn có chắc chắn muốn khóa điểm số? Điều này sẽ ngăn chỉnh sửa và thêm điểm mới cho tất cả giáo viên.'
      : 'Bạn có chắc chắn muốn mở khóa điểm số? Điều này sẽ cho phép chỉnh sửa và thêm điểm mới.';

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.put(`/exam-scores/lock-status/${schoolId}`, {
          scoreLocked: newLockStatus
        });

        setIsScoreLocked(newLockStatus);
        alert(newLockStatus ? 'Đã khóa điểm số thành công' : 'Đã mở khóa điểm số thành công');
      } catch (error) {
        console.error('Error updating score lock status:', error);
        alert('Có lỗi xảy ra khi cập nhật trạng thái khóa điểm số');
      }
    }
  };

  return (
    <div className="exam-score-management">
      <div className="common-page-header">
        <h2>{isStudent ? 'Xem điểm và nhận xét' : 'Quản lý điểm số'}</h2>
        <div className="header-actions">
          {isAdmin && (
            <button
              className={`btn ${isScoreLocked ? 'btn-unlock' : 'btn-lock'}`}
              onClick={handleToggleLock}
            >
              {isScoreLocked ? '🔓 Mở khóa điểm số' : '🔒 Khóa điểm số'}
            </button>
          )}
          {isScoreLocked && (
            <span className="lock-notice" style={{
              color: '#ff9800',
              fontWeight: 'bold',
              padding: '8px 12px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              ⚠️ Điểm số đã bị khóa
            </span>
          )}
          {/* Only show "Nhập điểm" button for TEACHER, not for ADMIN */}
          {!isStudent && !isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (isScoreLocked) {
                  alert('Điểm số đã bị khóa. Không thể thêm điểm mới.');
                  return;
                }
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setFilteredSubjectsForClass([]);
                setIsEditMode(false); // Đặt chế độ nhập mới
                setShowClassModal(true);
              }}
              disabled={isScoreLocked}
            >
              📋 Nhập điểm
            </button>
          )}
        </div>
      </div>

      {/* Filter lớp cho Teacher */}
      {userRole === 'TEACHER' && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Lọc theo lớp:</span>
            <select
              value={displayFilterClassId}
              onChange={(e) => setDisplayFilterClassId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              <option value="">-- Tất cả các lớp --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </label>
          {displayFilterClassId && (
            <button
              onClick={() => setDisplayFilterClassId('')}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Bảng điểm số - Admin có thể xem nhưng không thể sửa/xóa */}
      <div className="common-table-container exam-scores-table-container">
        {groupScoresByStudentAndSubject().length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            <p style={{ fontSize: '18px', color: '#666' }}>
              Chưa có điểm số nào
            </p>
          </div>
        ) : (
          <table className="common-table exam-scores-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Học sinh</th>
                <th>Môn học</th>
                <th>Lớp</th>
                <th>Điểm 15p</th>
                <th>Điểm 1 tiết</th>
                <th>Điểm cuối kỳ</th>
                {/* Chỉ hiển thị cột "Thao tác" cho TEACHER, không hiển thị cho ADMIN và STUDENT */}
                {!isStudent && !isAdmin && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {groupScoresByStudentAndSubject().map((group, index) => {
                const score15P = group.score15P?.score;
                const score1Tiet = group.score1Tiet?.score;
                const scoreCuoiKi = group.scoreCuoiKi?.score;

                return (
                  <tr key={`${group.student?.id}-${group.subject?.id}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="student-info">
                        <span className="student-name">{group.student?.fullName}</span>
                        <span className="student-email">{group.student?.email}</span>
                      </div>
                    </td>
                    <td>{group.subject?.name}</td>
                    <td>{group.classEntity?.name}</td>
                    <td>
                      {score15P !== null && score15P !== undefined ? (
                        <span
                          className="score-badge"
                          style={{ backgroundColor: getScoreColor(score15P) }}
                        >
                          {score15P.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {score1Tiet !== null && score1Tiet !== undefined ? (
                        <span
                          className="score-badge"
                          style={{ backgroundColor: getScoreColor(score1Tiet) }}
                        >
                          {score1Tiet.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {scoreCuoiKi !== null && scoreCuoiKi !== undefined ? (
                        <span
                          className="score-badge"
                          style={{ backgroundColor: getScoreColor(scoreCuoiKi) }}
                        >
                          {scoreCuoiKi.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    {/* Chỉ hiển thị nút Sửa/Xóa cho TEACHER, không hiển thị cho ADMIN */}
                    {!isStudent && !isAdmin && (
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-edit"
                            onClick={() => {
                              // Mở modal với group để sửa tất cả điểm
                              handleEdit(group);
                            }}
                            disabled={isScoreLocked}
                            title={isScoreLocked ? 'Điểm số đã bị khóa' : 'Sửa điểm'}
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            className="btn btn-delete"
                            onClick={() => handleDeleteAll(group)}
                            disabled={isScoreLocked}
                            title={isScoreLocked ? 'Điểm số đã bị khóa' : 'Xóa tất cả điểm'}
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>


      {/* Modal nhập điểm theo lớp */}
      {showClassModal && !isStudent && !isAdmin && (
        <div className="common-modal-overlay" onClick={() => {
          setShowClassModal(false);
          setSelectedClassForScore('');
          setSelectedSubjectForScore('');
          setClassStudents([]);
          setClassScoreData({});
          setIsEditMode(false);
        }}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="common-modal-header">
              <h3>{isEditMode ? 'Sửa điểm theo lớp' : 'Nhập điểm theo lớp'}</h3>
              <button className="common-close-btn" onClick={() => {
                setShowClassModal(false);
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setIsEditMode(false);
              }}>✕</button>
            </div>
            <form onSubmit={handleClassScoreSubmit} className="common-modal-form">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="common-form-group" style={{ flex: 1 }}>
                  <label>Lớp *</label>
                  <select
                    value={selectedClassForScore}
                    onChange={(e) => handleClassSelect(e.target.value)}
                    required
                  >
                    <option value="">Chọn lớp</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="common-form-group" style={{ flex: 1 }}>
                  <label>Môn học *</label>
                  <select
                    value={selectedSubjectForScore}
                    onChange={(e) => handleSubjectSelectForClass(e.target.value)}
                    required
                    disabled={!selectedClassForScore}
                  >
                    <option value="">
                      {selectedClassForScore ? 'Chọn môn học' : 'Chọn lớp trước'}
                    </option>
                    {(selectedClassForScore ? filteredSubjectsForClass : subjects).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {selectedClassForScore && filteredSubjectsForClass.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      Lớp này chưa được phân công môn học nào
                    </p>
                  )}
                </div>
              </div>

              {selectedClassForScore && (
                <div style={{ marginTop: '20px' }}>
                  {(() => {
                    const subjectId = selectedSubjectForScore ? parseInt(selectedSubjectForScore) : null;

                    // Nếu ở chế độ nhập mới, chỉ hiển thị học sinh chưa có điểm
                    // Nếu ở chế độ sửa, hiển thị tất cả học sinh (cho phép sửa cả học sinh đã có điểm)
                    let studentsToShow = classStudents;
                    if (!isEditMode) {
                      // Chế độ nhập mới: chỉ hiển thị học sinh chưa có điểm
                      studentsToShow = classStudents.filter(student => {
                        if (!subjectId) return true;
                        const existingScores = examScores.filter(score =>
                          score.student?.id === student.id &&
                          score.subject?.id === subjectId
                        );
                        return existingScores.length === 0;
                      });
                    }

                    // Hàm kiểm tra học sinh đã có điểm chưa (chỉ để hiển thị thông tin)
                    const studentHasScore = (studentId) => {
                      if (!subjectId) return false;
                      const existingScores = examScores.filter(score =>
                        score.student?.id === studentId &&
                        score.subject?.id === subjectId
                      );
                      return existingScores.length > 0;
                    };

                    return studentsToShow.length > 0 ? (
                      <>
                        <h4 style={{ marginBottom: '15px', color: '#333' }}>
                          {isEditMode ? (
                            <>Danh sách học sinh ({studentsToShow.length}/{classStudents.length} học sinh)</>
                          ) : (
                            <>Danh sách học sinh cần nhập điểm ({studentsToShow.length}/{classStudents.length} học sinh)</>
                          )}
                        </h4>
                        {!isEditMode && studentsToShow.length < classStudents.length && (
                          <p style={{ color: '#28a745', marginBottom: '15px', fontSize: '14px', fontWeight: '500' }}>
                            ✅ {classStudents.length - studentsToShow.length} học sinh đã có điểm và đã được ẩn
                          </p>
                        )}
                        {!selectedSubjectForScore && (
                          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                            ⚠️ Vui lòng chọn môn học để nhập điểm
                          </p>
                        )}
                        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                              <tr>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>STT</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>Học sinh</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm 15p</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm 1 tiết</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm cuối kỳ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsToShow.map((student, index) => {
                                const hasScore = studentHasScore(student.id);

                                return (
                                  <tr key={student.id}>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <div>
                                        <div style={{ fontWeight: '500' }}>
                                          {student.fullName}
                                          {hasScore && <span style={{ color: '#28a745', marginLeft: '8px', fontSize: '12px' }}>(Đã có điểm)</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{student.email}</div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.score15P || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              score15P: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.score1Tiet || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              score1Tiet: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.scoreCuoiKi || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              scoreCuoiKi: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        {selectedSubjectForScore ? (
                          classStudents.length > 0 ? (
                            <div>
                              <p style={{ fontSize: '16px', fontWeight: '500', color: '#28a745', marginBottom: '10px' }}>
                                ✅ Tất cả học sinh đã có điểm cho môn học này
                              </p>
                              <p style={{ fontSize: '14px', color: '#666' }}>
                                Tất cả {classStudents.length} học sinh trong lớp đã được nhập điểm.
                                Không còn học sinh nào cần nhập điểm.
                              </p>
                            </div>
                          ) : (
                            <p>Không có học sinh nào trong lớp này</p>
                          )
                        ) : (
                          <p>Vui lòng chọn môn học để hiển thị danh sách học sinh</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!selectedClassForScore && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Vui lòng chọn lớp để hiển thị danh sách học sinh
                </div>
              )}

              <div className="common-modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowClassModal(false);
                    setSelectedClassForScore('');
                    setSelectedSubjectForScore('');
                    setClassStudents([]);
                    setClassScoreData({});
                    setFilteredSubjectsForClass([]);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={(() => {
                    // Nếu không có lớp hoặc môn học được chọn → disable
                    if (!selectedClassForScore || !selectedSubjectForScore) return true;

                    // Ở chế độ sửa, luôn enable (vì mục đích là sửa điểm đã có)
                    if (isEditMode) return false;

                    // Ở chế độ nhập mới, disable nếu tất cả học sinh đã có điểm
                    const subjectId = parseInt(selectedSubjectForScore);
                    const studentsWithoutScores = classStudents.filter(student => {
                      const existingScores = examScores.filter(score =>
                        score.student?.id === student.id &&
                        score.subject?.id === subjectId
                      );
                      return existingScores.length === 0;
                    });
                    return studentsWithoutScores.length === 0;
                  })()}
                >
                  Lưu điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamScoreManagement;
