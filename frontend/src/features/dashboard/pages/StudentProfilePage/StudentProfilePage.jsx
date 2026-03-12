import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import './StudentProfilePage.css';

const StudentProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [error, setError] = useState(null);

  const userId = user?.id;

  useEffect(() => {
    if (!user || !userId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const [userRes, enrollmentRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/users/${userId}/enrollment`).catch(() => ({ data: {} })),
        ]);
        setProfile(userRes.data || null);
        const enroll = enrollmentRes.data?.enrollment ?? enrollmentRes.data?.enrollments?.[0];
        setEnrollment(enroll || null);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Không tải được thông tin.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, userId]);

  const formatDate = (d) => {
    if (!d) return '—';
    const s = typeof d === 'string' ? d.slice(0, 10) : '';
    if (!s) return '—';
    const [y, m, day] = s.split('-');
    return `${day}/${m}/${y}`;
  };

  const genderLabel = (g) => {
    if (!g) return '—';
    const u = String(g).toUpperCase();
    if (u === 'MALE' || u === 'NAM') return 'Nam';
    if (u === 'FEMALE' || u === 'NỮ') return 'Nữ';
    return g;
  };

  const statusLabel = (s) => {
    if (!s) return '—';
    if (String(s).toUpperCase() === 'ACTIVE') return 'Đang học';
    if (String(s).toUpperCase() === 'INACTIVE') return 'Tạm nghỉ';
    return s;
  };

  if (loading) {
    return (
      <div className="spp-wrap">
        <div className="spp-loading">
          <div className="spp-spinner" />
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spp-wrap">
        <div className="spp-card spp-card--error">
          <p className="spp-error-msg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spp-wrap">
      <h1 className="spp-page-title">Thông tin cá nhân</h1>

      <div className="spp-card">
        <h2 className="spp-card-title">Thông tin cơ bản</h2>
        <div className="spp-grid">
          <div className="spp-field">
            <span className="spp-label">Họ và tên</span>
            <span className="spp-value">{profile?.fullName || '—'}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Email</span>
            <span className="spp-value">{profile?.email || '—'}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Số điện thoại</span>
            <span className="spp-value">{profile?.phone || '—'}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Ngày sinh</span>
            <span className="spp-value">{formatDate(profile?.dateOfBirth)}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Giới tính</span>
            <span className="spp-value">{genderLabel(profile?.gender)}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Trạng thái</span>
            <span className="spp-value">{statusLabel(profile?.status)}</span>
          </div>
        </div>
      </div>

      <div className="spp-card">
        <h2 className="spp-card-title">Thông tin trường học</h2>
        <div className="spp-grid">
          <div className="spp-field">
            <span className="spp-label">Trường</span>
            <span className="spp-value">{profile?.school?.name || '—'}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Lớp</span>
            <span className="spp-value">{enrollment?.className ?? profile?.class?.name ?? '—'}</span>
          </div>
          <div className="spp-field">
            <span className="spp-label">Số báo danh</span>
            <span className="spp-value">{enrollment?.rollno ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
