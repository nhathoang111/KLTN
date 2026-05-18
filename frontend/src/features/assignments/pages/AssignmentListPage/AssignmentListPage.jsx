import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
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
import { confirmDialog } from '../../../../shared/lib/confirmDialog';

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
      const effectiveSchoolId =
        formData.schoolId ||
        user?.school?.id?.toString() ||
        editingAssignment?.school?.id?.toString() ||
        '';
      const effectiveCreatedById =
        formData.createdById ||
        user?.id?.toString() ||
        editingAssignment?.createdBy?.id?.toString() ||
        '';
      const parsedMaxScore = parseFloat(formData.maxScore);
      if (Number.isNaN(parsedMaxScore) || parsedMaxScore < 0 || parsedMaxScore > 10) {
        toast.error('Điểm tối đa phải nằm trong khoảng từ 0 đến 10');
        return;
      }
      if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
        toast.error('Thời gian nộp bài không được ở quá khứ');
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
        if (effectiveSchoolId) {
          formDataToSend.append('schoolId', effectiveSchoolId);
        }
        if (formData.classId) {
          formDataToSend.append('classId', formData.classId);
        }
        if (formData.subjectId) {
          formDataToSend.append('subjectId', formData.subjectId);
        }
        if (effectiveCreatedById) {
          formDataToSend.append('createdById', effectiveCreatedById);
        }

        // For FormData, axios will automatically set Content-Type with boundary
        await api.post('/assignments/upload', formDataToSend);
      } else {
        // Regular submission without file or editing
        const submitData = {
          ...formData,
          maxScore: parsedMaxScore,
          schoolId: parseInt(effectiveSchoolId),
          classId: parseInt(formData.classId),
          subjectId: parseInt(formData.subjectId),
          createdById: parseInt(effectiveCreatedById)
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
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra khi lưu bài tập');
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
      toast.error('Không thể tải file');
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
      toast.error('Không thể tải file');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Xóa bài tập',
      message: 'Bạn có chắc chắn muốn xóa bài tập này?',
      confirmText: 'Xóa',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/assignments/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Không thể xóa bài tập');
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
      toast.error('Bài tập này không còn hoạt động. Bạn không thể nộp bài.');
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
      toast.error('Bài tập này không còn hoạt động. Bạn không thể nộp bài.');
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

      toast.success(editingSubmission ? 'Cập nhật bài nộp thành công!' : 'Nộp bài thành công!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      const errorMessage = error.response?.data?.error || 'Có lỗi xảy ra khi nộp bài';
      toast.error(errorMessage);
    }
  };

  const handleCloseSubmissionModal = () => {
    setSubmittingAssignment(null);
    setSubmissionContent('');
    setSubmissionFile(null);
    setEditingSubmission(null);
  };

  const isStudent = user?.role?.name?.toUpperCase() === 'STUDENT';
  const teachingActionClasses = useMemo(() => classes.filter(isTeachingActiveClass), [classes]);

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'N/A';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'N/A';
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

  const getStatusBadgeClass = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ACTIVE') return 'status-badge active';
    if (normalized === 'INACTIVE') return 'status-badge inactive';
    if (normalized === 'CLOSED') return 'status-badge closed';
    return 'status-badge';
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
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
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
              <th className="px-4 py-3 text-left">File bài tập</th>
              <th className="px-4 py-3 text-left">Thời gian nộp bài</th>
              {!isStudent && <th className="px-4 py-3 text-left">Điểm tối đa</th>}
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
                <td className="px-4 py-3">
                  {assignment.attachmentName ? (
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => handleDownloadFile(assignment.id, assignment.attachmentName)}
                    >
                      Tải file
                    </button>
                  ) : (
                    <span className="assignment-empty-text">Không có</span>
                  )}
                </td>
                <td className="px-4 py-3">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'N/A'}</td>
                {!isStudent && <td className="px-4 py-3">{assignment.maxScore}</td>}
                <td className="px-4 py-3">
                  <span className={getStatusBadgeClass(assignment.status)}>
                    {assignment.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {isStudent ? (
                      assignment.status === 'ACTIVE' ? (
                        studentSubmissions[assignment.id] ? (
                          <>
                            <span className="status-badge active">
                              Đã nộp bài
                            </span>
                            <button
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => handleSubmitAssignment(assignment)}
                            >
                              Sửa
                            </button>
                          </>
                        ) : (
                          <button
                            className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                            onClick={() => handleSubmitAssignment(assignment)}
                          >
                            Nộp bài
                          </button>
                        )
                      ) : (
                        <span className="status-badge inactive">
                          {assignment.status === 'INACTIVE' ? 'Không hoạt động' : 'Đã đóng'}
                        </span>
                      )
                    ) : (
                      <>
                        <button
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => handleViewSubmissions(assignment.id)}
                        >
                          Xem nộp bài
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                          onClick={() => handleEdit(assignment)}
                          aria-label="Sửa bài tập"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleCloseSubmissionModal}
          role="dialog"
          aria-modal="true"
          aria-label={editingSubmission ? 'Sửa bài nộp' : 'Nộp bài tập'}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white px-6 py-4 border-b border-gray-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold leading-tight text-slate-900">{editingSubmission ? 'Sửa bài nộp' : 'Nộp bài tập'}</h2>
              </div>
              <button
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                onClick={handleCloseSubmissionModal}
                type="button"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto px-6 pt-6 pb-5">
              <div className="submission-assignment-info">
                <h3>{submittingAssignment.title}</h3>
                <p><strong>Mô tả:</strong> {submittingAssignment.description || 'N/A'}</p>
                <p><strong>Hướng dẫn:</strong> {submittingAssignment.instructions || 'N/A'}</p>
                <p><strong>Hạn nộp:</strong> {formatDate(submittingAssignment.dueDate)}</p>
                {submittingAssignment.attachmentName && (
                  <p>
                    <strong>File bài tập:</strong>{' '}
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => handleDownloadFile(submittingAssignment.id, submittingAssignment.attachmentName)}
                    >
                      Tải file đính kèm
                    </button>
                  </p>
                )}
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
                    <div className="assignment-file-summary">
                      <div>
                        <span className="assignment-file-summary__name">📄 {editingSubmission.attachmentName}</span>
                        {editingSubmission.attachmentSize && (
                          <span className="assignment-file-summary__size">
                            ({(editingSubmission.attachmentSize / 1024).toFixed(2)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        onClick={() => handleDownloadSubmissionFile(editingSubmission.id, editingSubmission.attachmentName)}
                      >
                        Tải xuống
                      </button>
                    </div>
                  )}
                  <div className="assignment-file-picker">
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
                            toast.error('Chỉ chấp nhận file Word (.doc, .docx)');
                            e.target.value = '';
                            return;
                          }
                          // Validate file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('File không được vượt quá 10MB');
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
                      className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                    >
                      {editingSubmission && editingSubmission.attachmentName ? 'Thay đổi file' : 'Chọn tệp'}
                    </label>
                    <span className="assignment-file-picker__hint">
                      {submissionFile ? submissionFile.name : (editingSubmission && editingSubmission.attachmentName ? 'Giữ nguyên file cũ' : 'Không có tệp nào được chọn')}
                    </span>
                  </div>
                  {submissionFile && (
                    <p className="assignment-file-note">
                      Đã chọn: {submissionFile.name} ({(submissionFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  <p className="assignment-file-subnote">
                    Bạn có thể nộp bài bằng nội dung text hoặc file Word, hoặc cả hai
                  </p>
                </div>
                <div className="assignment-modal-actions">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={handleCloseSubmissionModal}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label={editingAssignment ? 'Sửa bài tập' : 'Thêm bài tập'}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white px-6 py-4 border-b border-gray-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold leading-tight text-slate-900">{editingAssignment ? 'Sửa bài tập' : 'Thêm bài tập'}</h2>
              </div>
              <button
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                onClick={handleCloseModal}
                type="button"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-auto px-6 pt-6 pb-5 modal-form">
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
                          toast.error('Chỉ chấp nhận file Word (.doc, .docx)');
                          e.target.value = '';
                          return;
                        }
                        // Validate file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('File không được vượt quá 10MB');
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                  />
                  {selectedFile && (
                    <p className="assignment-file-note">
                      Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              )}
              {editingAssignment && editingAssignment.attachmentName && (
                <div className="common-form-group form-group">
                  <label>File đã đính kèm</label>
                  <div className="assignment-file-summary">
                    <div>
                      <span className="assignment-file-summary__name">📄 {editingAssignment.attachmentName}</span>
                      {editingAssignment.attachmentSize && (
                        <span className="assignment-file-summary__size">
                          ({(editingAssignment.attachmentSize / 1024).toFixed(2)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      onClick={() => handleDownloadFile(editingAssignment.id, editingAssignment.attachmentName)}
                    >
                      Tải xuống
                    </button>
                  </div>
                  <p className="assignment-file-subnote">
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
                  <p className="assignment-helper-text">
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
                        <p className="assignment-helper-text">
                          Bạn không dạy môn nào cho lớp này
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
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
              <div className="assignment-modal-actions modal-actions">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500">
                  {editingAssignment ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleCloseSubmissionsModal}
          role="dialog"
          aria-modal="true"
          aria-label="Danh sách nộp bài"
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white px-6 py-4 border-b border-gray-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold leading-tight text-slate-900">Danh sách nộp bài</h2>
              </div>
              <button
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                onClick={handleCloseSubmissionsModal}
                type="button"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="assignment-submissions-body">
              <div className="assignment-submissions-table-wrap">
              <table className="assignment-admin-table">
                <thead className="assignment-admin-table__head">
                  <tr>
                    <th>Học sinh</th>
                    <th>Nội dung</th>
                    <th>File đính kèm</th>
                    <th>Ngày nộp</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="assignment-admin-table__body">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>{submission.student?.fullName || 'N/A'}</td>
                      <td>
                        {submission.content ? (
                          <div className="submission-content-cell">
                            {submission.content}
                          </div>
                        ) : (
                          <span className="assignment-empty-text">Không có</span>
                        )}
                      </td>
                      <td>
                        {submission.attachmentName ? (
                          <div className="submission-attachment-row">
                            <span className="submission-attachment-name">📄 {submission.attachmentName}</span>
                            {submission.attachmentSize && (
                              <span className="submission-attachment-size">
                                ({(submission.attachmentSize / 1024).toFixed(2)} KB)
                              </span>
                            )}
                            <button
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => handleDownloadSubmissionFile(submission.id, submission.attachmentName)}
                            >
                              Tải xuống
                            </button>
                          </div>
                        ) : (
                          <span className="assignment-empty-text">Không có</span>
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
                      <td colSpan="5" className="submission-empty-row">
                        <span className="assignment-empty-text">Chưa có học sinh nào nộp bài</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleCloseGradingModal}
          role="dialog"
          aria-modal="true"
          aria-label="Chấm điểm"
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white px-6 py-4 border-b border-gray-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold leading-tight text-slate-900">Chấm điểm</h2>
              </div>
              <button
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                onClick={handleCloseGradingModal}
                type="button"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitGrade(); }} className="max-h-[75vh] overflow-auto px-6 pt-6 pb-5">
              <div className="common-form-group">
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
              <div className="common-form-group">
                <label>Nhận xét</label>
                <textarea
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                  rows="5"
                />
              </div>
              <div className="assignment-modal-actions">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={handleCloseGradingModal}
                >
                  Hủy
                </button>
                <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500">
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
