import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';

const TeacherProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const userId = user?.id;

  useEffect(() => {
    if (!user || !userId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await api.get(`/users/${userId}`);
        setProfile(res.data || null);
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
    if (String(s).toUpperCase() === 'ACTIVE') return 'Đang dạy';
    if (String(s).toUpperCase() === 'INACTIVE') return 'Tạm nghỉ';
    return s;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-slate-500">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin mb-3" />
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-slate-50/80 min-h-full">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Thông tin cá nhân</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-violet-700 mb-4 pb-3 border-b border-violet-100">
          Thông tin cơ bản
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Họ và tên</span>
            <span className="text-sm text-slate-800">{profile?.fullName || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Email</span>
            <span className="text-sm text-slate-800">{profile?.email || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Số điện thoại</span>
            <span className="text-sm text-slate-800">{profile?.phone || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Ngày sinh</span>
            <span className="text-sm text-slate-800">{formatDate(profile?.dateOfBirth)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Giới tính</span>
            <span className="text-sm text-slate-800">{genderLabel(profile?.gender)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Trạng thái</span>
            <span className="text-sm text-slate-800">{statusLabel(profile?.status)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-semibold text-violet-700 mb-4 pb-3 border-b border-violet-100">
          Thông tin công tác
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Trường</span>
            <span className="text-sm text-slate-800">{profile?.school?.name || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Phòng ban / Tổ bộ môn</span>
            <span className="text-sm text-slate-800">{profile?.department || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Môn dạy</span>
            <span className="text-sm text-slate-800">{profile?.subject?.name || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Vai trò</span>
            <span className="text-sm text-slate-800">{profile?.role?.name || 'Giáo viên'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
