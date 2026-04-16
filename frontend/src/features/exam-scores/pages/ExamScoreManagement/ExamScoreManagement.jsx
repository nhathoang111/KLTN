import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/lib/api';
import './ExamScoreManagement.css';
import { useAuth } from '../../../auth/context/AuthContext';
import { Pencil, Trash2, Search, Download } from 'lucide-react';
import { scoreCellClass } from '../../utils/scoreGridHelpers';
import { normalizeSemesterCode } from '../../utils/semesterNormalize';

const ADMIN_VIEW_SEMESTERS = [
  { value: '1', label: 'Học kỳ 1' },
  { value: '2', label: 'Học kỳ 2' },
];

function adminScheduleMatchesClassSemester(schedule, semesterUi, classSchoolYearName) {
  const cs = schedule.classSection;
  if (!cs) return false;
  const code = normalizeSemesterCode(cs.semester);
  if (code == null || code !== semesterUi) return false;
  const syClass = classSchoolYearName ? String(classSchoolYearName).trim() : '';
  const syCs = cs.schoolYear != null ? String(cs.schoolYear).trim() : '';
  if (syClass && syCs && syClass !== syCs) return false;
  return true;
}

function adminUniqueSubjectsFromSchedules(schedules) {
  const map = new Map();
  schedules.forEach((sch) => {
    const sub = sch.subject;
    if (!sub?.id) return;
    if (!map.has(sub.id)) map.set(sub.id, { id: sub.id, name: sub.name || `Môn #${sub.id}` });
  });
  return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
}

/** Khối "Xem điểm" admin: điểm + TBM từ GET /api/exam-scores/tbm-summary */
function AdminXemDiemSection({ classes, subjects, user }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [semester, setSemester] = useState('1');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [tbmRows, setTbmRows] = useState([]);
  const [loadingTbm, setLoadingTbm] = useState(false);
  const [schedulesForClass, setSchedulesForClass] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
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

  const selectedClass = useMemo(
    () => (selectedClassId ? classes.find((c) => String(c.id) === String(selectedClassId)) : null),
    [classes, selectedClassId]
  );
  const classSchoolYearName = selectedClass?.schoolYear?.name || selectedClass?.school_year?.name || '';

  const schedulesForSemester = useMemo(() => {
    return schedulesForClass.filter((sch) =>
      adminScheduleMatchesClassSemester(sch, semester, classSchoolYearName)
    );
  }, [schedulesForClass, semester, classSchoolYearName]);

  const subjectsForSemester = useMemo(
    () => adminUniqueSubjectsFromSchedules(schedulesForSemester),
    [schedulesForSemester]
  );

  useEffect(() => {
    if (!classIdNum || !subjectIdNum) {
      setTbmRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingTbm(true);
      try {
        const res = await api.get('/exam-scores/tbm-summary', {
          params: { classId: classIdNum, subjectId: subjectIdNum },
        });
        if (!cancelled) setTbmRows(res.data.rows || []);
      } catch {
        if (!cancelled) setTbmRows([]);
      } finally {
        if (!cancelled) setLoadingTbm(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classIdNum, subjectIdNum]);

  useEffect(() => {
    if (!classIdNum) {
      setSchedulesForClass([]);
      setTeacherLabel('');
      return;
    }
    const loadTk = async () => {
      setLoadingSchedules(true);
      try {
        const res = await api.get(`/schedules/class/${classIdNum}`);
        setSchedulesForClass(res.data.schedules || []);
      } catch {
        setSchedulesForClass([]);
      } finally {
        setLoadingSchedules(false);
      }
    };
    loadTk();
  }, [classIdNum]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    const ok = subjectsForSemester.some((s) => String(s.id) === String(selectedSubjectId));
    if (!ok) setSelectedSubjectId('');
  }, [subjectsForSemester, selectedSubjectId]);

  useEffect(() => {
    if (!subjectIdNum || !schedulesForSemester.length) {
      setTeacherLabel('');
      return;
    }
    const match = schedulesForSemester.find(
      (sch) => (sch.subject?.id || sch.subject_id) === subjectIdNum
    );
    setTeacherLabel(match?.teacher?.fullName || '—');
  }, [subjectIdNum, schedulesForSemester]);

  const filteredRows = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return tbmRows;
    return tbmRows.filter((row) => {
      const name = (row.fullName || '').toLowerCase();
      const idStr = String(row.studentId ?? '');
      return name.includes(q) || idStr.includes(q);
    });
  }, [tbmRows, studentSearch]);

  const downloadCsv = () => {
    if (!classIdNum || !subjectIdNum || !filteredRows.length) {
      alert('Chọn lớp, môn và đảm bảo có danh sách học sinh.');
      return;
    }
    const cls = classes.find((c) => c.id === classIdNum);
    const sub =
      subjectsForSemester.find((s) => s.id === subjectIdNum) ||
      schoolSubjects.find((s) => s.id === subjectIdNum);
    const headers = ['STT', 'Họ tên'];
    if (showOral) headers.push('Miệng 1');
    if (show15) headers.push('15P-1');
    if (show1T) headers.push('1T-1');
    if (showCk) headers.push('CK-1');
    headers.push('TBM');

    const lines = [headers.join(',')];
    filteredRows.forEach((r, idx) => {
      const cells = [idx + 1, `"${(r.fullName || '').replace(/"/g, '""')}"`];
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
            onChange={(e) => {
              setSemester(e.target.value);
              setSelectedSubjectId('');
            }}
          >
            {ADMIN_VIEW_SEMESTERS.map((s) => (
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
            disabled={!selectedClassId || loadingSchedules}
          >
            <option value="">
              {loadingSchedules ? 'Đang tải môn...' : '— Chọn môn —'}
            </option>
            {subjectsForSemester.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {selectedClassId && !loadingSchedules && subjectsForSemester.length === 0 && (
          <p className="w-full text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Không có môn nào được phân công (TKB / học phần) cho lớp và học kỳ đã chọn. Kiểm tra TKB và học phần có trường học kỳ, năm học khớp với lớp.
          </p>
        )}
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
          <h3 className="text-sm font-semibold text-slate-700">Toàn bộ điểm</h3>
        </div>
        <div className="overflow-x-auto">
          {loadingTbm ? (
            <div className="flex justify-center py-12 text-slate-500">Đang tải điểm...</div>
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="border border-slate-200 px-4 py-8 text-center text-slate-500">
                      Không có học sinh hoặc không khớp bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, index) => {
                    return (
                      <tr key={r.studentId} className="odd:bg-white even:bg-slate-50/80 hover:bg-amber-50/30">
                        <td className="border border-slate-200 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border border-slate-200 px-2 py-2 font-medium text-slate-800">{r.fullName}</td>
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

const ExamScoreManagement = () => {
  const { user } = useAuth();
  const [examScores, setExamScores] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isScoreLocked, setIsScoreLocked] = useState(false);
  const [selectedClassForScore, setSelectedClassForScore] = useState('');
  const [selectedSubjectForScore, setSelectedSubjectForScore] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [classScoreData, setClassScoreData] = useState({}); // {studentId: {scoreMieng, score15P, ...}}
  const [filteredSubjectsForClass, setFilteredSubjectsForClass] = useState([]); // Môn theo TKB + học kỳ (GV)
  const [displayFilterClassId, setDisplayFilterClassId] = useState(''); // Lớp đã chọn để filter hiển thị (cho Teacher)
  const [displayFilterSubjectId, setDisplayFilterSubjectId] = useState(''); // Môn đã chọn để filter hiển thị (cho Teacher)
  const [isEditMode, setIsEditMode] = useState(false); // Phân biệt giữa nhập điểm mới và sửa điểm
  /** Học kỳ trong modal nhập điểm (lọc môn theo TKB, khớp admin) */
  const [teacherModalSemester, setTeacherModalSemester] = useState('1');
  /** Map studentId -> row từ GET /exam-scores/tbm-summary (TBM chỉ hiển thị, không tính FE) */
  const [teacherTbmByStudentId, setTeacherTbmByStudentId] = useState({});
  /** Bảng ngoài GV/HS: TBM theo cặp lớp-môn */
  const [outerTbmByPair, setOuterTbmByPair] = useState({});
  const [teacherOuterShowOral, setTeacherOuterShowOral] = useState(true);
  const [teacherOuterShow15, setTeacherOuterShow15] = useState(true);
  const [teacherOuterShow1T, setTeacherOuterShow1T] = useState(true);
  const [teacherOuterShowCk, setTeacherOuterShowCk] = useState(true);
  const [teacherImportFile, setTeacherImportFile] = useState(null);
  const [teacherImporting, setTeacherImporting] = useState(false);
  // AI phân tích theo học sinh (cho giáo viên)
  const [aiStudentModal, setAiStudentModal] = useState(null); // { studentId, fullName, email }
  const [aiStudentLoading, setAiStudentLoading] = useState(false);
  const [aiStudentError, setAiStudentError] = useState('');
  const [aiStudentResult, setAiStudentResult] = useState(null); // response from /api/ai/insights/student

  useEffect(() => {
    fetchExamScores();
    fetchStudents();
    fetchSubjects();
    fetchClasses();
    fetchScoreLockStatus();
  }, [user]);

  const runAiStudentInsight = async (student) => {
    const sid = student?.id ?? student?.studentId;
    if (!sid) return;
    try {
      setAiStudentError('');
      setAiStudentResult(null);
      setAiStudentModal({
        studentId: sid,
        fullName: student?.fullName || '',
        email: student?.email || '',
      });
      setAiStudentLoading(true);

      const res = await api.post(
        '/ai/insights/student',
        { studentId: Number(sid), currentWindowDays: 30, previousWindowDays: 30 },
        {
          headers: {
            'X-User-Id': user?.id,
            'X-User-Role': user?.role?.name,
          },
        }
      );
      setAiStudentResult(res.data || null);
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Phân tích AI thất bại';
      setAiStudentError(String(msg));
    } finally {
      setAiStudentLoading(false);
    }
  };

  const fetchScoreLockStatus = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      // Only fetch lock status for admin and teacher
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        const response = await api.get(`/exam-scores/lock-status/${schoolId}`);
        setIsScoreLocked(response.data.scoreLocked || false);
      }
    } catch (error) {
      console.error('Error fetching score lock status:', error);
      // Default to unlocked if error
      setIsScoreLocked(false);
    }
  };
  const handleTeacherImport = async () => {
    if (!teacherImportFile) {
      alert('Chọn file trước');
      return;
    }

    if (!user?.id || !user?.role?.name || !user?.school?.id) {
      alert('Thiếu thông tin người dùng hoặc trường học');
      return;
    }

    try {
      setTeacherImporting(true);

      const formData = new FormData();
      formData.append('file', teacherImportFile);

      const res = await api.post('/exam-scores/import', formData, {
        headers: {
          'X-User-Id': user.id,
          'X-User-Role': user.role.name,
          'X-School-Id': user.school.id,
        },
      });

      const data = res.data || {};
      const success = data.success ?? 0;
      const fail = data.fail ?? 0;
      const errors = Array.isArray(data.errors) ? data.errors : [];

      let message = `Import hoàn tất.\nSuccess: ${success}\nFail: ${fail}`;

      if (errors.length > 0) {
        const topErrors = errors
          .slice(0, 20)
          .map((e) => `- Dòng ${e.row}: ${e.error}`)
          .join('\n');

        message += `\n\nChi tiết lỗi:\n${topErrors}`;

        if (errors.length > 20) {
          message += `\n... và ${errors.length - 20} lỗi khác`;
        }
      }

      alert(message);
      setTeacherImportFile(null);

      await fetchExamScores();
    } catch (err) {
      console.error(err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        'Import failed';

      alert(typeof serverMessage === 'string' ? serverMessage : 'Import failed');
    } finally {
      setTeacherImporting(false);
    }
  };
  const fetchExamScores = async () => {
    try {
      const response = await api.get('/exam-scores');
      let allScores = response.data.examScores || [];
      const userRole = user?.role?.name?.toUpperCase();
      const activeStudentId = localStorage.getItem('activeStudentId');

      // Lọc điểm theo trường học cho các vai trò tương ứng (Admin, GV, HS, PH)
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT' || userRole === 'PARENT') && user?.school?.id) {
        allScores = allScores.filter(score => {
          const studentSchoolId = score.student?.school?.id || score.school?.id;
          return studentSchoolId === user.school.id;
        });
      }

      // For students, only show their own scores
      if (userRole === 'STUDENT' && user?.id) {
        allScores = allScores.filter(score => score.student?.id === user.id);
      }

      // Nếu là Phụ huynh, chỉ hiển thị điểm của người con đang được chọn
      if (userRole === 'PARENT' && activeStudentId) {
        allScores = allScores.filter(score => {
          const studentId = score.student?.id || score.student_id;
          return String(studentId) === String(activeStudentId);
        });
      } else if (userRole === 'PARENT' && !activeStudentId) {
        // Nếu chưa chọn con thì không hiện điểm nào để đảm bảo bảo mật
        allScores = [];
      }

      // For teachers, only show scores for subjects they teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          // Fetch schedules for this teacher
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];

          // Get unique subject IDs from schedules
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });

          console.log('Teacher assigned subject IDs:', Array.from(assignedSubjectIds));

          // Filter scores to only show those for assigned subjects
          allScores = allScores.filter(score => {
            const scoreSubjectId = score.subject?.id || score.subject_id;
            return assignedSubjectIds.has(scoreSubjectId);
          });

          console.log('Filtered exam scores for teacher:', allScores.length);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, show no scores for teacher
          allScores = [];
        }
      }

      // Log để debug scoreType
      console.log('=== FETCHED EXAM SCORES ===');
      console.log('Total scores:', allScores.length);
      allScores.forEach(score => {
        console.log(`Score ID ${score.id}: scoreType = "${score.scoreType || score.score_type || 'N/A'}"`);
        console.log(`  - score.scoreType: "${score.scoreType}"`);
        console.log(`  - score.score_type: "${score.score_type}"`);
      });

      setExamScores(allScores);
    } catch (error) {
      console.error('Error fetching exam scores:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;
      const isStudent = userRole === 'STUDENT';

      // Don't fetch users if student (to avoid 403)
      if (isStudent) {
        setStudents([]);
        return;
      }

      let url = '/users';
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
      }

      const response = await api.get(url);
      let allUsers = response.data.users || [];

      // Filter students and filter by admin/teacher's school
      let studentUsers = allUsers.filter(user => {
        const roleName = user.role?.name?.toUpperCase();
        return roleName === 'STUDENT' || roleName?.startsWith('STUDENT');
      });

      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && schoolId) {
        studentUsers = studentUsers.filter(student => student.school?.id === schoolId);
      }

      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      let allSubjects = response.data.subjects || [];

      const userRole = user?.role?.name?.toUpperCase();

      // Filter subjects for admin - only show subjects from their own school
      if (userRole === 'ADMIN' && user?.school?.id) {
        allSubjects = allSubjects.filter(subject => subject.school?.id === user.school.id);
      }

      // Filter subjects for teacher - only show subjects they are assigned to teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          // Fetch schedules for this teacher
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];

          // Get unique subject IDs from schedules
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });

          console.log('Teacher assigned subject IDs:', Array.from(assignedSubjectIds));

          // Filter subjects to only show assigned ones
          allSubjects = allSubjects.filter(subject => {
            const subjectId = subject.id;
            const isAssigned = assignedSubjectIds.has(subjectId);
            const isSameSchool = subject.school?.id === user.school?.id;
            return isAssigned && isSameSchool;
          });

          console.log('Filtered subjects for teacher:', allSubjects);
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, still filter by school only
          if (user?.school?.id) {
            allSubjects = allSubjects.filter(subject => subject.school?.id === user.school.id);
          }
        }
      }

      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      let allClasses = response.data.classes || [];
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      // Filter classes for admin - only show classes from their own school
      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter(cls => cls.school?.id === schoolId);
      } else if (userRole === 'TEACHER' && user?.id) {
        // Filter classes for teacher - show all classes they teach (from schedules) + classes they are homeroom teacher for
        try {
          // Fetch schedules for this teacher to get all classes they teach
          const schedulesRes = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesRes.data.schedules || [];

          // Get unique class IDs from schedules
          const taughtClassIds = new Set();
          teacherSchedules.forEach(schedule => {
            const classId = schedule.classEntity?.id || schedule.class_id;
            if (classId) {
              taughtClassIds.add(classId);
            }
          });

          // Filter classes: show classes they teach OR classes they are homeroom teacher for
          allClasses = allClasses.filter(cls => {
            const isSameSchool = cls.school?.id === schoolId;
            if (!isSameSchool) return false;

            // Check if teacher is homeroom teacher
            const homeroomTeacherId = cls.homeroomTeacher?.id || cls.homeroomTeacherId;
            const isHomeroomTeacher = homeroomTeacherId === user.id;

            // Check if teacher teaches this class (from schedules)
            const isTeachingClass = taughtClassIds.has(cls.id);

            return isHomeroomTeacher || isTeachingClass;
          });
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          // If error, show no classes for teacher
          allClasses = [];
        }
      }
      setClasses(allClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scoreId) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể xóa điểm.');
      return;
    }

    try {
      await api.delete(`/exam-scores/${scoreId}`);
      console.log('✅ Deleted score ID:', scoreId);
    } catch (error) {
      console.error('❌ Error deleting exam score:', error);
      throw error; // Re-throw để xử lý ở nơi gọi
    }
  };

  const handleDeleteAll = async (group) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể xóa điểm.');
      return;
    }

    const scoresToDelete = [];
    if (group.scoreMieng) {
      scoresToDelete.push({ type: 'miệng', id: group.scoreMieng.id });
    }
    if (group.score15P) {
      scoresToDelete.push({ type: '15 phút', id: group.score15P.id });
    }
    if (group.score1Tiet) {
      scoresToDelete.push({ type: '1 tiết', id: group.score1Tiet.id });
    }
    if (group.scoreCuoiKi) {
      scoresToDelete.push({ type: 'cuối kỳ', id: group.scoreCuoiKi.id });
    }

    if (scoresToDelete.length === 0) {
      alert('Không có điểm nào để xóa');
      return;
    }

    const confirmMessage = scoresToDelete.length === 1
      ? `Bạn có chắc chắn muốn xóa điểm ${scoresToDelete[0].type}?`
      : `Bạn có chắc chắn muốn xóa tất cả điểm (${scoresToDelete.map(s => s.type).join(', ')})?`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log('=== DELETING ALL SCORES ===');
        console.log('Scores to delete:', scoresToDelete);

        // Xóa tất cả điểm đồng thời và đợi tất cả hoàn thành
        const deletePromises = scoresToDelete.map(({ id, type }) => {
          console.log(`Deleting ${type} score ID:`, id);
          return handleDelete(id);
        });

        await Promise.all(deletePromises);
        console.log('✅ All scores deleted successfully');

        // Đợi một chút để đảm bảo database đã cập nhật
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh danh sách điểm
        await fetchExamScores();

        alert('Xóa điểm thành công!');
      } catch (error) {
        console.error('❌ Error deleting scores:', error);
        alert('Có lỗi xảy ra khi xóa điểm số');
      }
    }
  };


  // Lấy danh sách học sinh theo lớp (subjectIdOverride: sau khi đổi môn, state có thể chưa kịp cập nhật)
  const fetchStudentsByClass = async (classId, subjectIdOverride = null) => {
    if (!classId) {
      setClassStudents([]);
      setClassScoreData({});
      return;
    }

    const subjectIdResolved = subjectIdOverride != null && subjectIdOverride !== ''
      ? subjectIdOverride
      : selectedSubjectForScore;

    try {
      let studentsInClass = [];

      try {
        const response = await api.get(`/classes/${classId}/students`);
        studentsInClass = response.data.students || [];
      } catch (apiError) {
        studentsInClass = [];
      }

      setClassStudents(studentsInClass);

      const classIdNum = parseInt(classId, 10);
      const initialScoreData = {};
      studentsInClass.forEach((student) => {
        const subjectId = subjectIdResolved ? parseInt(subjectIdResolved, 10) : null;
        let existingMieng = '', existing15P = '', existing1Tiet = '', existingCuoiKi = '';
        let noteMieng = '', note15P = '', note1Tiet = '', noteCuoiKi = '';

        if (subjectId) {
          const existingScores = examScores.filter((score) => {
            const scid = score.classEntity?.id ?? score.class_id;
            const sameClass = scid === classIdNum || parseInt(scid, 10) === classIdNum;
            return (
              score.student?.id === student.id &&
              score.subject?.id === subjectId &&
              sameClass
            );
          });

          const scoreMieng = existingScores.find((s) => {
            const st = (s.scoreType || s.score_type || '').toUpperCase();
            return st === 'MIENG';
          });
          const score15P = existingScores.find((s) => {
            const st = (s.scoreType || s.score_type || '15P').toUpperCase();
            return st === '15P';
          });
          const score1Tiet = existingScores.find((s) => {
            const st = (s.scoreType || s.score_type || '').toUpperCase();
            return st === '1TIET';
          });
          const scoreCuoiKi = existingScores.find((s) => {
            const st = (s.scoreType || s.score_type || '').toUpperCase();
            return st === 'CUOIKI';
          });

          existingMieng = scoreMieng?.score?.toString() || '';
          existing15P = score15P?.score?.toString() || '';
          existing1Tiet = score1Tiet?.score?.toString() || '';
          existingCuoiKi = scoreCuoiKi?.score?.toString() || '';
          noteMieng = scoreMieng?.note || '';
          note15P = score15P?.note || '';
          note1Tiet = score1Tiet?.note || '';
          noteCuoiKi = scoreCuoiKi?.note || '';
        }

        initialScoreData[student.id] = {
          scoreMieng: existingMieng,
          score15P: existing15P,
          score1Tiet: existing1Tiet,
          scoreCuoiKi: existingCuoiKi,
          noteMieng: noteMieng,
          note15P: note15P,
          note1Tiet: note1Tiet,
          noteCuoiKi: noteCuoiKi,
        };
      });
      setClassScoreData(initialScoreData);
    } catch (error) {
      console.error('Error fetching students by class:', error);
      setClassStudents([]);
      setClassScoreData({});
    }
  };

  /** Môn học theo TKB + học kỳ (cùng logic lọc như admin Xem điểm) */
  const loadSubjectsForTeacherClass = async (classId, semesterUi) => {
    if (!classId) {
      setFilteredSubjectsForClass([]);
      return;
    }
    try {
      const schedulesResponse = await api.get(`/schedules/class/${classId}`);
      const classSchedules = schedulesResponse.data.schedules || [];
      const selectedCls = classes.find((c) => String(c.id) === String(classId));
      const classSchoolYearName = selectedCls?.schoolYear?.name || selectedCls?.school_year?.name || '';
      const schedulesForSem = classSchedules.filter((sch) =>
        adminScheduleMatchesClassSemester(sch, semesterUi, classSchoolYearName)
      );

      const assignedSubjectIds = new Set();
      schedulesForSem.forEach((schedule) => {
        const sid = schedule.subject?.id || schedule.subject_id;
        if (sid) assignedSubjectIds.add(sid);
      });

      const userRole = user?.role?.name?.toUpperCase();
      const filteredSubjects = subjects.filter((subject) => {
        const subjectId = subject.id;
        const isAssignedToClass = assignedSubjectIds.has(subjectId);
        if (userRole === 'TEACHER' && user?.id) {
          const isTaughtByTeacher = schedulesForSem.some((schedule) => {
            const scheduleTeacherId = schedule.teacher?.id || schedule.teacher_id;
            const scheduleSubjectId = schedule.subject?.id || schedule.subject_id;
            return scheduleTeacherId === user.id && scheduleSubjectId === subjectId;
          });
          return isAssignedToClass && isTaughtByTeacher;
        }
        return isAssignedToClass;
      });

      setFilteredSubjectsForClass(filteredSubjects);
    } catch (error) {
      console.error('Error fetching schedules for class:', error);
      setFilteredSubjectsForClass(subjects);
    }
  };

  // Xử lý khi chọn lớp
  const handleClassSelect = async (classId) => {
    setSelectedClassForScore(classId);
    setSelectedSubjectForScore('');
    setFilteredSubjectsForClass([]);

    if (classId) {
      await loadSubjectsForTeacherClass(classId, teacherModalSemester);
    } else {
      setFilteredSubjectsForClass(subjects);
    }

    await fetchStudentsByClass(classId);
  };

  // Xử lý khi chọn môn học (reload danh sách học sinh với điểm hiện có)
  const handleSubjectSelectForClass = async (subjectId) => {
    setSelectedSubjectForScore(subjectId);
    if (selectedClassForScore) {
      await fetchStudentsByClass(selectedClassForScore, subjectId);
    }
  };

  useEffect(() => {
    if (!showClassModal || !selectedClassForScore) return;
    loadSubjectsForTeacherClass(selectedClassForScore, teacherModalSemester);
  }, [teacherModalSemester, showClassModal, selectedClassForScore]);

  useEffect(() => {
    if (!selectedSubjectForScore || !filteredSubjectsForClass.length) return;
    const ok = filteredSubjectsForClass.some((s) => String(s.id) === String(selectedSubjectForScore));
    if (!ok) setSelectedSubjectForScore('');
  }, [filteredSubjectsForClass, selectedSubjectForScore]);

  useEffect(() => {
    if (!showClassModal || !selectedClassForScore || !selectedSubjectForScore) {
      setTeacherTbmByStudentId({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/exam-scores/tbm-summary', {
          params: {
            classId: parseInt(selectedClassForScore, 10),
            subjectId: parseInt(selectedSubjectForScore, 10),
          },
        });
        const rows = res.data.rows || [];
        const m = {};
        rows.forEach((r) => {
          m[r.studentId] = r;
        });
        if (!cancelled) setTeacherTbmByStudentId(m);
      } catch {
        if (!cancelled) setTeacherTbmByStudentId({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showClassModal, selectedClassForScore, selectedSubjectForScore]);

  const handleEdit = async (group) => {
    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể chỉnh sửa điểm.');
      return;
    }

    const classId = group.classEntity?.id?.toString() || '';
    const subjectId = group.subject?.id?.toString() || '';

    setSelectedClassForScore(classId);
    setSelectedSubjectForScore(subjectId);
    setIsEditMode(true);

    let sem = '1';
    if (classId) {
      try {
        const schedulesResponse = await api.get(`/schedules/class/${classId}`);
        const classSchedules = schedulesResponse.data.schedules || [];
        const subNum = parseInt(subjectId, 10);
        const matchSch = classSchedules.find((s) => {
          const sid = s.subject?.id || s.subject_id;
          const tid = s.teacher?.id || s.teacher_id;
          return sid === subNum && user?.id && tid === user.id;
        });
        const code = matchSch?.classSection ? normalizeSemesterCode(matchSch.classSection.semester) : null;
        if (code) sem = code;
      } catch (_) {
        /* giữ HK1 */
      }
      setTeacherModalSemester(sem);
      await loadSubjectsForTeacherClass(classId, sem);
    }

    await fetchExamScores();
    await fetchStudentsByClass(classId, subjectId);
    setShowClassModal(true);
  };

  // Xử lý submit điểm theo lớp
  const handleClassScoreSubmit = async (e) => {
    e.preventDefault();

    if (isScoreLocked) {
      alert('Điểm số đã bị khóa. Không thể thêm hoặc chỉnh sửa điểm.');
      return;
    }

    if (!selectedClassForScore || !selectedSubjectForScore) {
      alert('Vui lòng chọn lớp và môn học');
      return;
    }

    // Lưu isEditMode vào biến local trước khi reset
    const currentEditMode = isEditMode;
    console.log('🔍 handleClassScoreSubmit - isEditMode:', isEditMode, 'currentEditMode:', currentEditMode);

    // Refresh examScores trước khi submit để đảm bảo có dữ liệu mới nhất
    console.log('🔄 Fetching fresh examScores before submit...');
    let freshExamScores = [];
    try {
      const response = await api.get('/exam-scores');
      let allScores = response.data.examScores || [];
      const userRole = user?.role?.name?.toUpperCase();
      const activeStudentId = localStorage.getItem('activeStudentId');

      // Lọc theo trường học
      if ((userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'STUDENT' || userRole === 'PARENT') && user?.school?.id) {
        allScores = allScores.filter(score => {
          const studentSchoolId = score.student?.school?.id || score.school?.id;
          return studentSchoolId === user.school.id;
        });
      }

      // Nếu là Học sinh hoặc Phụ huynh, lọc theo ID tương ứng
      if (userRole === 'STUDENT' && user?.id) {
        allScores = allScores.filter(score => score.student?.id === user.id);
      } else if (userRole === 'PARENT' && activeStudentId) {
        allScores = allScores.filter(score => String(score.student?.id) === String(activeStudentId));
      }

      // For teachers, only show scores for subjects they teach
      if (userRole === 'TEACHER' && user?.id) {
        try {
          const schedulesResponse = await api.get(`/schedules/teacher/${user.id}`);
          const teacherSchedules = schedulesResponse.data.schedules || [];
          const assignedSubjectIds = new Set();
          teacherSchedules.forEach(schedule => {
            const subjectId = schedule.subject?.id || schedule.subject_id;
            if (subjectId) {
              assignedSubjectIds.add(subjectId);
            }
          });
          allScores = allScores.filter(score => {
            const scoreSubjectId = score.subject?.id || score.subject_id;
            return assignedSubjectIds.has(scoreSubjectId);
          });
        } catch (scheduleError) {
          console.error('Error fetching teacher schedules:', scheduleError);
          allScores = [];
        }
      }

      freshExamScores = allScores;
      console.log('✅ Fresh examScores fetched, total:', freshExamScores.length);
    } catch (error) {
      console.error('Error fetching fresh examScores:', error);
      // Fallback to existing examScores state
      freshExamScores = examScores;
      console.log('⚠️ Using existing examScores state, total:', freshExamScores.length);
    }

    try {
      const classId = parseInt(selectedClassForScore);
      const subjectId = parseInt(selectedSubjectForScore);
      const promises = [];

      // Xử lý điểm cho từng học sinh
      Object.keys(classScoreData).forEach(studentId => {
        const studentData = classScoreData[studentId];
        const studentIdInt = parseInt(studentId);

        // Tìm điểm hiện có của học sinh này từ freshExamScores
        // Kiểm tra cả student.id và student_id, subject.id và subject_id
        const existingScores = freshExamScores.filter(score => {
          const scoreStudentId = score.student?.id || score.student_id;
          const scoreSubjectId = score.subject?.id || score.subject_id;
          const scoreClassId = score.classEntity?.id || score.class_id;

          // So sánh với parseInt để đảm bảo cùng kiểu dữ liệu
          const studentMatch = scoreStudentId === studentIdInt || parseInt(scoreStudentId) === studentIdInt;
          const subjectMatch = scoreSubjectId === subjectId || parseInt(scoreSubjectId) === subjectId;
          const classMatch = scoreClassId === classId || parseInt(scoreClassId) === classId;

          const match = studentMatch && subjectMatch && classMatch;

          if (match) {
            console.log(`✅ Found existing score:`, {
              id: score.id,
              studentId: scoreStudentId,
              subjectId: scoreSubjectId,
              classId: scoreClassId,
              scoreType: score.scoreType || score.score_type,
              score: score.score,
              matching: { student: studentMatch, subject: subjectMatch, class: classMatch }
            });
          } else {
            // Log để debug tại sao không match
            console.log(`❌ Score not matching:`, {
              id: score.id,
              scoreStudentId, studentIdInt, studentMatch,
              scoreSubjectId, subjectId, subjectMatch,
              scoreClassId, classId, classMatch
            });
          }
          return match;
        });

        console.log(`Student ${studentIdInt} - Total existing scores found:`, existingScores.length);
        if (existingScores.length > 0) {
          console.log(`✅ Found scores:`, existingScores.map(s => ({
            id: s.id,
            type: s.scoreType || s.score_type,
            score: s.score
          })));
        } else {
          console.log(`⚠️ No existing scores found for student ${studentIdInt}, subject ${subjectId}, class ${classId}`);
        }

        const existingMieng = existingScores.find((s) => {
          const st = (s.scoreType || s.score_type || '').toUpperCase();
          return st === 'MIENG';
        });
        const existing15P = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '15P').toUpperCase();
          return st === '15P';
        });
        const existing1Tiet = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '').toUpperCase();
          return st === '1TIET';
        });
        const existingCuoiKi = existingScores.find(s => {
          const st = (s.scoreType || s.score_type || '').toUpperCase();
          return st === 'CUOIKI';
        });

        // Điểm miệng (MIENG)
        const scoreMiengInput = studentData.scoreMieng ? studentData.scoreMieng.trim() : '';
        if (scoreMiengInput !== '') {
          const scoreMiengValue = parseFloat(scoreMiengInput);
          if (!isNaN(scoreMiengValue) && scoreMiengValue >= 0 && scoreMiengValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: scoreMiengValue,
              scoreType: 'MIENG',
              attempt: 1,
              note: studentData.noteMieng || ''
            };

            if (existingMieng) {
              promises.push(api.put(`/exam-scores/${existingMieng.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        }

        // Xử lý điểm 15p
        const score15PInput = studentData.score15P ? studentData.score15P.trim() : '';
        if (score15PInput !== '') {
          const score15PValue = parseFloat(score15PInput);
          if (!isNaN(score15PValue) && score15PValue >= 0 && score15PValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: score15PValue,
              scoreType: '15P',
              note: studentData.note15P || ''
            };

            if (existing15P) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - 15P: updating existing score ${existing15P.id} to ${score15PValue}`);
              promises.push(api.put(`/exam-scores/${existing15P.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing15P && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, có thể xóa điểm (tùy chọn)
          // Hoặc giữ nguyên điểm cũ (không làm gì)
          // Ở đây tôi sẽ giữ nguyên điểm cũ (không xóa)
        }

        // Xử lý điểm 1 tiết
        const score1TietInput = studentData.score1Tiet ? studentData.score1Tiet.trim() : '';
        if (score1TietInput !== '') {
          const score1TietValue = parseFloat(score1TietInput);
          if (!isNaN(score1TietValue) && score1TietValue >= 0 && score1TietValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: score1TietValue,
              scoreType: '1TIET',
              note: studentData.note1Tiet || ''
            };

            if (existing1Tiet) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - 1Tiet: updating existing score ${existing1Tiet.id} to ${score1TietValue}`);
              promises.push(api.put(`/exam-scores/${existing1Tiet.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existing1Tiet && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, giữ nguyên điểm cũ
        }

        // Xử lý điểm cuối kỳ
        const scoreCuoiKiInput = studentData.scoreCuoiKi ? studentData.scoreCuoiKi.trim() : '';
        if (scoreCuoiKiInput !== '') {
          const scoreCuoiKiValue = parseFloat(scoreCuoiKiInput);
          if (!isNaN(scoreCuoiKiValue) && scoreCuoiKiValue >= 0 && scoreCuoiKiValue <= 10) {
            const scoreData = {
              studentId: studentIdInt,
              subjectId: subjectId,
              classId: classId,
              score: scoreCuoiKiValue,
              scoreType: 'CUOIKI',
              note: studentData.noteCuoiKi || ''
            };

            if (existingCuoiKi) {
              // Ở chế độ sửa, luôn update nếu có giá trị trong form
              console.log(`Student ${studentId} - CuoiKi: updating existing score ${existingCuoiKi.id} to ${scoreCuoiKiValue}`);
              promises.push(api.put(`/exam-scores/${existingCuoiKi.id}`, scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            } else {
              // Tạo mới nếu chưa có
              promises.push(api.post('/exam-scores', scoreData, {
                headers: {
                  'X-User-Id': user?.id,
                  'X-User-Role': user?.role?.name
                }
              }));
            }
          }
        } else if (existingCuoiKi && isEditMode) {
          // Nếu ở chế độ sửa và input rỗng nhưng đã có điểm, giữ nguyên điểm cũ
        }
      });

      console.log('=== SUBMIT SCORES DEBUG ===');
      console.log('isEditMode (state):', isEditMode);
      console.log('currentEditMode (local):', currentEditMode);
      console.log('Total promises:', promises.length);
      console.log('classScoreData:', classScoreData);
      console.log('selectedClassForScore:', selectedClassForScore);
      console.log('selectedSubjectForScore:', selectedSubjectForScore);
      console.log('Total freshExamScores:', freshExamScores.length);
      console.log('freshExamScores for this subject:', freshExamScores.filter(s => {
        const sSubjectId = s.subject?.id || s.subject_id;
        return sSubjectId === parseInt(selectedSubjectForScore);
      }));
      console.log('freshExamScores for this class:', freshExamScores.filter(s => {
        const sClassId = s.classEntity?.id || s.class_id;
        return sClassId === parseInt(selectedClassForScore);
      }));

      if (promises.length === 0) {
        console.log('⚠️ No promises to execute');
        if (currentEditMode) {
          alert('Không có thay đổi nào để lưu. Vui lòng thay đổi điểm trước khi lưu.');
        } else {
          alert('Vui lòng nhập ít nhất một điểm');
        }
        return;
      }

      console.log('✅ Executing', promises.length, 'promises');

      try {
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchExamScores();

        // Lưu lớp đã chọn để filter hiển thị (cho Teacher)
        const userRole = user?.role?.name?.toUpperCase();
        if (userRole === 'TEACHER') {
          setDisplayFilterClassId(selectedClassForScore);
        }

        // Reset form
        setSelectedClassForScore('');
        setSelectedSubjectForScore('');
        setClassStudents([]);
        setClassScoreData({});
        setIsEditMode(false);
        setTeacherModalSemester('1');
        setShowClassModal(false);

        alert(currentEditMode ? 'Sửa điểm thành công!' : 'Nhập điểm theo lớp thành công!');
      } catch (submitError) {
        console.error('Error submitting scores:', submitError);
        const msg =
          submitError?.response?.data?.error ||
          submitError?.response?.data?.message ||
          submitError?.message ||
          'Có lỗi xảy ra khi lưu điểm số. Vui lòng thử lại.';
        alert(msg);
      }
    } catch (error) {
      console.error('Error saving class scores:', error);
      alert('Có lỗi xảy ra khi lưu điểm số');
    }
  };

  const getScoreTypeLabel = (scoreType) => {
    switch (scoreType) {
      case 'MIENG':
        return 'Miệng';
      case '15P':
        return '15 phút';
      case '1TIET':
        return '1 tiết';
      case 'CUOIKI':
        return 'Cuối kì';
      default:
        return scoreType || '15 phút';
    }
  };

  const outerSubjectsForFilter = useMemo(() => {
    if (user?.role?.name?.toUpperCase() !== 'TEACHER') return [];

    const sourceScores = displayFilterClassId
      ? examScores.filter((score) => {
          const scoreClassId = score.classEntity?.id || score.class_id;
          return scoreClassId && String(scoreClassId) === String(displayFilterClassId);
        })
      : examScores;

    const map = new Map();
    sourceScores.forEach((score) => {
      const subject = score.subject;
      if (subject?.id && !map.has(subject.id)) {
        map.set(subject.id, { id: subject.id, name: subject.name || `Môn #${subject.id}` });
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  }, [examScores, displayFilterClassId, user]);

  // Nhóm điểm theo học sinh và môn học
  const groupScoresByStudentAndSubject = () => {
    const grouped = {};
    const userRole = user?.role?.name?.toUpperCase();

    // Filter scores theo lớp/môn đã chọn nếu là Teacher
    let filteredScores = examScores;
    if (userRole === 'TEACHER') {
      filteredScores = examScores.filter((score) => {
        const scoreClassId = score.classEntity?.id || score.class_id;
        const scoreSubjectId = score.subject?.id || score.subject_id;

        const matchClass = !displayFilterClassId || (scoreClassId && String(scoreClassId) === String(displayFilterClassId));
        const matchSubject = !displayFilterSubjectId || (scoreSubjectId && String(scoreSubjectId) === String(displayFilterSubjectId));

        return matchClass && matchSubject;
      });
    }

    filteredScores.forEach(score => {
      const studentId = score.student?.id;
      const subjectId = score.subject?.id;
      const key = `${studentId}-${subjectId}`;

      if (!grouped[key]) {
        grouped[key] = {
          student: score.student,
          subject: score.subject,
          classEntity: score.classEntity,
          scoreMieng: null,
          score15P: null,
          score1Tiet: null,
          scoreCuoiKi: null,
          allScores: []
        };
      }

      grouped[key].allScores.push(score);

      const scoreType = (score.scoreType || score.score_type || '15P').toUpperCase();

      if (scoreType === 'MIENG') {
        if (grouped[key].scoreMieng === null) {
          grouped[key].scoreMieng = score;
        }
      } else if (scoreType === '15P') {
        if (grouped[key].score15P === null) {
          grouped[key].score15P = score;
        }
      } else if (scoreType === '1TIET') {
        grouped[key].score1Tiet = score;
      } else if (scoreType === 'CUOIKI') {
        grouped[key].scoreCuoiKi = score;
      }
    });

    return Object.values(grouped);
  };

  const scoreGroups = useMemo(() => groupScoresByStudentAndSubject(), [examScores, displayFilterClassId, displayFilterSubjectId, user]);

  useEffect(() => {
    const role = user?.role?.name?.toUpperCase();
    if (role === 'ADMIN' || (role && role.startsWith('ADMIN'))) {
      setOuterTbmByPair({});
      return;
    }
    const seen = new Set();
    const pairs = [];
    scoreGroups.forEach((g) => {
      const cid = g.classEntity?.id ?? g.class_id;
      const sid = g.subject?.id;
      if (cid == null || sid == null) return;
      const key = `${cid}-${sid}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ classId: cid, subjectId: sid });
    });
    if (pairs.length === 0) {
      setOuterTbmByPair({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      await Promise.all(
        pairs.map(async ({ classId, subjectId }) => {
          const key = `${classId}-${subjectId}`;
          try {
            const res = await api.get('/exam-scores/tbm-summary', {
              params: { classId, subjectId },
            });
            const rows = res.data.rows || [];
            const m = {};
            rows.forEach((r) => {
              m[r.studentId] = r;
            });
            next[key] = m;
          } catch {
            next[key] = {};
          }
        })
      );
      if (!cancelled) setOuterTbmByPair(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [scoreGroups, user]);

  const renderOuterScoreCell = (val) => {
    if (val == null || Number.isNaN(Number(val))) {
      return <span className="text-slate-400">—</span>;
    }
    const n = Number(val);
    return <span className={`es-score-pill ${scoreCellClass(n)}`}>{n.toFixed(1)}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu điểm số...</p>
          </div>
        </div>
      </div>
    );
  }

  const userRole = user?.role?.name?.toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isParent = userRole === 'PARENT';
  const isAdmin = userRole === 'ADMIN' || (userRole && userRole.startsWith('ADMIN'));
  const isViewOnly = isStudent || isParent;

  const handleToggleLock = async () => {
    const userRole = user?.role?.name?.toUpperCase();
    const schoolId = user?.school?.id;

    // Only admin can lock/unlock scores
    if (userRole !== 'ADMIN' || !schoolId) {
      alert('Chỉ admin mới có quyền khóa/mở khóa điểm số');
      return;
    }

    const newLockStatus = !isScoreLocked;
    const confirmMessage = newLockStatus
      ? 'Bạn có chắc chắn muốn khóa điểm số? Điều này sẽ ngăn chỉnh sửa và thêm điểm mới cho tất cả giáo viên.'
      : 'Bạn có chắc chắn muốn mở khóa điểm số? Điều này sẽ cho phép chỉnh sửa và thêm điểm mới.';

    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.put(`/exam-scores/lock-status/${schoolId}`, {
          scoreLocked: newLockStatus
        });

        setIsScoreLocked(newLockStatus);
        alert(newLockStatus ? 'Đã khóa điểm số thành công' : 'Đã mở khóa điểm số thành công');
      } catch (error) {
        console.error('Error updating score lock status:', error);
        alert('Có lỗi xảy ra khi cập nhật trạng thái khóa điểm số');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className={`mx-auto space-y-4 ${isAdmin || !isStudent ? 'max-w-[96rem]' : 'max-w-6xl'}`}>
      <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 flex flex-wrap items-center justify-between gap-3">
        {!isAdmin && !isParent && (
          <h2 className="text-2xl font-bold text-slate-800">
            {isStudent ? 'Xem điểm và nhận xét' : 'Quản lý điểm số'}
          </h2>
        )}
        {isParent && <h2 className="text-2xl font-bold text-slate-800">Bảng điểm của con</h2>}
        {isAdmin && <span className="text-lg font-semibold text-slate-700">Điểm số</span>}
        <div className="header-actions">
          {isAdmin && (
            <button
              className={`btn ${isScoreLocked ? 'btn-unlock' : 'btn-lock'}`}
              onClick={handleToggleLock}
            >
              {isScoreLocked ? '🔓 Mở khóa điểm số' : '🔒 Khóa điểm số'}
            </button>
          )}
          {isScoreLocked && (
            <span className="lock-notice" style={{
              color: '#ff9800',
              fontWeight: 'bold',
              padding: '8px 12px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              ⚠️ Điểm số đã bị khóa
            </span>
          )}
          {/* Ẩn nút Nhập điểm đối với Phụ huynh và Học sinh */}
          {!isViewOnly && !isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (isScoreLocked) {
                  alert('Điểm số đã bị khóa. Không thể thêm điểm mới.');
                  return;
                }
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setFilteredSubjectsForClass([]);
                setIsEditMode(false);
                setTeacherModalSemester('1');
                setShowClassModal(true);
              }}
              disabled={isScoreLocked}
            >
              📋 Nhập điểm
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <AdminXemDiemSection classes={classes} subjects={subjects} user={user} />
      )}

      {/* Filter lớp cho Teacher + Import Excel */}
      {!isAdmin && userRole === 'TEACHER' && (
        <>
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Lọc theo lớp:</span>
              <select
                value={displayFilterClassId}
                onChange={(e) => {
                  setDisplayFilterClassId(e.target.value);
                  setDisplayFilterSubjectId('');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="">-- Tất cả các lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Lọc theo môn:</span>
              <select
                value={displayFilterSubjectId}
                onChange={(e) => setDisplayFilterSubjectId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
                disabled={!outerSubjectsForFilter || outerSubjectsForFilter.length === 0}
              >
                <option value="">-- Tất cả các môn --</option>
                {(outerSubjectsForFilter || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {(displayFilterClassId || displayFilterSubjectId) && (
              <button
                onClick={() => {
                  setDisplayFilterClassId('');
                  setDisplayFilterSubjectId('');
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="exam-import-panel" style={{ marginBottom: '20px' }}>
            <div className="exam-import-panel__left">
              <div className="exam-import-panel__title">Nhập điểm từ file Excel</div>
              <div className="exam-import-panel__hint">
                Hỗ trợ file .xlsx, .xls với các cột: email, class, subject, mieng, 15p, 1tiet, cuoiki
              </div>
            </div>

            <div className="exam-import-panel__right">
              <label className="exam-import-upload">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setTeacherImportFile(e.target.files?.[0] || null)}
                  className="exam-import-upload__input"
                  disabled={teacherImporting}
                />
                <span className="exam-import-upload__button">Chọn file</span>
                <span className="exam-import-upload__name">
                  {teacherImportFile ? teacherImportFile.name : 'Chưa chọn file'}
                </span>
              </label>

              {teacherImportFile && (
                <button
                  type="button"
                  className="exam-import-clear-btn"
                  onClick={() => setTeacherImportFile(null)}
                  disabled={teacherImporting}
                >
                  Bỏ chọn
                </button>
              )}

              <button
                type="button"
                className="exam-import-submit-btn"
                onClick={handleTeacherImport}
                disabled={!teacherImportFile || teacherImporting}
              >
                {teacherImporting ? 'Đang import...' : 'Import'}
              </button>
              <a
                href="/MauFileNhapdiem.xlsx"
                download
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                ⬇ Tải file mẫu
              </a>
            </div>
          </div>
        </>
      )}

      {/* Bảng điểm — GV/HS: cùng kiểu bảng admin (header 2 cấp, es-score-pill, TBM từ API) */}
      {isAdmin ? null : (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {scoreGroups.length === 0 ? (
          <div className="px-4 py-16 text-center text-slate-500">
            <p className="text-lg">Chưa có điểm số nào</p>
          </div>
        ) : (
          <>
            {!isViewOnly && !isAdmin && (
              <div className="flex flex-wrap gap-6 border-b border-blue-100 bg-blue-50/50 px-4 py-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={teacherOuterShowOral}
                    onChange={(e) => setTeacherOuterShowOral(e.target.checked)}
                    className="rounded border-blue-400 text-blue-600"
                  />
                  Điểm miệng
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={teacherOuterShow15}
                    onChange={(e) => setTeacherOuterShow15(e.target.checked)}
                    className="rounded border-blue-400 text-blue-600"
                  />
                  Điểm 15 phút
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={teacherOuterShow1T}
                    onChange={(e) => setTeacherOuterShow1T(e.target.checked)}
                    className="rounded border-blue-400 text-blue-600"
                  />
                  Điểm 1 tiết
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={teacherOuterShowCk}
                    onChange={(e) => setTeacherOuterShowCk(e.target.checked)}
                    className="rounded border-blue-400 text-blue-600"
                  />
                  Điểm cuối kỳ
                </label>
              </div>
            )}
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-slate-700">Tóm điểm</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-grade-table min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2">
                      STT
                    </th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-left min-w-[140px]">
                      Học sinh
                    </th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-left min-w-[100px]">
                      Môn học
                    </th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-left min-w-[80px]">
                      Lớp
                    </th>
                    {(isViewOnly || teacherOuterShowOral) && (
                      <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                        Điểm miệng
                      </th>
                    )}
                    {(isViewOnly || teacherOuterShow15) && (
                      <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                        Điểm 15 phút
                      </th>
                    )}
                    {(isViewOnly || teacherOuterShow1T) && (
                      <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                        Điểm 1 tiết
                      </th>
                    )}
                    {(isViewOnly || teacherOuterShowCk) && (
                      <th colSpan={1} className="border border-slate-200 px-2 py-2 text-center bg-sky-50">
                        Điểm cuối kỳ
                      </th>
                    )}
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center bg-emerald-50">
                      TBM
                    </th>
                    {!isViewOnly && !isAdmin && (
                      <th rowSpan={2} className="border border-slate-200 px-2 py-2 text-center">
                        Thao tác
                      </th>
                    )}
                  </tr>
                  <tr className="bg-white text-[11px] text-slate-600">
                    {(isViewOnly || teacherOuterShowOral) && (
                      <th className="border border-slate-200 px-1 py-1">Miệng 1</th>
                    )}
                    {(isViewOnly || teacherOuterShow15) && (
                      <th className="border border-slate-200 px-1 py-1">15P-1</th>
                    )}
                    {(isViewOnly || teacherOuterShow1T) && (
                      <th className="border border-slate-200 px-1 py-1">1T-1</th>
                    )}
                    {(isViewOnly || teacherOuterShowCk) && (
                      <th className="border border-slate-200 px-1 py-1">CK-1</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {scoreGroups.map((group, index) => {
                    const scoreMieng = group.scoreMieng?.score;
                    const score15P = group.score15P?.score;
                    const score1Tiet = group.score1Tiet?.score;
                    const scoreCuoiKi = group.scoreCuoiKi?.score;
                    const cid = group.classEntity?.id ?? group.class_id;
                    const sid = group.subject?.id;
                    const pairKey = cid != null && sid != null ? `${cid}-${sid}` : '';
                    const tbmVal =
                      pairKey && group.student?.id != null
                        ? outerTbmByPair[pairKey]?.[group.student.id]?.tbm
                        : null;

                    return (
                      <tr
                        key={`${group.student?.id}-${group.subject?.id}-${cid ?? ''}`}
                        className="odd:bg-white even:bg-slate-50/80 hover:bg-amber-50/30"
                      >
                        <td className="border border-slate-200 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border border-slate-200 px-2 py-2 font-medium text-slate-800">
                          <div className="flex flex-col">
                            <span>{group.student?.fullName}</span>
                            <span className="text-xs font-normal text-slate-500">{group.student?.email}</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 px-2 py-2">{group.subject?.name}</td>
                        <td className="border border-slate-200 px-2 py-2">{group.classEntity?.name}</td>
                        {(isViewOnly || teacherOuterShowOral) && (
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {renderOuterScoreCell(scoreMieng)}
                          </td>
                        )}
                        {(isViewOnly || teacherOuterShow15) && (
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {renderOuterScoreCell(score15P)}
                          </td>
                        )}
                        {(isViewOnly || teacherOuterShow1T) && (
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {renderOuterScoreCell(score1Tiet)}
                          </td>
                        )}
                        {(isViewOnly || teacherOuterShowCk) && (
                          <td className="border border-slate-200 px-1 py-1 text-center">
                            {renderOuterScoreCell(scoreCuoiKi)}
                          </td>
                        )}
                        <td className="border border-slate-200 px-1 py-1 text-center font-semibold">
                          {renderOuterScoreCell(tbmVal)}
                        </td>
                        {!isViewOnly && !isAdmin && (
                          <td className="border border-slate-200 px-2 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-200 disabled:opacity-60"
                                onClick={() => handleEdit(group)}
                                disabled={isScoreLocked}
                                title={isScoreLocked ? 'Điểm số đã bị khóa' : 'Sửa điểm'}
                                aria-label="Sửa điểm"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                                onClick={() => handleDeleteAll(group)}
                                disabled={isScoreLocked}
                                title={isScoreLocked ? 'Điểm số đã bị khóa' : 'Xóa tất cả điểm'}
                                aria-label="Xóa điểm"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-60"
                                onClick={() => runAiStudentInsight(group.student)}
                                disabled={aiStudentLoading}
                                title="AI phân tích theo học sinh (gửi PH nếu có môn < 5)"
                                aria-label="AI phân tích học sinh"
                              >
                                AI
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      )}
      </div>


      {/* Modal nhập điểm theo lớp */}
      {showClassModal && !isStudent && !isAdmin && (
        <div className="common-modal-overlay" onClick={() => {
          setShowClassModal(false);
          setSelectedClassForScore('');
          setSelectedSubjectForScore('');
          setClassStudents([]);
          setClassScoreData({});
          setIsEditMode(false);
          setTeacherModalSemester('1');
        }}>
          <div className="common-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="common-modal-header">
              <h3>{isEditMode ? 'Sửa điểm theo lớp' : 'Nhập điểm theo lớp'}</h3>
              <button className="common-close-btn" onClick={() => {
                setShowClassModal(false);
                setSelectedClassForScore('');
                setSelectedSubjectForScore('');
                setClassStudents([]);
                setClassScoreData({});
                setIsEditMode(false);
                setTeacherModalSemester('1');
              }}>✕</button>
            </div>
            <form onSubmit={handleClassScoreSubmit} className="common-modal-form">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="common-form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Lớp *</label>
                  <select
                    value={selectedClassForScore}
                    onChange={(e) => handleClassSelect(e.target.value)}
                    required
                  >
                    <option value="">Chọn lớp</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="common-form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label>Học kỳ *</label>
                  <select
                    value={teacherModalSemester}
                    onChange={(e) => {
                      setTeacherModalSemester(e.target.value);
                      setSelectedSubjectForScore('');
                    }}
                    disabled={!selectedClassForScore}
                  >
                    {ADMIN_VIEW_SEMESTERS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="common-form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Môn học *</label>
                  <select
                    value={selectedSubjectForScore}
                    onChange={(e) => handleSubjectSelectForClass(e.target.value)}
                    required
                    disabled={!selectedClassForScore}
                  >
                    <option value="">
                      {selectedClassForScore ? 'Chọn môn học' : 'Chọn lớp trước'}
                    </option>
                    {(selectedClassForScore ? filteredSubjectsForClass : subjects).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {selectedClassForScore && filteredSubjectsForClass.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      Không có môn nào trong TKB cho học kỳ và lớp đã chọn (hoặc bạn không phụ trách).
                    </p>
                  )}
                </div>
              </div>

              {selectedClassForScore && (
                <div style={{ marginTop: '20px' }}>
                  {(() => {
                    const subjectId = selectedSubjectForScore ? parseInt(selectedSubjectForScore) : null;
                    const modalClassIdNum = selectedClassForScore ? parseInt(selectedClassForScore, 10) : null;

                    const scoresMatchModalClass = (score) => {
                      if (modalClassIdNum == null || Number.isNaN(modalClassIdNum)) return true;
                      const scid = score.classEntity?.id ?? score.class_id;
                      return scid === modalClassIdNum || parseInt(scid, 10) === modalClassIdNum;
                    };

                    // Nếu ở chế độ nhập mới, chỉ hiển thị học sinh chưa có điểm
                    // Nếu ở chế độ sửa, hiển thị tất cả học sinh (cho phép sửa cả học sinh đã có điểm)
                    let studentsToShow = classStudents;
                    if (!isEditMode) {
                      studentsToShow = classStudents.filter((student) => {
                        if (!subjectId) return true;
                        const existingScores = examScores.filter(
                          (score) =>
                            score.student?.id === student.id &&
                            score.subject?.id === subjectId &&
                            scoresMatchModalClass(score)
                        );
                        return existingScores.length === 0;
                      });
                    }

                    const studentHasScore = (studentId) => {
                      if (!subjectId) return false;
                      const existingScores = examScores.filter(
                        (score) =>
                          score.student?.id === studentId &&
                          score.subject?.id === subjectId &&
                          scoresMatchModalClass(score)
                      );
                      return existingScores.length > 0;
                    };

                    return studentsToShow.length > 0 ? (
                      <>
                        <h4 style={{ marginBottom: '15px', color: '#333' }}>
                          {isEditMode ? (
                            <>Danh sách học sinh ({studentsToShow.length}/{classStudents.length} học sinh)</>
                          ) : (
                            <>Danh sách học sinh cần nhập điểm ({studentsToShow.length}/{classStudents.length} học sinh)</>
                          )}
                        </h4>
                        {!isEditMode && studentsToShow.length < classStudents.length && (
                          <p style={{ color: '#28a745', marginBottom: '15px', fontSize: '14px', fontWeight: '500' }}>
                            ✅ {classStudents.length - studentsToShow.length} học sinh đã có điểm và đã được ẩn
                          </p>
                        )}
                        {!selectedSubjectForScore && (
                          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                            ⚠️ Vui lòng chọn môn học để nhập điểm
                          </p>
                        )}
                        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                              <tr>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>STT</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#f8f9fa' }}>Học sinh</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Miệng</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm 15p</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm 1 tiết</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>Điểm cuối kỳ</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#e8f5e9', fontSize: '12px' }} title="TBM do hệ thống tính từ API">TBM</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsToShow.map((student, index) => {
                                const hasScore = studentHasScore(student.id);
                                const tbmRow = teacherTbmByStudentId[student.id];
                                const tbmVal = tbmRow != null ? tbmRow.tbm : null;

                                return (
                                  <tr key={student.id}>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <div>
                                        <div style={{ fontWeight: '500' }}>
                                          {student.fullName}
                                          {hasScore && <span style={{ color: '#28a745', marginLeft: '8px', fontSize: '12px' }}>(Đã có điểm)</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{student.email}</div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.scoreMieng || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              scoreMieng: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.score15P || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              score15P: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.score1Tiet || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              score1Tiet: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={classScoreData[student.id]?.scoreCuoiKi || ''}
                                        onChange={(e) => {
                                          setClassScoreData({
                                            ...classScoreData,
                                            [student.id]: {
                                              ...classScoreData[student.id],
                                              scoreCuoiKi: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="0-10"
                                        style={{
                                          width: '80px',
                                          padding: '5px',
                                          textAlign: 'center'
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f9fff9' }}>
                                      {tbmVal != null && !Number.isNaN(Number(tbmVal)) ? (
                                        <span className={`es-score-pill ${scoreCellClass(Number(tbmVal))}`}>
                                          {Number(tbmVal).toFixed(1)}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#999' }}>—</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        {selectedSubjectForScore ? (
                          classStudents.length > 0 ? (
                            <div>
                              <p style={{ fontSize: '16px', fontWeight: '500', color: '#28a745', marginBottom: '10px' }}>
                                ✅ Tất cả học sinh đã có điểm cho môn học này
                              </p>
                              <p style={{ fontSize: '14px', color: '#666' }}>
                                Tất cả {classStudents.length} học sinh trong lớp đã được nhập điểm.
                                Không còn học sinh nào cần nhập điểm.
                              </p>
                            </div>
                          ) : (
                            <p>Không có học sinh nào trong lớp này</p>
                          )
                        ) : (
                          <p>Vui lòng chọn môn học để hiển thị danh sách học sinh</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!selectedClassForScore && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Vui lòng chọn lớp để hiển thị danh sách học sinh
                </div>
              )}

              <div className="common-modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowClassModal(false);
                    setSelectedClassForScore('');
                    setSelectedSubjectForScore('');
                    setClassStudents([]);
                    setClassScoreData({});
                    setFilteredSubjectsForClass([]);
                    setTeacherModalSemester('1');
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={(() => {
                    // Nếu không có lớp hoặc môn học được chọn → disable
                    if (!selectedClassForScore || !selectedSubjectForScore) return true;

                    // Ở chế độ sửa, luôn enable (vì mục đích là sửa điểm đã có)
                    if (isEditMode) return false;

                    const subjectId = parseInt(selectedSubjectForScore, 10);
                    const cid = parseInt(selectedClassForScore, 10);
                    const studentsWithoutScores = classStudents.filter((student) => {
                      const existingScores = examScores.filter((score) => {
                        const scid = score.classEntity?.id ?? score.class_id;
                        const sameClass = scid === cid || parseInt(scid, 10) === cid;
                        return (
                          score.student?.id === student.id &&
                          score.subject?.id === subjectId &&
                          sameClass
                        );
                      });
                      return existingScores.length === 0;
                    });
                    return studentsWithoutScores.length === 0;
                  })()}
                >
                  Lưu điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AI phân tích theo học sinh (Teacher) */}
      {aiStudentModal && (
        <div
          className="common-modal-overlay"
          onClick={() => {
            if (aiStudentLoading) return;
            setAiStudentModal(null);
            setAiStudentError('');
            setAiStudentResult(null);
          }}
        >
          <div
            className="common-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px', width: '92%' }}
          >
            <div className="common-modal-header">
              <h3>AI phân tích học sinh</h3>
              <button
                className="common-close-btn"
                onClick={() => {
                  if (aiStudentLoading) return;
                  setAiStudentModal(null);
                  setAiStudentError('');
                  setAiStudentResult(null);
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <strong>{aiStudentModal.fullName || `Học sinh #${aiStudentModal.studentId}`}</strong>
                {aiStudentModal.email ? (
                  <span style={{ color: '#64748b' }}> — {aiStudentModal.email}</span>
                ) : null}
              </div>

              {aiStudentLoading && <div style={{ color: '#334155' }}>Đang phân tích...</div>}

              {aiStudentError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: 10,
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <strong>Lỗi:</strong> {aiStudentError}
                </div>
              )}

              {aiStudentResult?.analysis ? (
                <>
                  {(() => {
                    const analysis = aiStudentResult.analysis || {};
                    const source = analysis.source || aiStudentResult.source;
                    if (!source) return null;
                    const aiSuccess = analysis.aiSuccess ?? aiStudentResult.aiSuccess;
                    const aiError = analysis.aiError || aiStudentResult.aiError;
                    const label = source === 'GEMINI' ? 'Gemini' : 'Hệ thống / dự phòng';
                    const reason = aiSuccess === false && aiError ? ` (${aiError})` : '';
                    return (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                        Nguồn phần mềm: <strong style={{ color: '#0f172a' }}>{label}</strong>{reason}
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      padding: '0.75rem',
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: 12,
                      whiteSpace: 'pre-line',
                      color: '#312e81',
                      maxHeight: 320,
                      overflow: 'auto',
                    }}
                  >
                    {(() => {
                      const a = aiStudentResult.analysis || {};
                      // Backward/forward compatibility: if BE ever returns raw text at analysis.analysis
                      const raw = a.analysis;
                      if (typeof raw === 'string' && raw.trim()) return raw;

                      const summary = a.summary || aiStudentResult.summary || '';
                      const under = a.underAverageSubjects || aiStudentResult.underAverageSubjects || [];
                      const trend = a.trend || aiStudentResult.trend || '';
                      const rec = a.recommendations || aiStudentResult.recommendations || [];
                      const risk = a.riskLevel || aiStudentResult.riskLevel || '';

                      const lines = [];
                      if (summary) lines.push(`Tóm tắt:\n${summary}`);
                      if (under && under.length) lines.push(`\nMôn dưới trung bình:\n${under.join(', ')}`);
                      if (trend) lines.push(`\nXu hướng:\n${trend}`);
                      if (rec && rec.length) lines.push(`\nKhuyến nghị:\n${rec.slice(0, 3).map((x) => `- ${x}`).join('\n')}`);
                      if (risk) lines.push(`\nMức rủi ro:\n${risk}`);
                      return lines.join('\n').trim() || 'Không có nội dung phân tích.';
                    })()}
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                    {aiStudentResult.hasUnderAverage ? (
                      <div>
                        Đã phát hiện môn dưới trung bình. Thông báo phụ huynh: <strong>{aiStudentResult.notifiedParentCount ?? 0}</strong>.
                      </div>
                    ) : (
                      <div>Không có môn dưới trung bình nên không gửi thông báo phụ huynh.</div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamScoreManagement;
