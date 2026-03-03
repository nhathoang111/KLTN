import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Store login email for role detection
        localStorage.setItem('loginEmail', formData.email);
        // Store user data if available
        if (result.user) {
          localStorage.setItem('currentUser', JSON.stringify(result.user));
        }
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">
              <div className="logo-icon">🏫</div>
              <h1>School Management</h1>
            </div>
            <p className="login-subtitle">Đăng nhập vào hệ thống quản lý trường học</p>
          </div>
          
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                📧 Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                🔒 Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Đăng nhập
                </>
              )}
            </button>
          </form>
          
          
        </div>
      </div>
    </div>
  );
};

export default LoginPage;