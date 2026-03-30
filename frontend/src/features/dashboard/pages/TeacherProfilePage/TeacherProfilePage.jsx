import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
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
    if (!d) return '-';
    const s = typeof d === 'string' ? d.slice(0, 10) : '';
    if (!s) return '-';
    const [y, m, day] = s.split('-');
    return `${day}/${m}/${y}`;
  };

  const genderLabel = (g) => {
    if (!g) return '-';
    const u = String(g).toUpperCase();
    if (u === 'MALE' || u === 'NAM') return 'Nam';
    if (u === 'FEMALE' || u === 'NỮ') return 'Nữ';
    return g;
  };

  const statusLabel = (s) => {
    if (!s) return '-';
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

  const teacherCode =
    profile?.teacherCode ||
    profile?.code ||
    (profile?.id != null ? `GV${profile.id}` : '');

  const address = profile?.address || '-';
  const avatarLetter =
    (profile?.fullName || user?.fullName || '').trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="p-6 max-w-4xl mx-auto w-full min-h-full">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Thông tin cá nhân</h1>

      {/* Banner đầu trang (giống ảnh): avatar + mã GV + trạng thái + nút */}
      <div className="bg-white w-full rounded-2xl p-6 shadow-sm border border-slate-100 mb-5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-2xl">
              {avatarLetter}
            </div>
            <div className="flex flex-col">
              <div className="text-lg font-semibold text-slate-900">{profile?.fullName || '—'}</div>
              <div className="text-sm text-slate-600">Mã GV: {teacherCode || '—'}</div>
              <div className="text-sm text-slate-600">Trạng thái: {statusLabel(profile?.status)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
              onClick={() => {}}
            >
              Sửa Thông Tin
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition"
              onClick={() => {}}
            >
              Đổi Mật Khẩu
            </button>
          </div>
        </div>
      </div>

      {/*
        UI theo ảnh: card "Thông Tin Cá Nhân" dạng các hàng 2 cột,
        giữa các hàng có đường kẻ ngang.
      */}
      <div className="bg-white w-full rounded-2xl p-6 shadow-sm border border-slate-100 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Thông Tin Cá Nhân</h2>
          <Pencil size={16} className="text-slate-400" />
        </div>

        <div className="border-t border-slate-100">
          {/* Row 1 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Mã giáo viên</div>
              <div className="text-sm text-slate-800 break-words">{teacherCode || '-'}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Giới tính</div>
              <div className="text-sm text-slate-800 break-words">{genderLabel(profile?.gender)}</div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Họ và tên</div>
              <div className="text-sm text-slate-800 break-words">{profile?.fullName || '-'}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Email</div>
              <div className="text-sm text-slate-800 break-words">{profile?.email || '-'}</div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Ngày sinh</div>
              <div className="text-sm text-slate-800 break-words">{formatDate(profile?.dateOfBirth)}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Địa chỉ</div>
              <div className="text-sm text-slate-800 break-words">{address}</div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Số điện thoại</div>
              <div className="text-sm text-slate-800 break-words">{profile?.phone || '-'}</div>
            </div>
            <div className="px-4 py-3" />
          </div>
        </div>
      </div>

      <div className="bg-white w-full rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Thông Tin Công Tác</h2>
          <Pencil size={16} className="text-slate-400" />
        </div>

        <div className="border-t border-slate-100">
          {/* Row 1 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Trường</div>
              <div className="text-sm text-slate-800 break-words">{profile?.school?.name || '-'}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Chức vụ</div>
              <div className="text-sm text-slate-800 break-words">{profile?.role?.name || 'Giáo viên'}</div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Tổ bộ môn</div>
              <div className="text-sm text-slate-800 break-words">{profile?.department || '-'}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Ngày vào làm</div>
              <div className="text-sm text-slate-800 break-words">{profile?.startWorkDate ? formatDate(profile?.startWorkDate) : '-'}</div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Môn giảng dạy</div>
              <div className="text-sm text-slate-800 break-words">
                {Array.isArray(profile?.subjects) && profile.subjects.length > 0
                  ? profile.subjects.map((s) => s?.name).filter(Boolean).join(', ')
                  : (profile?.subject?.name || '-')}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Trạng thái công tác</div>
              <div className="text-sm text-slate-800 break-words">{statusLabel(profile?.status)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
