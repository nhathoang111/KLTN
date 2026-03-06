import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import SchoolListPage from './pages/SchoolListPage/SchoolListPage';
import SchoolCreatePage from './pages/SchoolCreatePage/SchoolCreatePage';
import SchoolEditPage from './pages/SchoolEditPage/SchoolEditPage';
import ClassListPage from './pages/ClassListPage/ClassListPage';
import ClassCreatePage from './pages/ClassCreatePage/ClassCreatePage';
import ClassEditPage from './pages/ClassEditPage/ClassEditPage';
import SubjectListPage from './pages/SubjectListPage/SubjectListPage';
import SubjectCreatePage from './pages/SubjectCreatePage/SubjectCreatePage';
import SubjectEditPage from './pages/SubjectEditPage/SubjectEditPage';
import UserListPage from './pages/UserListPage/UserListPage';
import UserCreatePage from './pages/UserCreatePage/UserCreatePage';
import UserEditPage from './pages/UserEditPage/UserEditPage';
import AssignmentListPage from './pages/AssignmentListPage/AssignmentListPage';
import ReportListPage from './pages/ReportListPage/ReportListPage';
import DocumentListPage from './pages/DocumentListPage/DocumentListPage';
import AnnouncementListPage from './pages/AnnouncementListPage/AnnouncementListPage';
import RoleManagement from './pages/RoleManagement/RoleManagement';
import ExamScoreManagement from './pages/ExamScoreManagement/ExamScoreManagement';
import AttendanceManagement from './pages/AttendanceManagement/AttendanceManagement';
import RecordListPage from './pages/RecordListPage/RecordListPage';
import ScheduleListPage from './pages/ScheduleListPage/ScheduleListPage';
import ProtectedRoute from './components/ProtectedRoute/';
import Layout from './components/Layout/Layout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* School Management */}
              <Route path="schools" element={<SchoolListPage />} />
              <Route path="schools/create" element={<SchoolCreatePage />} />
              <Route path="schools/:id/edit" element={<SchoolEditPage />} />

              {/* Class Management */}
              <Route path="classes" element={<ClassListPage />} />
              <Route path="classes/create" element={<ClassCreatePage />} />
              <Route path="classes/:id/edit" element={<ClassEditPage />} />

              {/* Subject Management */}
              <Route path="subjects" element={<SubjectListPage />} />
              <Route path="subjects/create" element={<SubjectCreatePage />} />
              <Route path="subjects/:id/edit" element={<SubjectEditPage />} />

              {/* User Management */}
              <Route path="users" element={<UserListPage />} />
              <Route path="users/create" element={<UserCreatePage />} />
              <Route path="users/:id/edit" element={<UserEditPage />} />

              {/* Role Management */}
              <Route path="roles" element={<RoleManagement />} />


              {/* Assignment Management */}
              <Route path="assignments" element={<AssignmentListPage />} />

              {/* Report Management */}
              <Route path="reports" element={<ReportListPage />} />

              {/* Document Management */}
              <Route path="documents" element={<DocumentListPage />} />

              {/* Announcement Management */}
              <Route path="announcements" element={<AnnouncementListPage />} />

              {/* Exam Score Management */}
              <Route path="exam-scores" element={<ExamScoreManagement />} />

              {/* Attendance Management */}
              <Route path="attendance" element={<AttendanceManagement />} />

              {/* Record Management */}
              <Route path="records" element={<RecordListPage />} />

              {/* Schedule Management */}
              <Route path="schedules" element={<ScheduleListPage />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;