import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './ExamScoreManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';

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
  const [filteredSubjectsForClass, setFilteredSubjectsForClass] = useState([]); // Subjects 膽瓢峄 ph芒n c么ng cho l峄沺 膽茫 ch峄峮
  const [displayFilterClassId, setDisplayFilterClassId] = useState(''); // L峄沺 膽茫 ch峄峮 膽峄?filter hi峄僴 th峄?(cho Teacher)
  const [isEditMode, setIsEditMode] = useState(false); // Ph芒n bi峄噒 gi峄痑 nh岷璸 膽i峄僲 m峄沬 v脿 s峄璦 膽i峄僲

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

      // Log 膽峄?debug scoreType
      console.log('=== FETCHED EXAM SCORES ===');
      console.log('Total scores:', allScores.length);
      allScores.forEach(score => {
        console.log(`Score ID ${score.id}: scoreType = "${score.scoreType || score.score_type || 'Không có'}"`);
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
      alert('膼i峄僲 s峄?膽茫 b峄?kh贸a. Kh么ng th峄?ch峄塶h s峄璦 膽i峄僲.');
      return;
    }

    // M峄?modal nh岷璸 膽i峄僲 theo l峄沺 v峄沬 l峄沺 v脿 m么n h峄峜 膽茫 膽瓢峄 ch峄峮
    const classId = group.classEntity?.id?.toString() || '';
    const subjectId = group.subject?.id?.toString() || '';

    setSelectedClassForScore(classId);
    setSelectedSubjectForScore(subjectId);
    setIsEditMode(true); // 膼岷穞 ch岷?膽峄?s峄璦

    // Fetch schedules c峄 l峄沺 膽峄?l岷 danh s谩ch m么n h峄峜 膽瓢峄 ph芒n c么ng
    if (classId) {
      try {
        const schedulesResponse = await api.get(`/schedules/class/${classId}`);
        const classSchedules = schedulesResponse.data.schedules || [];

        // L岷 danh s谩ch subject IDs t峄?schedules
        const assignedSubjectIds = new Set();
        classSchedules.forEach(schedule => {
          const scheduleSubjectId = schedule.subject?.id || schedule.subject_id;
          if (scheduleSubjectId) {
            assignedSubjectIds.add(scheduleSubjectId);
          }
        });

        // Filter subjects 膽峄?ch峄?hi峄僴 th峄?c谩c m么n 膽瓢峄 ph芒n c么ng cho l峄沺 n脿y
        const userRole = user?.role?.name?.toUpperCase();
        let filteredSubjects = subjects.filter(subject => {
          const subjectId = subject.id;
          const isAssignedToClass = assignedSubjectIds.has(subjectId);

          // N岷縰 l脿 teacher, c农ng c岷 ki峄僲 tra xem teacher c贸 d岷 m么n n脿y kh么ng
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

    // Load danh s谩ch h峄峜 sinh v脿 膽i峄僲 hi峄噉 c贸
    // Refresh examScores tr瓢峄沜 膽峄?膽岷 b岷 c贸 d峄?li峄噓 m峄沬 nh岷
    await fetchExamScores();
    await fetchStudentsByClass(classId);
    setShowClassModal(true);
  };

  const handleDelete = async (scoreId) => {
    if (isScoreLocked) {
      alert('膼i峄僲 s峄?膽茫 b峄?kh贸a. Kh么ng th峄?x贸a 膽i峄僲.');
      return;
    }

    try {
      await api.delete(`/exam-scores/${scoreId}`);
      console.log('鉁?Deleted score ID:', scoreId);
    } catch (error) {
      console.error('鉂?Error deleting exam score:', error);
      throw error; // Re-throw 膽峄?x峄?l媒 峄?n啤i g峄峣
    }
  };

  const handleDeleteAll = async (group) => {
    if (isScoreLocked) {
      alert('膼i峄僲 s峄?膽茫 b峄?kh贸a. Kh么ng th峄?x贸a 膽i峄僲.');
      return;
    }

    const scoresToDelete = [];
    if (group.score15P) {
      scoresToDelete.push({ type: '15 ph煤t', id: group.score15P.id });
    }
    if (group.score1Tiet) {
      scoresToDelete.push({ type: '1 ti岷縯', id: group.score1Tiet.id });
    }
    if (group.scoreCuoiKi) {
      scoresToDelete.push({ type: 'cuoi ki', id: group.scoreCuoiKi.id });
    }

    if (scoresToDelete.length === 0) {
      alert('Kh么ng c贸 膽i峄僲 n脿o 膽峄?x贸a');
      return;
    }

    const confirmMessage = scoresToDelete.length === 1
      ? `B岷 c贸 ch岷痗 ch岷痭 mu峄憂 x贸a 膽i峄僲 ${scoresToDelete[0].type}?`
      : `B岷 c贸 ch岷痗 ch岷痭 mu峄憂 x贸a t岷 c岷?膽i峄僲 (${scoresToDelete.map(s => s.type).join(', ')})?`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log('=== DELETING ALL SCORES ===');
        console.log('Scores to delete:', scoresToDelete);

        // X贸a t岷 c岷?膽i峄僲 膽峄搉g th峄漣 v脿 膽峄 t岷 c岷?ho脿n th脿nh
        const deletePromises = scoresToDelete.map(({ id, type }) => {
          console.log(`Deleting ${type} score ID:`, id);
          return handleDelete(id);
        });

        await Promise.all(deletePromises);
        console.log('鉁?All scores deleted successfully');

        // 膼峄 m峄檛 ch煤t 膽峄?膽岷 b岷 database 膽茫 c岷璸 nh岷璽
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh danh s谩ch 膽i峄僲
        await fetchExamScores();

        alert('X贸a 膽i峄僲 th脿nh c么ng!');
      } catch (error) {
        console.error('鉂?Error deleting scores:', error);
        ('');
      }
    }
  };


  // L岷 danh s谩ch h峄峜 sinh theo l峄沺
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

      // Th峄?l岷 h峄峜 sinh t峄?API theo l峄沺
      try {
        console.log('Calling API: /classes/' + classId + '/students');
        const response = await api.get(`/classes/${classId}/students`);
        console.log('鉁?API Response received:', response);
        console.log('Response data:', response.data);
        studentsInClass = response.data.students || [];
        console.log('鉁?Fetched students by class:', studentsInClass.length);
        console.log('鉁?Students data:', studentsInClass);

        if (studentsInClass.length === 0) {
          console.warn('鈿狅笍 API returned empty students array. This class may have no enrolled students.');
        }
      } catch (apiError) {
        console.error('鉂?API error when fetching students by class:', apiError);
        console.error('Error status:', apiError.response?.status);
        console.error('Error message:', apiError.message);
        console.error('Error response data:', apiError.response?.data);

        // N岷縰 API tr岷?v峄?404, class kh么ng t峄搉 t岷 ho岷穋 route kh么ng 膽瓢峄 match
        if (apiError.response?.status === 404) {
          console.error('鉂?Class not found (404). Route may not be matched correctly.');
          console.error('Please check backend logs to see if endpoint was called.');
        }
        studentsInClass = [];
      }

      // Ch峄?hi峄僴 th峄?h峄峜 sinh t峄?enrollments c峄 l峄沺 膽茫 ch峄峮
      if (studentsInClass.length === 0) {
        console.log('鈿狅笍 No students enrolled in this class. Only students enrolled in the selected class will be displayed.');
      } else {
        console.log('鉁?Successfully fetched', studentsInClass.length, 'students enrolled in class from API');
      }

      setClassStudents(studentsInClass);

      // Kh峄焛 t岷 classScoreData v峄沬 c谩c h峄峜 sinh
      const initialScoreData = {};
      studentsInClass.forEach(student => {
        // T矛m 膽i峄僲 hi峄噉 c贸 c峄 h峄峜 sinh n脿y cho m么n h峄峜 膽茫 ch峄峮
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

  // X峄?l媒 khi ch峄峮 l峄沺
  const handleClassSelect = async (classId) => {
    setSelectedClassForScore(classId);
    setSelectedSubjectForScore(''); // Reset m么n h峄峜 khi 膽峄昳 l峄沺
    setFilteredSubjectsForClass([]); // Reset filtered subjects

    // Fetch schedules c峄 l峄沺 膽峄?l岷 danh s谩ch m么n h峄峜 膽瓢峄 ph芒n c么ng
    if (classId) {
      try {
        console.log('Fetching schedules for class ID:', classId);
        const schedulesResponse = await api.get(`/schedules/class/${classId}`);
        const classSchedules = schedulesResponse.data.schedules || [];

        console.log('Schedules for class:', classSchedules);

        // L岷 danh s谩ch subject IDs t峄?schedules
        const assignedSubjectIds = new Set();
        classSchedules.forEach(schedule => {
          const subjectId = schedule.subject?.id || schedule.subject_id;
          if (subjectId) {
            assignedSubjectIds.add(subjectId);
          }
        });

        console.log('Assigned subject IDs for class:', Array.from(assignedSubjectIds));

        // Filter subjects 膽峄?ch峄?hi峄僴 th峄?c谩c m么n 膽瓢峄 ph芒n c么ng cho l峄沺 n脿y
        // N岷縰 l脿 teacher, c农ng c岷 filter theo m么n m脿 teacher 膽贸 d岷
        const userRole = user?.role?.name?.toUpperCase();
        let filteredSubjects = subjects.filter(subject => {
          const subjectId = subject.id;
          const isAssignedToClass = assignedSubjectIds.has(subjectId);

          // N岷縰 l脿 teacher, c农ng c岷 ki峄僲 tra xem teacher c贸 d岷 m么n n脿y kh么ng
          if (userRole === 'TEACHER' && user?.id) {
            // Ki峄僲 tra xem schedule c贸 teacher_id tr霉ng v峄沬 user.id kh么ng
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
        // N岷縰 l峄梚, hi峄僴 th峄?t岷 c岷?subjects (fallback)
        setFilteredSubjectsForClass(subjects);
      }
    } else {
      // N岷縰 kh么ng ch峄峮 l峄沺, hi峄僴 th峄?t岷 c岷?subjects
      setFilteredSubjectsForClass(subjects);
    }

    await fetchStudentsByClass(classId);
  };

  // X峄?l媒 khi ch峄峮 m么n h峄峜 (reload danh s谩ch h峄峜 sinh v峄沬 膽i峄僲 hi峄噉 c贸)
  const handleSubjectSelectForClass = async (subjectId) => {
    setSelectedSubjectForScore(subjectId);
    if (selectedClassForScore) {
      await fetchStudentsByClass(selectedClassForScore);
    }
  };

  // X峄?l媒 submit 膽i峄僲 theo l峄沺
  const handleClassScoreSubmit = async (e) => {
    e.preventDefault();

    if (isScoreLocked) {
      alert('膼i峄僲 s峄?膽茫 b峄?kh贸a. Kh么ng th峄?th锚m ho岷穋 ch峄塶h s峄璦 膽i峄僲.');
      return;
    }

    if (!selectedClassForScore || !selectedSubjectForScore) {
      alert('Vui l貌ng ch峄峮 l峄沺 v脿 m么n h峄峜');
      return;
    }

    // L瓢u isEditMode v脿o bi岷縩 local tr瓢峄沜 khi reset
    const currentEditMode = isEditMode;
    console.log('馃攳 handleClassScoreSubmit - isEditMode:', isEditMode, 'currentEditMode:', currentEditMode);

    // Refresh examScores tr瓢峄沜 khi submit 膽峄?膽岷 b岷 c贸 d峄?li峄噓 m峄沬 nh岷
    console.log('馃攧 Fetching fresh examScores before submit...');
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
      console.log('鉁?Fresh examScores fetched, total:', freshExamScores.length);
    } catch (error) {
      console.error('Error fetching fresh examScores:', error);
      // Fallback to existing examScores state
      freshExamScores = examScores;
      console.log('鈿狅笍 Using existing examScores state, total:', freshExamScores.length);
    }

    try {
      const classId = parseInt(selectedClassForScore);
      const subjectId = parseInt(selectedSubjectForScore);
      const promises = [];

      // X峄?l媒 膽i峄僲 cho t峄玭g h峄峜 sinh
      Object.keys(classScoreData).forEach(studentId => {
        const studentData = classScoreData[studentId];
        const studentIdInt = parseInt(studentId);

        // T矛m 膽i峄僲 hi峄噉 c贸 c峄 h峄峜 sinh n脿y t峄?freshExamScores
        // Ki峄僲 tra c岷?student.id v脿 student_id, subject.id v脿 subject_id
        const existingScores = freshExamScores.filter(score => {
          const scoreStudentId = score.student?.id || score.student_id;
          const scoreSubjectId = score.subject?.id || score.subject_id;
          const scoreClassId = score.classEntity?.id || score.class_id;

          // So s谩nh v峄沬 parseInt 膽峄?膽岷 b岷 c霉ng ki峄僽 d峄?li峄噓
          const studentMatch = scoreStudentId === studentIdInt || parseInt(scoreStudentId) === studentIdInt;
          const subjectMatch = scoreSubjectId === subjectId || parseInt(scoreSubjectId) === subjectId;
          const classMatch = scoreClassId === classId || parseInt(scoreClassId) === classId;

          const match = studentMatch && subjectMatch && classMatch;

          if (match) {
            console.log(`鉁?Found existing score:`, {
              id: score.id,
              studentId: scoreStudentId,
              subjectId: scoreSubjectId,
              classId: scoreClassId,
              scoreType: score.scoreType || score.score_type,
              score: score.score,
              matching: { student: studentMatch, subject: subjectMatch, class: classMatch }
            });
          } else {
            // Log 膽峄?debug t岷 sao kh么ng match
            console.log(`鉂?Score not matching:`, {
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
          console.log(`鉁?Found scores:`, existingScores.map(s => ({
            id: s.id,
            type: s.scoreType || s.score_type,
            score: s.score
          })));
        } else {
          console.log(`鈿狅笍 No existing scores found for student ${studentIdInt}, subject ${subjectId}, class ${classId}`);
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

        // X峄?l媒 膽i峄僲 15p
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
              // 峄?ch岷?膽峄?s峄璦, lu么n update n岷縰 c贸 gi谩 tr峄?trong form
              console.log(`Student ${studentId} - 15P: updating existing score ${existing15P.id} to ${score15PValue}`);
              promises.push(api.put(`/exam-scores/${existing15P.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // T岷 m峄沬 n岷縰 ch瓢a c贸
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing15P && isEditMode) {
          // N岷縰 峄?ch岷?膽峄?s峄璦 v脿 input r峄梟g nh瓢ng 膽茫 c贸 膽i峄僲, c贸 th峄?x贸a 膽i峄僲 (t霉y ch峄峮)
          // Ho岷穋 gi峄?nguy锚n 膽i峄僲 c农 (kh么ng l脿m g矛)
          // 峄?膽芒y t么i s岷?gi峄?nguy锚n 膽i峄僲 c农 (kh么ng x贸a)
        }

        // X峄?l媒 膽i峄僲 1 ti岷縯
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
              // 峄?ch岷?膽峄?s峄璦, lu么n update n岷縰 c贸 gi谩 tr峄?trong form
              console.log(`Student ${studentId} - 1Tiet: updating existing score ${existing1Tiet.id} to ${score1TietValue}`);
              promises.push(api.put(`/exam-scores/${existing1Tiet.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // T岷 m峄沬 n岷縰 ch瓢a c贸
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing1Tiet && isEditMode) {
          // N岷縰 峄?ch岷?膽峄?s峄璦 v脿 input r峄梟g nh瓢ng 膽茫 c贸 膽i峄僲, gi峄?nguy锚n 膽i峄僲 c农
        }

        // X峄?l媒 膽i峄僲 cu峄慽 k峄?
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
              // 峄?ch岷?膽峄?s峄璦, lu么n update n岷縰 c贸 gi谩 tr峄?trong form
              console.log(`Student ${studentId} - CuoiKi: updating existing score ${existingCuoiKi.id} to ${scoreCuoiKiValue}`);
              promises.push(api.put(`/exam-scores/${existingCuoiKi.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // T岷 m峄沬 n岷縰 ch瓢a c贸
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existingCuoiKi && isEditMode) {
          // N岷縰 峄?ch岷?膽峄?s峄璦 v脿 input r峄梟g nh瓢ng 膽茫 c贸 膽i峄僲, gi峄?nguy锚n 膽i峄僲 c农
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
        console.log('鈿狅笍 No promises to execute');
        if (currentEditMode) {
          alert('Kh么ng c贸 thay 膽峄昳 n脿o 膽峄?l瓢u. Vui l貌ng thay 膽峄昳 膽i峄僲 tr瓢峄沜 khi l瓢u.');
        } else {
          alert('Vui l貌ng nh岷璸 铆t nh岷 m峄檛 膽i峄僲');
        }
        return;
      }

      console.log('鉁?Executing', promises.length, 'promises');

      try {
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchExamScores();

        // L瓢u l峄沺 膽茫 ch峄峮 膽峄?filter hi峄僴 th峄?(cho Teacher)
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

        alert(currentEditMode ? 'S峄璦 膽i峄僲 th脿nh c么ng!' : 'Nh岷璸 膽i峄僲 theo l峄沺 th脿nh c么ng!');
      } catch (submitError) {
        console.error('Error submitting scores:', submitError);
        alert('C贸 l峄梚 x岷 ra khi l瓢u 膽i峄僲 s峄? Vui l貌ng th峄?l岷.');
      }
    } catch (error) {
      console.error('Error saving class scores:', error);
      ('');
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
        return '15 ph煤t';
      case '1TIET':
        return '1 ti岷縯';
      case 'CUOIKI':
        return 'Cu峄慽 k矛';
      default:
        return scoreType || '15 ph煤t';
    }
  };

  // Nh贸m 膽i峄僲 theo h峄峜 sinh v脿 m么n h峄峜
  const groupScoresByStudentAndSubject = () => {
    const grouped = {};
    const userRole = user?.role?.name?.toUpperCase();

    // Filter scores theo l峄沺 膽茫 ch峄峮 n岷縰 l脿 Teacher v脿 膽茫 ch峄峮 l峄沺
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
          score15P: null, // Ch峄?l瓢u 1 膽i峄僲 15p (膽i峄僲 膽岷 ti锚n)
          score1Tiet: null,
          scoreCuoiKi: null,
          allScores: []
        };
      }

      grouped[key].allScores.push(score);

      // Ph芒n lo岷 膽i峄僲 - chuy峄僴 sang uppercase 膽峄?so s谩nh nh岷 qu谩n
      const scoreType = (score.scoreType || score.score_type || '15P').toUpperCase();

      if (scoreType === '15P') {
        // Ch峄?l瓢u 膽i峄僲 15p 膽岷 ti锚n (kh么ng t铆nh trung b矛nh)
        if (grouped[key].score15P === null) {
          grouped[key].score15P = score;
        }
      } else if (scoreType === '1TIET') {
        grouped[key].score1Tiet = score;
      } else if (scoreType === 'CUOIKI') {
        grouped[key].scoreCuoiKi = score;
      } else {
        // N岷縰 kh么ng x谩c 膽峄媙h 膽瓢峄, m岷穋 膽峄媙h l脿 15P
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
          <p>膼ang t岷 d峄?li峄噓...</p>
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
      ('');
      return;
    }

    const newLockStatus = !isScoreLocked;
    const confirmMessage = newLockStatus
      ? 'B岷 c贸 ch岷痗 ch岷痭 mu峄憂 kh贸a 膽i峄僲 s峄? 膼i峄乽 n脿y s岷?ng膬n ch峄塶h s峄璦 v脿 th锚m 膽i峄僲 m峄沬 cho t岷 c岷?gi谩o vi锚n.'
      : 'B岷 c贸 ch岷痗 ch岷痭 mu峄憂 m峄?kh贸a 膽i峄僲 s峄? 膼i峄乽 n脿y s岷?cho ph茅p ch峄塶h s峄璦 v脿 th锚m 膽i峄僲 m峄沬.';

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.put(`/exam-scores/lock-status/${schoolId}`, {
          scoreLocked: newLockStatus
        });

        setIsScoreLocked(newLockStatus);
        alert(newLockStatus ? '膼茫 kh贸a 膽i峄僲 s峄?th脿nh c么ng' : '膼茫 m峄?kh贸a 膽i峄僲 s峄?th脿nh c么ng');
      } catch (error) {
        console.error('Error updating score lock status:', error);
        ('');
      }
    }
  };

  return (
    <div className="exam-score-management">
      <div className="common-page-header">
        <h2>{isStudent ? 'Xem diem va nhan xet' : 'Quan ly diem so'}</h2>
        <div className="header-actions">
          {isAdmin && (
            <button
              className={`btn ${isScoreLocked ? 'btn-unlock' : 'btn-lock'}`}
              onClick={handleToggleLock}
            >
              {isScoreLocked ? 'Mo khoa diem so' : 'Khoa diem so'}
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
              鈿狅笍 膼i峄僲 s峄?膽茫 b峄?kh贸a
            </span>
          )}
          {/* Only show "Nh岷璸 膽i峄僲" button for TEACHER, not for ADMIN */}
          {!isStudent && !isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (isScoreLocked) {
                  alert('膼i峄僲 s峄?膽茫 b峄?kh贸a. Kh么ng th峄?th锚m 膽i峄僲 m峄沬.');
                  return;
                }
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setFilteredSubjectsForClass([]);
                setIsEditMode(false); // 膼岷穞 ch岷?膽峄?nh岷璸 m峄沬
                setShowClassModal(true);
              }}
              disabled={isScoreLocked}
            >
              馃搵 Nh岷璸 膽i峄僲
            </button>
          )}
        </div>
      </div>

      {/* Filter l峄沺 cho Teacher */}
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
            <span>L峄峜 theo l峄沺:</span>
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
              <option value="">-- T岷 c岷?c谩c l峄沺 --</option>
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
              X贸a b峄?l峄峜
            </button>
          )}
        </div>
      )}

      {/* B岷g 膽i峄僲 s峄?- Admin c贸 th峄?xem nh瓢ng kh么ng th峄?s峄璦/x贸a */}
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
              Ch瓢a c贸 膽i峄僲 s峄?n脿o
            </p>
          </div>
        ) : (
          <table className="common-table exam-scores-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>H峄峜 sinh</th>
                <th>M么n h峄峜</th>
                <th>L峄沺</th>
                <th>膼i峄僲 15p</th>
                <th>膼i峄僲 1 ti岷縯</th>
                <th>膼i峄僲 cu峄慽 k峄?</th>
                {/* Ch峄?hi峄僴 th峄?c峄檛 "Thao t谩c" cho TEACHER, kh么ng hi峄僴 th峄?cho ADMIN v脿 STUDENT */}
                {!isStudent && !isAdmin && <th>Thao t谩c</th>}
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
                    {/* Ch峄?hi峄僴 th峄?n煤t S峄璦/X贸a cho TEACHER, kh么ng hi峄僴 th峄?cho ADMIN */}
                    {!isStudent && !isAdmin && (
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-edit"
                            onClick={() => {
                              // M峄?modal v峄沬 group 膽峄?s峄璦 t岷 c岷?膽i峄僲
                              handleEdit(group);
                            }}
                            disabled={isScoreLocked}
                            title={isScoreLocked ? 'Mo khoa diem so' : 'Khoa diem so'}
                          >
                            鉁忥笍 S峄璦
                          </button>
                          <button
                            className="btn btn-delete"
                            onClick={() => handleDeleteAll(group)}
                            disabled={isScoreLocked}
                            title={isScoreLocked ? 'Mo khoa diem so' : 'Khoa diem so'}
                          >
                            馃棏锔?X贸a
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


      {/* Modal nh岷璸 膽i峄僲 theo l峄沺 */}
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
              <h3>{isEditMode ? 'S峄璦 膽i峄僲 theo l峄沺' : 'Nh岷璸 膽i峄僲 theo l峄沺'}</h3>
              <button className="common-close-btn" onClick={() => {
                setShowClassModal(false);
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setIsEditMode(false);
              }}>×</button>
            </div>
            <form onSubmit={handleClassScoreSubmit} className="common-modal-form">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="common-form-group" style={{ flex: 1 }}>
                  <label>L峄沺 *</label>
                  <select
                    value={selectedClassForScore}
                    onChange={(e) => handleClassSelect(e.target.value)}
                    required
                  >
                    <option value="">Ch峄峮 l峄沺</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="common-form-group" style={{ flex: 1 }}>
                  <label>M么n h峄峜 *</label>
                  <select
                    value={selectedSubjectForScore}
                    onChange={(e) => handleSubjectSelectForClass(e.target.value)}
                    required
                    disabled={!selectedClassForScore}
                  >
                    <option value="">
                      {selectedClassForScore ? 'Ch峄峮 m么n h峄峜' : 'Ch峄峮 l峄沺 tr瓢峄沜'}
                    </option>
                    {(selectedClassForScore ? filteredSubjectsForClass : subjects).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {selectedClassForScore && filteredSubjectsForClass.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      L峄沺 n脿y ch瓢a 膽瓢峄 ph芒n c么ng m么n h峄峜 n脿o
                    </p>
                  )}
                </div>
              </div>

              {selectedClassForScore && (
                <div style={{ marginTop: '20px' }}>
                  {(() => {
                    const subjectId = selectedSubjectForScore ? parseInt(selectedSubjectForScore) : null;

                    // N岷縰 峄?ch岷?膽峄?nh岷璸 m峄沬, ch峄?hi峄僴 th峄?h峄峜 sinh ch瓢a c贸 膽i峄僲
                    // N岷縰 峄?ch岷?膽峄?s峄璦, hi峄僴 th峄?t岷 c岷?h峄峜 sinh (cho ph茅p s峄璦 c岷?h峄峜 sinh 膽茫 c贸 膽i峄僲)
                    let studentsToShow = classStudents;
                    if (!isEditMode) {
                      // Ch岷?膽峄?nh岷璸 m峄沬: ch峄?hi峄僴 th峄?h峄峜 sinh ch瓢a c贸 膽i峄僲
                      studentsToShow = classStudents.filter(student => {
                        if (!subjectId) return true;
                        const existingScores = examScores.filter(score =>
                          score.student?.id === student.id &&
                          score.subject?.id === subjectId
                        );
                        return existingScores.length === 0;
                      });
                    }

                    // H脿m ki峄僲 tra h峄峜 sinh 膽茫 c贸 膽i峄僲 ch瓢a (ch峄?膽峄?hi峄僴 th峄?th么ng tin)
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
                            <>Danh s谩ch h峄峜 sinh ({studentsToShow.length}/{classStudents.length} h峄峜 sinh)</>
                          ) : (
                            <>Danh s谩ch h峄峜 sinh c岷 nh岷璸 膽i峄僲 ({studentsToShow.length}/{classStudents.length} h峄峜 sinh)</>
                          )}
                        </h4>
                        {!isEditMode && studentsToShow.length < classStudents.length && (
                          <p style={{ color: '#28a745', marginBottom: '15px', fontSize: '14px', fontWeight: '500' }}>
                            鉁?{classStudents.length - studentsToShow.length} h峄峜 sinh 膽茫 c贸 膽i峄僲 v脿 膽茫 膽瓢峄 岷﹏
                          </p>
                        )}
                        {!selectedSubjectForScore && (
                          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                            鈿狅笍 Vui l貌ng ch峄峮 m么n h峄峜 膽峄?nh岷璸 膽i峄僲
                          </p>
                        )}
                        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                              <tr>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>STT</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>H峄峜 sinh</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>膼i峄僲 15p</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>膼i峄僲 1 ti岷縯</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>膼i峄僲 cu峄慽 k峄?</th>
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
                                          {hasScore && <span style={{ color: '#28a745', marginLeft: '8px', fontSize: '12px' }}>(膼茫 c贸 膽i峄僲)</span>}
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
                                鉁?T岷 c岷?h峄峜 sinh 膽茫 c贸 膽i峄僲 cho m么n h峄峜 n脿y
                              </p>
                              <p style={{ fontSize: '14px', color: '#666' }}>
                                T岷 c岷?{classStudents.length} h峄峜 sinh trong l峄沺 膽茫 膽瓢峄 nh岷璸 膽i峄僲.
                                Kh么ng c貌n h峄峜 sinh n脿o c岷 nh岷璸 膽i峄僲.
                              </p>
                            </div>
                          ) : (
                            <p>Kh么ng c贸 h峄峜 sinh n脿o trong l峄沺 n脿y</p>
                          )
                        ) : (
                          <p>Vui l貌ng ch峄峮 m么n h峄峜 膽峄?hi峄僴 th峄?danh s谩ch h峄峜 sinh</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!selectedClassForScore && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Vui l貌ng ch峄峮 l峄沺 膽峄?hi峄僴 th峄?danh s谩ch h峄峜 sinh
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
                  H峄
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={(() => {
                    // N岷縰 kh么ng c贸 l峄沺 ho岷穋 m么n h峄峜 膽瓢峄 ch峄峮 鈫?disable
                    if (!selectedClassForScore || !selectedSubjectForScore) return true;

                    // 峄?ch岷?膽峄?s峄璦, lu么n enable (v矛 m峄 膽铆ch l脿 s峄璦 膽i峄僲 膽茫 c贸)
                    if (isEditMode) return false;

                    // 峄?ch岷?膽峄?nh岷璸 m峄沬, disable n岷縰 t岷 c岷?h峄峜 sinh 膽茫 c贸 膽i峄僲
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
                  L瓢u 膽i峄僲
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













