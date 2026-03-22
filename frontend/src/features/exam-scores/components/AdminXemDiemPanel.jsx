import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../shared/lib/api';
import { Search, Download } from 'lucide-react';
import { getScoreValue, averageScores, scoreCellClass } from '../utils/scoreGridHelpers';

const SEMESTERS = [
  { value: '1', label: 'Học kỳ 1' },
  { value: '2', label: 'Học kỳ 2' },
];

/**
 * Khối "Xem điểm" cho admin: bộ lọc + bảng tóm điểm nhiều cột (theo mockup).
 * Dữ liệu: exam_scores với scoreType + attempt (MIENG, 15P, 1TIET, CUOIKI).
 */
export default function AdminXemDiemPanel({ examScores, classes, subjects, user }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [semester, setSemester] = useState('1');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [teacherLabel, setTeacherLabel] = useState('');

  const [showOral, setShowOral] = useState(true);
  const [show15, setShow15] = useState(true);
  const [show1T, setShow1T] = useState(true);
  const [showCk, setShowCk] = useState(true);

  const classIdNum = selectedClassId ? Number(selectedClassId) : null;
  const subjectIdNum = selectedSubjectId ? Number(selectedSubjectId) : null;

  const schoolSubjects = useMemo(() => {
    if (!user?.school?.id) return subjects || [];
    return (subjects || []).filter((s) => s.school?.id === user.school.id);
  }, [subjects, user?.school?.id]);

  useEffect(() => {
    if (!classIdNum) {
      setStudents([]);
      setTeacherLabel('');
      return;
    }
    const load = async () => {
      setLoadingStudents(true);
      try {
        const res = await api.get(`/classes/${classIdNum}/students`);
        setStudents(res.data.students || []);
      } catch {
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, [classIdNum]);

  useEffect(() => {
    if (!classIdNum || !subjectIdNum) {
      setTeacherLabel('');
      return;
    }
    const loadTeacher = async () => {
      try {
        const res = await api.get(`/schedules/class/${classIdNum}`);
        const schedules = res.data.schedules || [];
        const match = schedules.find(
          (sch) => (sch.subject?.id || sch.subject_id) === subjectIdNum
        );
        const name = match?.teacher?.fullName;
        setTeacherLabel(name || '—');
      } catch {
        setTeacherLabel('—');
      }
    };
    loadTeacher();
  }, [classIdNum, subjectIdNum]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((st) => {
      const name = (st.fullName || '').toLowerCase();
      const idStr = String(st.id || '');
      return name.includes(q) || idStr.includes(q);
    });
  }, [students, studentSearch]);

  const rowScores = useCallback(
    (studentId) => {
      if (!classIdNum || !subjectIdNum) return null;
      const oral1 = getScoreValue(examScores, studentId, classIdNum, subjectIdNum, 'MIENG', 1);
      const p151 = getScoreValue(examScores, studentId, classIdNum, subjectIdNum, '15P', 1);
      const t1 = getScoreValue(examScores, studentId, classIdNum, subjectIdNum, '1TIET', 1);
      const ck1 = getScoreValue(examScores, studentId, classIdNum, subjectIdNum, 'CUOIKI', 1);
      const parts = [oral1, p151, t1, ck1].filter((v) => v != null);
      const tbm = parts.length ? averageScores([oral1, p151, t1, ck1]) : null;
      return { oral1, p151, t1, ck1, tbm };
    },
    [examScores, classIdNum, subjectIdNum]
  );

  const downloadCsv = () => {
    if (!classIdNum || !subjectIdNum || !filteredStudents.length) {
      alert('Chọn lớp, môn và đảm bảo có danh sách học sinh.');
      return;
    }
    const cls = classes.find((c) => c.id === classIdNum);
    const sub = schoolSubjects.find((s) => s.id === subjectIdNum);
    const headers = ['STT', 'Họ tên'];
    if (showOral) headers.push('Miệng 1');
    if (show15) headers.push('15P-1');
    if (show1T) headers.push('1T-1');
    if (showCk) headers.push('CK-1');
    headers.push('TBM');

    const lines = [headers.join(',')];
    filteredStudents.forEach((st, idx) => {
      const r = rowScores(st.id);
      if (!r) return;
      const cells = [idx + 1, `"${(st.fullName || '').replace(/"/g, '""')}"`];
      if (showOral) cells.push(r.oral1 ?? '');
      if (show15) cells.push(r.p151 ?? '');
      if (show1T) cells.push(r.t1 ?? '');
      if (showCk) cells.push(r.ck1 ?? '');
      cells.push(r.tbm ?? '');
      lines.push(cells.join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tom_diem_${cls?.name || 'lop'}_${sub?.name || 'mon'}_${semester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderScoreCell = (val) => {
    if (val == null) return <span className="text-slate-400">—</span>;
    return <span className={`es-score-pill ${scoreCellClass(val)}`}>{val.toFixed(1)}</span>;
  };

  return (
    <div className="admin-xem-diem space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Xem điểm</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSubjectId('');
            }}
          >
            <option value="">— Chọn lớp —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Học kỳ</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {SEMESTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Môn học</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">— Chọn môn —</option>
            {schoolSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tìm kiếm học sinh</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
              placeholder="Tìm kiếm học sinh..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Giáo viên phụ trách (môn đã chọn)</label>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {teacherLabel || '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
        >
          <Download className="h-4 w-4" />
          Tải xuống
        </button>
      </div>

      <div className="flex flex-wrap gap-6 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
        <label className="inline-flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
          <input type="checkbox" checked={showOral} onChange={(e) => setShowOral(e.target.checked)} className="rounded border-blue-400 text-blue-600" />
          Điểm miệng
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
          <input type="checkbox" checked={show15} onChange={(e) => setShow15(e.target.checked)} className="rounded border-blue-400 text-blue-600" />
          Điểm 15 phút
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
          <input type="checkbox" checked={show1T} onChange={(e) => setShow1T(e.target.checked)} className="rounded border-blue-400 text-blue-600" />
          Điểm 1 tiết
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
          <input type="checkbox" checked={showCk} onChange={(e) => setShowCk(e.target.checked)} className="rounded border-blue-400 text-blue-600" />
          Điểm cuối kỳ
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          <h3 className="text-sm font-semibold text-slate-700">Tóm điểm</h3>
        </div>
        <div className="overflow-x-auto">
          {loadingStudents ? (
            <div className="flex justify-center py-12 text-slate-500">Đang tải danh sách...</div>
          ) : !classIdNum || !subjectIdNum ? (
            <div className="py-12 text-center text-slate-500">Chọn lớp và môn học để xem bảng điểm.</div>
          ) : (
            <table className="admin-grade-table min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th rowSpan={2} className="border border-slate-200 px-2 py-2">
                    STT
                  </th>
                  <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-left min-w-[160px]">
                    Họ tên
                  </th>
                  {showOral && (
                    <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                      Điểm miệng
                    </th>
                  )}
                  {show15 && (
                    <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                      Điểm 15 phút
                    </th>
                  )}
                  {show1T && (
                    <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                      Điểm 1 tiết
                    </th>
                  )}
                  {showCk && (
                    <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                      Điểm cuối kỳ
                    </th>
                  )}
                  <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center bg-emerald-50">
                    TBM
                  </th>
                </tr>
                <tr className="bg-white text-[11px] text-slate-600">
                  {showOral && <th className="border border-slate-200 px-1 py-1">Miệng 1</th>}
                  {show15 && <th className="border border-slate-200 px-1 py-1">15P-1</th>}
                  {show1T && <th className="border border-slate-200 px-1 py-1">1T-1</th>}
                  {showCk && <th className="border border-slate-200 px-1 py-1">CK-1</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="border border-slate-200 px-4 py-8 text-center text-slate-500">
                      Không có học sinh hoặc không khớp bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, index) => {
                    const r = rowScores(st.id);
                    return (
                      <tr key={st.id} className="odd:bg-white even:bg-slate-50/80 hover:bg-amber-50/30">
                        <td className="border border-slate-200 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border border-slate-200 px-2 py-2 font-medium text-slate-800">{st.fullName}</td>
                        {showOral && (
                          <td className="border border-slate-200 px-1 py-1 text-center">{renderScoreCell(r?.oral1)}</td>
                        )}
                        {show15 && (
                          <td className="border border-slate-200 px-1 py-1 text-center">{renderScoreCell(r?.p151)}</td>
                        )}
                        {show1T && (
                          <td className="border border-slate-200 px-1 py-1 text-center">{renderScoreCell(r?.t1)}</td>
                        )}
                        {showCk && (
                          <td className="border border-slate-200 px-1 py-1 text-center">{renderScoreCell(r?.ck1)}</td>
                        )}
                        <td className="border border-slate-200 px-1 py-1 text-center font-semibold">
                          {renderScoreCell(r?.tbm)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
