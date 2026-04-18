import React, { useEffect, useState } from 'react';
import api from '../../../../shared/lib/api';

/**
 * Báo cáo cấp nền tảng: chỉ số tổng hợp, không lọc theo lớp/học sinh.
 */
const SuperAdminReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/reports/platform-summary');
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Không tải được thống kê. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
          <p className="text-sm font-medium">Đang tải thống kê toàn hệ thống...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 flex items-center justify-center">
        <p className="text-red-600 font-medium">{error || 'Không có dữ liệu'}</p>
      </div>
    );
  }

  const cards = [
    { label: 'Tổng số trường', value: data.totalSchools },
    { label: 'Trường đang hoạt động', value: data.activeSchools },
    { label: 'Trường tạm khóa', value: data.lockedSchools },
    { label: 'Trường ngưng hoạt động', value: data.inactiveSchools },
    { label: 'Tổng số lớp', value: data.totalClasses },
    { label: 'Admin trường', value: data.schoolAdminCount },
    { label: 'Tổng học sinh', value: data.studentCount },
    { label: 'Giáo viên', value: data.teacherCount },
    { label: 'Phụ huynh', value: data.parentCount },
    { label: 'Tổng tài khoản', value: data.totalUserAccounts },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Thống kê toàn hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dành cho Super Admin: chỉ số tổng hợp theo trường và vai trò. Không hiển thị chi tiết từng lớp hay học sinh.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{Number(c.value ?? 0).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminReportsPage;
