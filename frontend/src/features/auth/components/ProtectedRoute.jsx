import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const normalizeRole = (roleName) => {
  const role = roleName?.toUpperCase();
  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'TEACHER') return 'TEACHER';
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'PARENT') return 'PARENT';
  return 'GUEST';
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = normalizeRole(user.role?.name);
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;



