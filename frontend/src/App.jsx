import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './app/providers/AuthProvider';
import LoginPage from './features/auth/pages/LoginPage/LoginPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import Layout from './shared/components/layout/Layout/Layout';
import { protectedRoutes } from './app/router/routeConfig';

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
              {protectedRoutes.map(({ path, Component, roles }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute allowedRoles={roles}>
                      <Component />
                    </ProtectedRoute>
                  }
                />
              ))}
            </Route>
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="colored"
            style={{ zIndex: 999999 }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
