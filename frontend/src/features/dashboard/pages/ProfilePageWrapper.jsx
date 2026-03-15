import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import StudentProfilePage from './StudentProfilePage/StudentProfilePage';
import TeacherProfilePage from './TeacherProfilePage/TeacherProfilePage';

/** Chọn trang profile theo role: STUDENT → StudentProfilePage, TEACHER → TeacherProfilePage. */
const ProfilePageWrapper = () => {
  const { user } = useAuth();
  const roleName = user?.role?.name?.toUpperCase();

  if (roleName === 'TEACHER') return <TeacherProfilePage />;
  return <StudentProfilePage />;
};

export default ProfilePageWrapper;
