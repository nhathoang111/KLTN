import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/lib/api';
import './AssignmentListPage.css';
import { useAuth } from '../../../auth/context/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';
import { isTeachingActiveClass } from '../../../../shared/lib/classStatus';
import {
  teacherClassIdsFromSections,
  teacherSubjectIdsByClassFromSections,
  teacherSubjectIdsFromSections,
} from '../../../../shared/lib/teacherScope';

const AssignmentListPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeData, setGradeData] = useState({
    score: '',
    feedback: ''
  });
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    maxScore: '',
    dueDate: '',
    status: 'ACTIVE',
    schoolId: '',
    classId: '',
    subjectId: '',
    createdById: ''
  });
  const [teacherSections, setTeacherSections] = useState([]); // Class-sections của giáo viên
  const [filteredClasses, setFilteredClasses] = useState([]); // Classes mà giáo viên dạy
  const [filteredSubjects, setFilteredSubjects] = useState([]); // Subjects mà giáo viên dạy
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentClassId, setStudentClassId] = useState(null); // Class ID của học sinh
  const [studentSubmissions, setStudentSubmissions] = useState({}); // Map assignmentId -> submission của học sinh
  const [editingSubmission, setEditingSubmission] = useState(null); // Submission đang được sửa

  // Fetch enrollment của học sinh để lấy classId trước
  useEffect(() => {
    const fetchStudentEnrollment = async () => {
      const userRole = user?.role?.name?.toUpperCase();
      if (userRole === 'STUDENT' && user?.id) {
        try {
          const response = await api.get(`/users/${user.id}/enrollment`);
          const enrollmentData = response.data.enrollment;
          if (enrollmentData && enrollmentData.classId) {
            setStudentClassId(enrollmentData.classId);
            console.log('Student class ID:', enrollmentData.classId);
          }
        } catch (error) {
          console.error('Error fetching student enrollment:', error);
          setStudentClassId(null);
        }
      } else {
        setStudentClassId(null);
      }
    };

    if (user) {
      fetchStudentEnrollment();
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [user, studentClassId]);

  // Fetch class-sections của giáo viên để filter classes và subjects
  useEffect(() => {
    const userRole = user?.role?.name?.toUpperCase();
    if (userRole === 'TEACHER' && user?.id) {
      fetchTeacherSections();
    }
  }, [user]);

  // Filter classes và subjects khi teacherSections thay đổi
  useEffect(() => {
    const userRole = user?.role?.name?.toUpperCase();
    if (userRole === 'TEACHER') {
      if (teacherSections.length > 0) {
        filterTeacherClassesAndSubjects();
      } else {
        // Nếu chưa có schedules, set empty arrays
        setFilteredClasses([]);
        setFilteredSubjects([]);
      }
    } else {
      // Nếu không phải giáo viên, sử dụng tất cả classes và subjects
      setFilteredClasses(classes);
      setFilteredSubjects(subjects);
    }
  }, [teacherSections, classes, subjects, user]);

  const fetchTeacherSections = async () => {
    try {
      const response = await api.get(`/class-sections/teacher/${user.id}`);
      const sections = response.data.classSections || [];
      setTeacherSections(sections);
      console.log('Teacher class-sections:', sections);
    } catch (error) {
      console.error('Error fetching teacher class-sections:', error);
      setTeacherSections([]);
    }
  };

  const fetchStudentSubmissions = async (assignments) => {
    if (!user?.id) return;

    try {
      const submissionsMap = {};

      // Fetch submissions for each assignment
      for (const assignment of assignments) {
        try {
          const response = await api.get(`/assignments/${assignment.id}/submissions`);
          const submissions = response.data.submissions || [];

          // Find submission of current student
          const studentSubmission = submissions.find(
            sub => sub.student?.id === user.id || sub.student_id === user.id
          );

          if (studentSubmission) {
            submissionsMap[assignment.id] = studentSubmission;
          }
        } catch (error) {
          console.error(`Error fetching submissions for assignment ${assignment.id}:`, error);
        }
      }

      setStudentSubmissions(submissionsMap);
      console.log('Student submissions:', submissionsMap);
    } catch (error) {
      console.error('Error fetching student submissions:', error);
    }
  };

  const filterTeacherClassesAndSubjects = () => {
    const userRole = user?.role?.name?.toUpperCase();
    if (userRole !== 'TEACHER' || !teacherSections.length) {
      setFilteredClasses(classes);
      setFilteredSubjects(subjects);
      return;
    }

    const assignedClassIds = teacherClassIdsFromSections(teacherSections);
    const assignedSubjectIds = teacherSubjectIdsFromSections(teacherSections);

    console.log('Teacher assigned class IDs (class-sections):', Array.from(assignedClassIds));
    console.log('Teacher assigned subject IDs (class-sections):', Array.from(assignedSubjectIds));

    // Filter classes
    const filteredClassesList = classes.filter(isTeachingActiveClass).filter(cls => {
      const classId = cls.id;
      const isAssigned = assignedClassIds.has(classId);
      const isSameSchool = cls.school?.id === user.school?.id;
      return isAssigned && isSameSchool;
    });

    // Filter subjects
    const filteredSubjectsList = subjects.filter(subject => {
      const subjectId = subject.id;
      const isAssigned = assignedSubjectIds.has(subjectId);
      const isSameSchool = subject.school?.id === user.school?.id;
      return isAssigned && isSameSchool;
    });

    console.log('Filtered classes for teacher:', filteredClassesList);
    console.log('Filtered subjects for teacher:', filteredSubjectsList);

    setFilteredClasses(filteredClassesList);
    setFilteredSubjects(filteredSubjectsList);
  };

  const fetchData = async () => {
    try {
      // Only fetch users if not teacher and not student (to avoid 403 error)
      const userRole = user?.role?.name?.toUpperCase();
      const isTeacher = userRole === 'TEACHER';
      const isStudent = userRole === 'STUDENT';

      const promises = [
        api.get('/assignments'),
        api.get('/schools'),
        api.get('/classes'),
        api.get('/subjects')
      ];

      if (!isTeacher && !isStudent) {
        promises.push(api.get('/users'));
      }

      const results = await Promise.all(promises);
      const assignmentsRes = results[0];
      const schoolsRes = results[1];
      const classesRes = results[2];
      const subjectsRes = results[3];
      const usersRes = (!isTeacher && !isStudent && results[4]) ? results[4] : { data: { users: [] } };

      // Filter assignments for admin, teacher, and student - only show assignments from their own school
      let allAssignments = assignmentsRes.data.assignments || [];
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
        allAssignments = allAssignments.filter(assignment => {
          const assignmentSchoolId = assignment.school?.id || assignment.school_id;
          return assignmentSchoolId === user.school.id;
        });
      }

      // For TEACHER, only show assignments created by themselves
      if (userRole === 'TEACHER' && user?.id) {
        allAssignments = allAssignments.filter(assignment => assignment.createdBy?.id === user.id);
      }

      // For STUDENT, only show assignments of their class
      if (userRole === 'STUDENT') {
        if (studentClassId) {
          allAssignments = allAssignments.filter(assignment => {
            const assignmentClassId = assignment.classEntity?.id || assignment.class_id;
            return assignmentClassId === studentClassId;
          });
          console.log('Filtered assignments for student class:', studentClassId, allAssignments.length);
        } else {
          // Nếu học sinh chưa có classId (chưa fetch xong hoặc không có enrollment), không hiển thị bài tập nào
          // Đợi đến khi studentClassId được set (có thể là null nếu không có enrollment)
          allAssignments = [];
        }
      }

      setAssignments(allAssignments);

      // Fetch student submissions if user is a student
      if (isStudent && user?.id && allAssignments.length > 0) {
        fetchStudentSubmissions(allAssignments);
      }

      // Filter schools for admin and teacher - only show their own school
      let allSchools = schoolsRes.data.schools || [];
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id) {
        allSchools = allSchools.filter(school => school.id === user.school.id);
      }
      setSchools(allSchools);

      // Filter classes for admin, teacher, and student - only show classes from their own school
      let allClasses = classesRes.data.classes || [];
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
        allClasses = allClasses.filter(cls => {
          // Check for school_id (direct field) or school.id (nested object)
          const classSchoolId = cls.school?.id || cls.school_id;
          return classSchoolId === user.school.id;
        });
      }
      setClasses(allClasses);

      // Filter subjects for admin, teacher, and student - only show subjects from their own school
      let allSubjects = subjectsRes.data.subjects || [];
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
        allSubjects = allSubjects.filter(subject => {
          // Check for school_id (direct field) or school.id (nested object)
          const subjectSchoolId = subject.school?.id || subject.school_id;
          return subjectSchoolId === user.school.id;
        });
      }
      setSubjects(allSubjects);

      // Filter teachers from users based on school
      let teacherUsers = [];
      if (isTeacher) {
        // For teacher, just use themselves
        teacherUsers = [user];
      } else if (isStudent) {
        // For student, just set empty array (no need to fetch teachers)
        teacherUsers = [];
      } else {
        const allUsers = usersRes.data.users || [];
        teacherUsers = allUsers.filter(userItem => {
          const roleName = userItem.role?.name?.toUpperCase();
          const isTeacherRole = roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIÁO VIÊN';

          if (!isTeacherRole) return false;

          // If current user is ADMIN, TEACHER, or STUDENT, only show teachers from their school
          if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT') && user?.school?.id) {
            return userItem.school?.id === user.school.id;
          }

          return true;
        });
      }
      setTeachers(teacherUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const parsedMaxScore = parseFloat(formData.maxScore);
      if (Number.isNaN(parsedMaxScore) || parsedMaxScore < 0 || parsedMaxScore > 10) {
        alert('Điểm tối đa phải nằm trong khoảng từ 0 đến 10');
        return;
      }
      if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
        alert('Thời gian nộp bài không được ở quá khứ');
        return;
      }

      // If file is selected and creating new assignment, use upload endpoint
      if (selectedFile && !editingAssignment) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', selectedFile);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('instructions', formData.instructions || '');
        formDataToSend.append('maxScore', parsedMaxScore.toString());
        formDataToSend.append('dueDate', formData.dueDate || '');
        formDataToSend.append('status', formData.status);
        if (formData.schoolId) {
          formDataToSend.append('schoolId', formData.schoolId);
        }
        if (formData.classId) {
          formDataToSend.append('classId', formData.classId);
        }
        if (formData.subjectId) {
          formDataToSend.append('subjectId', formData.subjectId);
        }
        formDataToSend.append('createdById', formData.createdById);

        // For FormData, axios will automatically set Content-Type with boundary
        await api.post('/assignments/upload', formDataToSend);
      } else {
        // Regular submission without file or editing
        const submitData = {
          ...formData,
          maxScore: parsedMaxScore,
          schoolId: parseInt(formData.schoolId),
          classId: parseInt(formData.classId),
          subjectId: parseInt(formData.subjectId),
          createdById: parseInt(formData.createdById)
        };

        if (editingAssignment) {
          await api.put(`/assignments/${editingAssignment.id}`, submitData);
        } else {
          await api.post('/assignments', submitData);
        }
      }

      setShowModal(false);
      setEditingAssignment(null);
      setSelectedFile(null);
      const userRole = user?.role?.name?.toUpperCase();
      const defaultSchoolId = ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id)
        ? user.school.id.toString()
        : '';
      setFormData({
        title: '',
        description: '',
        instructions: '',
        maxScore: '',
        dueDate: '',
        status: 'ACTIVE',
        schoolId: defaultSchoolId,
        classId: '',
        subjectId: '',
        createdById: user?.id?.toString() || ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi lưu bài tập');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setSelectedFile(null);
    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      maxScore: assignment.maxScore?.toString() || '',
      dueDate: assignment.dueDate ? assignment.dueDate.slice(0, 16) : '',
      status: assignment.status || 'ACTIVE',
      schoolId: assignment.school?.id?.toString() || '',
      classId: assignment.classEntity?.id?.toString() || '',
      subjectId: assignment.subject?.id?.toString() || '',
      createdById: assignment.createdBy?.id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDownloadFile = async (assignmentId, fileName) => {
    try {
      const response = await api.get(`/assignments/${assignmentId}/download`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Không thể tải file');
    }
  };

  const handleDownloadSubmissionFile = async (submissionId, fileName) => {
    try {
      const response = await api.get(`/assignments/submissions/${submissionId}/download`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading submission file:', error);
      alert('Không thể tải file');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      try {
        await api.delete(`/assignments/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setSelectedFile(null);
    const userRole = user?.role?.name?.toUpperCase();
    const defaultSchoolId = ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id)
      ? user.school.id.toString()
      : '';
    setFormData({
      title: '',
      description: '',
      instructions: '',
      maxScore: '',
      dueDate: '',
      status: 'ACTIVE',
      schoolId: defaultSchoolId,
      classId: '',
      subjectId: '',
      createdById: user?.id?.toString() || ''
    });
  };

  const handleViewSubmissions = async (assignmentId) => {
    try {
      setSelectedAssignmentId(assignmentId);
      const res = await api.get(`/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.submissions || []);
      setShowSubmissionsModal(true);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleGrade = (submission) => {
    setGradingSubmission(submission);
    setGradeData({
      score: submission.score || '',
      feedback: submission.feedback || ''
    });
  };

  const handleSubmitGrade = async () => {
    if (!gradingSubmission) return;

    try {
      await api.put(`/assignments/submissions/${gradingSubmission.id}/grade`, {
        score: parseFloat(gradeData.score),
        feedback: gradeData.feedback,
        gradedById: formData.createdById
      });

      // Refresh submissions
      const res = await api.get(`/assignments/${selectedAssignmentId}/submissions`);
      setSubmissions(res.data.submissions || []);

      // Close grading modal
      setGradingSubmission(null);
      setGradeData({ score: '', feedback: '' });
    } catch (error) {
      console.error('Error grading submission:', error);
    }
  };

  const handleCloseSubmissionsModal = () => {
    setShowSubmissionsModal(false);
    setSubmissions([]);
    setSelectedAssignmentId(null);
  };

  const handleCloseGradingModal = () => {
    setGradingSubmission(null);
    setGradeData({ score: '', feedback: '' });
  };

  const handleSubmitAssignment = (assignment) => {
    // Check if assignment is active
    if (assignment.status !== 'ACTIVE') {
      alert('Bài tập này không còn hoạt động. Bạn không thể nộp bài.');
      return;
    }

    // Check if student has already submitted
    const existingSubmission = studentSubmissions[assignment.id];
    if (existingSubmission) {
      // Edit existing submission
      setEditingSubmission(existingSubmission);
      setSubmittingAssignment(assignment);
      setSubmissionContent(existingSubmission.content || '');
      setSubmissionFile(null); // File cannot be edited, but can be re-uploaded
    } else {
      // New submission
      setEditingSubmission(null);
      setSubmittingAssignment(assignment);
      setSubmissionContent('');
      setSubmissionFile(null);
    }
  };

  const handleSubmitAssignmentForm = async () => {
    if (!submittingAssignment) return;

    // Double check status before submitting
    if (submittingAssignment.status !== 'ACTIVE') {
      alert('Bài tập này không còn hoạt động. Bạn không thể nộp bài.');
      setSubmittingAssignment(null);
      setSubmissionContent('');
      setSubmissionFile(null);
      setEditingSubmission(null);
      return;
    }

    try {
      // If editing existing submission, we need to update it
      // For now, we'll submit again (backend should handle update if submission exists)
      // If file is selected, use upload endpoint
      if (submissionFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', submissionFile);
        formDataToSend.append('content', submissionContent || '');
        formDataToSend.append('studentId', user?.id?.toString() || '');

        await api.post(`/assignments/${submittingAssignment.id}/submit-with-file`, formDataToSend);
      } else {
        // Regular submission without file
        await api.post(`/assignments/${submittingAssignment.id}/submit`, {
          content: submissionContent,
          studentId: user?.id
        });
      }

      setSubmittingAssignment(null);
      setSubmissionContent('');
      setSubmissionFile(null);
      setEditingSubmission(null);

      // Refresh assignments and submissions
      fetchData();

      alert(editingSubmission ? 'Cập nhật bài nộp thành công!' : 'Nộp bài thành công!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      const errorMessage = error.response?.data?.error || 'Có lỗi xảy ra khi nộp bài';
      alert(errorMessage);
    }
  };

  const handleCloseSubmissionModal = () => {
    setSubmittingAssignment(null);
    setSubmissionContent('');
    setSubmissionFile(null);
    setEditingSubmission(null);
  };

  const isStudent = user?.role?.name?.toUpperCase() === 'STUDENT';
  const isTeacherOrAdmin = user?.role?.name?.toUpperCase() === 'TEACHER' || user?.role?.name?.toUpperCase() === 'ADMIN';
  const teachingActionClasses = useMemo(() => classes.filter(isTeachingActiveClass), [classes]);

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'N/A';
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'N/A';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'N/A';
  };

  const getTeacherName = (teacherId, assignment = null) => {
    // First try to get from assignment.createdBy if available
    if (assignment?.createdBy?.fullName) {
      return assignment.createdBy.fullName;
    }
    // Fallback to teachers array
    if (teacherId) {
      const teacher = teachers.find(t => t.id === teacherId);
      return teacher ? teacher.fullName : 'N/A';
    }
    return 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu bài tập...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{isStudent ? 'Bài tập' : 'Quản lý bài tập'}</h1>
        {!isStudent && (
          <button
            className="btn btn-primary"
            onClick={() => {
              const userRole = user?.role?.name?.toUpperCase();
              const defaultSchoolId = ((userRole === 'ADMIN' || userRole === 'TEACHER') && user?.school?.id)
                ? user.school.id.toString()
                : '';
              setFormData({
                title: '',
                description: '',
                instructions: '',
                maxScore: '',
                status: 'ACTIVE',
                schoolId: defaultSchoolId,
                classId: '',
                subjectId: '',
                createdById: user?.id?.toString() || ''
              });
              setSelectedFile(null);
              setShowModal(true);
            }}
          >
            Thêm bài tập
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Tiêu đề</th>
              <th className="px-4 py-3 text-left">Lớp</th>
              <th className="px-4 py-3 text-left">Môn học</th>
              <th className="px-4 py-3 text-left">Thời gian nộp bài</th>
              <th className="px-4 py-3 text-left">Điểm tối đa</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3">{assignment.title}</td>
                <td className="px-4 py-3">{getClassName(assignment.classEntity?.id)}</td>
                <td className="px-4 py-3">{getSubjectName(assignment.subject?.id)}</td>
                <td className="px-4 py-3">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'N/A'}</td>
                <td className="px-4 py-3">{assignment.maxScore}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex min-w-[84px] justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    assignment.status?.toUpperCase() === 'ACTIVE'
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}>
                    {assignment.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {isStudent ? (
                      assignment.status === 'ACTIVE' ? (
                        studentSubmissions[assignment.id] ? (
                          <>
                            <span
                              className="status-badge active"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85em',
                                marginRight: '0.5rem'
                              }}
                            >
                              Đã nộp bài
                            </span>
                            <button
                              className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                              onClick={() => handleSubmitAssignment(assignment)}
                            >
                              Sửa
                            </button>
                          </>
                        ) : (
                          <button
                            className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                            onClick={() => handleSubmitAssignment(assignment)}
                          >
                            Nộp bài
                          </button>
                        )
                      ) : (
                        <span
                          className="status-badge inactive"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280'
                          }}
                        >
                          {assignment.status === 'INACTIVE' ? 'Không hoạt động' : 'Đã đóng'}
                        </span>
                      )
                    ) : (
                      <>
                        <button
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => handleViewSubmissions(assignment.id)}
                        >
                          Xem nộp bài
                        </button>
                        <button
                          className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                          onClick={() => handleEdit(assignment)}
                          aria-label="Sửa bài tập"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                          onClick={() => handleDelete(assignment.id)}
                          aria-label="Xóa bài tập"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </div>

      {/* Submit Assignment Modal */}
      {submittingAssignment && (
        <div className="common-modal-overlay" onClick={handleCloseSubmissionModal}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()}>
            <div className="common-modal-header">
              <h2>{editingSubmission ? 'Sửa bài nộp' : 'Nộp bài tập'}</h2>
              <button className="common-close-btn" onClick={handleCloseSubmissionModal}>×</button>
            </div>
            <div className="common-modal-form">
              <div className="submission-assignment-info" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#667eea', fontSize: '1.2rem' }}>{submittingAssignment.title}</h3>
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}><strong>Mô tả:</strong> {submittingAssignment.description || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}><strong>Hướng dẫn:</strong> {submittingAssignment.instructions || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}><strong>Điểm tối đa:</strong> {submittingAssignment.maxScore}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}><strong>Hạn nộp:</strong> {formatDate(submittingAssignment.dueDate)}</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitAssignmentForm(); }}>
                <div className="common-form-group">
                  <label>Nội dung bài làm</label>
                  <textarea
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                    rows="8"
                    placeholder="Nhập nội dung bài làm của bạn (tùy chọn)..."
                  />
                </div>
                <div className="common-form-group">
                  <label>Đính kèm file Word (.doc, .docx)</label>
                  {editingSubmission && editingSubmission.attachmentName && !submissionFile && (
                    <div style={{
                      padding: '10px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>📄 {editingSubmission.attachmentName}</span>
                        {editingSubmission.attachmentSize && (
                          <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>
                            ({(editingSubmission.attachmentSize / 1024).toFixed(2)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleDownloadSubmissionFile(editingSubmission.id, editingSubmission.attachmentName)}
                        style={{ marginLeft: '10px' }}
                      >
                        Tải xuống
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <input
                      type="file"
                      id="submission-file-input"
                      accept=".doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Validate file type
                          const fileName = file.name.toLowerCase();
                          if (!fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
                            alert('Chỉ chấp nhận file Word (.doc, .docx)');
                            e.target.value = '';
                            return;
                          }
                          // Validate file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            alert('File không được vượt quá 10MB');
                            e.target.value = '';
                            return;
                          }
                          setSubmissionFile(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="submission-file-input"
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(79, 172, 254, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {editingSubmission && editingSubmission.attachmentName ? 'Thay đổi file' : 'Chọn tệp'}
                    </label>
                    <span style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      {submissionFile ? submissionFile.name : (editingSubmission && editingSubmission.attachmentName ? 'Giữ nguyên file cũ' : 'Không có tệp nào được chọn')}
                    </span>
                  </div>
                  {submissionFile && (
                    <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
                      Đã chọn: {submissionFile.name} ({(submissionFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  <p style={{ marginTop: '5px', fontSize: '0.85em', color: '#999' }}>
                    Bạn có thể nộp bài bằng nội dung text hoặc file Word, hoặc cả hai
                  </p>
                </div>
                <div className="common-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseSubmissionModal}>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!submissionContent && !submissionFile && (!editingSubmission || !editingSubmission.attachmentName)}
                  >
                    {editingSubmission ? 'Cập nhật' : 'Nộp bài'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingAssignment ? 'Sửa bài tập' : 'Thêm bài tập'}</h2>
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
                <label>Hướng dẫn</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows="3"
                />
              </div>
              {!editingAssignment && (
                <div className="common-form-group form-group">
                  <label>Đính kèm file Word (.doc, .docx)</label>
                  <input
                    type="file"
                    accept=".doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate file type
                        const fileName = file.name.toLowerCase();
                        if (!fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
                          alert('Chỉ chấp nhận file Word (.doc, .docx)');
                          e.target.value = '';
                          return;
                        }
                        // Validate file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File không được vượt quá 10MB');
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                  />
                  {selectedFile && (
                    <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
                      Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              )}
              {editingAssignment && editingAssignment.attachmentName && (
                <div className="common-form-group form-group">
                  <label>File đã đính kèm</label>
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500' }}>📄 {editingAssignment.attachmentName}</span>
                      {editingAssignment.attachmentSize && (
                        <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>
                          ({(editingAssignment.attachmentSize / 1024).toFixed(2)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleDownloadFile(editingAssignment.id, editingAssignment.attachmentName)}
                      style={{ marginLeft: '10px' }}
                    >
                      Tải xuống
                    </button>
                  </div>
                  <p style={{ marginTop: '5px', fontSize: '0.85em', color: '#999' }}>
                    Để thay đổi file, vui lòng xóa bài tập và tạo lại với file mới
                  </p>
                </div>
              )}
              <div className="common-form-group form-group">
                <label>Điểm tối đa *</label>
                <input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  min="0"
                  max="10"
                  step="0.1"
                  required
                />
              </div>
              <div className="common-form-group form-group">
                <label>Thời gian nộp bài</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={getCurrentDateTimeLocal()}
                />
              </div>
              <div className="common-form-group form-group">
                <label>Trường *</label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  disabled={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id}
                  required
                  style={(user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'TEACHER') && user?.school?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
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
                <label>Lớp *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => {
                    setFormData({ ...formData, classId: e.target.value, subjectId: '' });
                  }}
                  required
                >
                  <option value="">Chọn lớp</option>
                  {(user?.role?.name?.toUpperCase() === 'TEACHER' ? filteredClasses : teachingActionClasses).map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
                {user?.role?.name?.toUpperCase() === 'TEACHER' && filteredClasses.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                    Bạn chưa được phân công dạy lớp nào
                  </p>
                )}
              </div>
              <div className="common-form-group form-group">
                <label>Môn học *</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                  disabled={!formData.classId}
                >
                  <option value="">
                    {formData.classId ? 'Chọn môn học' : 'Chọn lớp trước'}
                  </option>
                  {(() => {
                    const userRole = user?.role?.name?.toUpperCase();
                    let subjectsToShow = userRole === 'TEACHER' ? filteredSubjects : subjects;

                    // Nếu giáo viên đã chọn lớp, filter môn theo class_sections của giáo viên trong lớp đó.
                    if (userRole === 'TEACHER' && formData.classId && teacherSections.length > 0) {
                      const selectedClassId = parseInt(formData.classId);
                      const subjectIdsByClass = teacherSubjectIdsByClassFromSections(teacherSections);
                      const subjectIdsInClass = subjectIdsByClass.get(selectedClassId) || new Set();
                      subjectsToShow = filteredSubjects.filter(subject => {
                        return subjectIdsInClass.has(subject.id);
                      });
                    }

                    return subjectsToShow.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ));
                  })()}
                </select>
                {user?.role?.name?.toUpperCase() === 'TEACHER' && formData.classId && (
                  (() => {
                    const selectedClassId = parseInt(formData.classId);
                    const subjectIdsByClass = teacherSubjectIdsByClassFromSections(teacherSections);
                    const subjectIdsInClass = subjectIdsByClass.get(selectedClassId) || new Set();
                    const availableSubjects = filteredSubjects.filter(subject => {
                      return subjectIdsInClass.has(subject.id);
                    });
                    if (availableSubjects.length === 0) {
                      return (
                        <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                          Bạn không dạy môn nào cho lớp này
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
              <div className="common-form-group form-group">
                <label>Giáo viên tạo *</label>
                <select
                  value={formData.createdById}
                  onChange={(e) => setFormData({ ...formData, createdById: e.target.value })}
                  disabled={isTeacherOrAdmin}
                  required
                  style={isTeacherOrAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="common-form-group form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                  <option value="CLOSED">Đã đóng</option>
                </select>
              </div>
              <div className="common-modal-actions modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAssignment ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && (
        <div className="common-modal-overlay" onClick={handleCloseSubmissionsModal}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
            <div className="common-modal-header">
              <h2>Danh sách nộp bài</h2>
              <button className="common-close-btn" onClick={handleCloseSubmissionsModal}>×</button>
            </div>
            <div className="common-modal-form" style={{ padding: '2rem', overflowX: 'auto' }}>
              <table className="common-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Nội dung</th>
                    <th>File đính kèm</th>
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>{submission.student?.fullName || 'N/A'}</td>
                      <td>
                        {submission.content ? (
                          <div style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                            {submission.content}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Không có</span>
                        )}
                      </td>
                      <td>
                        {submission.attachmentName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.9em' }}>📄 {submission.attachmentName}</span>
                            {submission.attachmentSize && (
                              <span style={{ fontSize: '0.8em', color: '#666' }}>
                                ({(submission.attachmentSize / 1024).toFixed(2)} KB)
                              </span>
                            )}
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDownloadSubmissionFile(submission.id, submission.attachmentName)}
                              style={{ padding: '2px 8px', fontSize: '0.8em' }}
                            >
                              Tải xuống
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Không có</span>
                        )}
                      </td>
                      <td>{formatDate(submission.submittedAt)}</td>
                      <td>
                        <span className={`status-badge ${submission.status?.toLowerCase()}`}>
                          {submission.status || 'SUBMITTED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Chưa có học sinh nào nộp bài</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Chấm điểm</h2>
              <button className="close-btn" onClick={handleCloseGradingModal}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitGrade(); }}>
              <div className="form-group">
                <label>Điểm *</label>
                <input
                  type="number"
                  value={gradeData.score}
                  onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nhận xét</label>
                <textarea
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                  rows="5"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseGradingModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
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

export default AssignmentListPage;

