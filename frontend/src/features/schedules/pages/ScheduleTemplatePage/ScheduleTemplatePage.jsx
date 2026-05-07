import React, { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import { toast } from 'react-toastify';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import { formatTimeRange, TIMELINE_AFTERNOON, TIMELINE_MORNING } from '../ScheduleListPage/schoolScheduleTimeline';
import { colorsForSubject } from '../ScheduleListPage/subjectColors';
import './ScheduleTemplatePage.css';

const lessonRows = [...TIMELINE_MORNING, ...TIMELINE_AFTERNOON].filter((r) => r.type === 'lesson' && r.period);
const periodTimeMap = lessonRows.reduce((acc, row) => {
  acc[row.period] = { startMin: row.startMin, endMin: row.endMin };
  return acc;
}, {});
const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);
const DAYS = [1, 2, 3, 4, 5, 6];
const FIXED_ACTIVITY_LABELS = {
  CHAOCO: 'Chào cờ',
  SHL: 'Sinh hoạt lớp',
};

const fmtDate = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const normalizeToMonday = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
};
const toIso = (dateStr, minutes) => {
  const d = new Date(dateStr);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
};
const toDayOfWeek = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day;
};
const parseSchoolYearStart = (schoolYearName) => {
  if (!schoolYearName) return -1;
  const m = String(schoolYearName).match(/(\d{4})/);
  return m ? Number(m[1]) : -1;
};
const isConsecutive = (arr) => {
  if (!arr.length) return false;
  const sorted = [...arr].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
};
const computeGenerateStartMonday = () => {
  const today = new Date();
  const day = today.getDay();
  const currentMonday = new Date(today);
  const diff = day === 0 ? -6 : 1 - day;
  currentMonday.setDate(today.getDate() + diff);
  currentMonday.setHours(0, 0, 0, 0);
  if (day === 1) return fmtDate(currentMonday);
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);
  return fmtDate(nextMonday);
};
const buildTemplateMapFromSchedules = (scheduleList, mondayStr) => {
  const start = new Date(mondayStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  const next = {};
  (scheduleList || []).forEach((s) => {
    if (!s?.date || !s?.period) return;
    const date = String(s.date).slice(0, 10);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < start || d > end) return;
    const dayOfWeek = toDayOfWeek(date);
    const period = Number(s.period);
    if (dayOfWeek < 1 || dayOfWeek > 6 || period < 1 || period > 10) return;
    next[`${dayOfWeek}-${period}`] = {
      dayOfWeek,
      period,
      date,
      subjectId: s.subject?.id ?? s.subject_id ?? null,
      teacherId: s.teacher?.id ?? s.teacher_id ?? null,
      teacherName: s.teacher?.fullName || '',
      room: s.room || '',
      fixedActivityCode: s.fixedActivityCode || s.fixed_activity_code || null,
    };
  });
  return next;
};
const buildTemplateMapFromTemplateSlots = (slotList) => {
  const next = {};
  (slotList || []).forEach((s) => {
    const dayOfWeek = Number(s.dayOfWeek);
    const period = Number(s.period);
    const date = String(s.date || '').slice(0, 10);
    if (!dayOfWeek || !period || !date) return;
    next[`${dayOfWeek}-${period}`] = {
      dayOfWeek,
      period,
      date,
      subjectId: s.subjectId ?? null,
      teacherId: s.teacherId ?? null,
      teacherName: s.teacherName || '',
      room: s.room || '',
      fixedActivityCode: s.fixedActivityCode || null,
    };
  });
  return next;
};

const ScheduleTemplatePage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [teachersForPopupSubject, setTeachersForPopupSubject] = useState([]);
  const [loadingTeachersForPopup, setLoadingTeachersForPopup] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [weekStart, setWeekStart] = useState(() => normalizeToMonday(fmtDate(new Date())));
  const [classSchedules, setClassSchedules] = useState([]);
  const [templateMap, setTemplateMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState('timeGridWeek');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateData, setGenerateData] = useState({
    classId: '',
    subjectAssignments: [],
    numberOfWeeks: 1,
    session: 'BOTH',
  });
  const [generateClassSections, setGenerateClassSections] = useState([]);
  const [loadingGenerateClassSections, setLoadingGenerateClassSections] = useState(false);
  const [prefillTemplateFromGeneratedSchedules, setPrefillTemplateFromGeneratedSchedules] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [popup, setPopup] = useState({
    dayOfWeek: 1,
    subjectId: '',
    teacherId: '',
    room: '',
    periods: [],
  });

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );
  const userRole = user?.role?.name?.toUpperCase();
  const canManage = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const schoolId = user?.school?.id;
        const [classesRes, subjectsRes] = await Promise.all([
          api.get('/classes'),
          schoolId ? api.get(`/subjects/school/${schoolId}`) : api.get('/subjects'),
        ]);
        let classList = classesRes.data?.classes || [];
        if (schoolId) {
          classList = classList.filter((c) => (c?.school?.id ?? c?.school_id) === schoolId);
        }
        const maxStartYear = classList.reduce((max, c) => {
          const y = parseSchoolYearStart(c?.schoolYear?.name);
          return y > max ? y : max;
        }, -1);
        const newest = classList.filter((c) => parseSchoolYearStart(c?.schoolYear?.name) === maxStartYear);
        newest.sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'vi'));
        setClasses(newest);
        let subjectList = subjectsRes.data?.subjects || [];
        if (schoolId) {
          subjectList = subjectList.filter((s) => (s?.school?.id ?? s?.school_id) === schoolId);
        }
        setSubjects(subjectList);
        if (newest.length) setSelectedClassId(String(newest[0].id));
      } catch (e) {
        console.error(e);
        toast.error('Không tải được dữ liệu lớp/môn.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.school?.id]);

  useEffect(() => {
    if (!selectedClassId) return;
    const run = async () => {
      try {
        const monday = normalizeToMonday(weekStart);
        if (monday !== weekStart) setWeekStart(monday);
        const [schRes, tplRes] = await Promise.all([
          api.get(`/schedules/class/${selectedClassId}`),
          api.get(`/schedules/template/class/${selectedClassId}?weekStart=${monday}`).catch(() => ({ data: { templates: [] } })),
        ]);
        const schedulesForClass = schRes.data?.schedules || [];
        setClassSchedules(schedulesForClass);
        try {
          const csRes = await api.get(`/class-sections/class/${selectedClassId}`);
          setClassSections(csRes.data?.classSections || []);
        } catch (_) {
          setClassSections([]);
        }
        const map = {};
        (tplRes.data?.templates || []).forEach((t) => {
          const dayOfWeek = Number(t.dayOfWeek || t.day_of_week || toDayOfWeek(String(t.date).slice(0, 10)));
          const period = Number(t.period);
          if (dayOfWeek >= 1 && dayOfWeek <= 6 && period >= 1 && period <= 10) {
            map[`${dayOfWeek}-${period}`] = {
              dayOfWeek,
              period,
              date: String(t.date).slice(0, 10),
              subjectId: t.subject?.id ?? t.subject_id ?? null,
              teacherId: t.teacher?.id ?? t.teacher_id ?? null,
              teacherName: t.teacher?.fullName || '',
              room: t.room || '',
              fixedActivityCode: t.fixedActivityCode || t.fixed_activity_code || null,
            };
          }
        });
        const hasTemplate = Object.keys(map).length > 0;
        if (!hasTemplate && prefillTemplateFromGeneratedSchedules) {
          setTemplateMap(buildTemplateMapFromSchedules(schedulesForClass, monday));
        } else {
          setTemplateMap(map);
        }
      } catch (e) {
        console.error(e);
        toast.error('Không tải được dữ liệu lịch lớp/mẫu.');
      }
    };
    run();
  }, [selectedClassId, weekStart, prefillTemplateFromGeneratedSchedules]);

  useEffect(() => {
    const classId = selectedClassId ? Number(selectedClassId) : null;
    const subjectId = popup.subjectId ? Number(popup.subjectId) : null;
    if (!classId || !subjectId) {
      setTeachersForPopupSubject([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingTeachersForPopup(true);
        const res = await api.get(`/class-sections/class/${classId}`);
        if (cancelled) return;
        const sections = res.data?.classSections || [];
        const list = [];
        const seen = new Set();
        sections.forEach((cs) => {
          const sid = cs?.subject?.id ?? cs?.subject_id;
          const t = cs?.teacher;
          const tid = t?.id ?? cs?.teacher_id;
          const st = (cs?.status || '').toUpperCase();
          if (Number(sid) !== subjectId) return;
          if (!tid) return;
          if (st && st !== 'ACTIVE') return;
          if (seen.has(tid)) return;
          seen.add(tid);
          list.push({ id: Number(tid), fullName: t?.fullName || `GV #${tid}` });
        });
        setTeachersForPopupSubject(list);
      } catch (_) {
        if (cancelled) return;
        setTeachersForPopupSubject([]);
      } finally {
        if (!cancelled) setLoadingTeachersForPopup(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, popup.subjectId]);

  useEffect(() => {
    if (!popup.teacherId) return;
    const exists = teachersForPopupSubject.some((t) => String(t.id) === String(popup.teacherId));
    if (!exists) {
      setPopup((prev) => ({ ...prev, teacherId: '' }));
    }
  }, [popup.teacherId, teachersForPopupSubject]);

  useEffect(() => {
    const classId = generateData.classId ? Number(generateData.classId) : null;
    if (!classId) {
      setGenerateClassSections([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingGenerateClassSections(true);
        const res = await api.get(`/class-sections/class/${classId}`);
        if (cancelled) return;
        setGenerateClassSections(res.data?.classSections || []);
      } catch (_) {
        if (cancelled) return;
        setGenerateClassSections([]);
      } finally {
        if (!cancelled) setLoadingGenerateClassSections(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [generateData.classId]);

  const classScheduleMap = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 5);
    const m = {};
    classSchedules.forEach((s) => {
      if (!s.date || !s.period) return;
      const d = new Date(String(s.date).slice(0, 10));
      if (d < start || d > end) return;
      const day = toDayOfWeek(String(s.date).slice(0, 10));
      if (day < 1 || day > 6) return;
      m[`${day}-${Number(s.period)}`] = s;
    });
    return m;
  }, [classSchedules, weekStart]);

  const events = useMemo(() => {
    const out = [];
    Object.values(classScheduleMap).forEach((s) => {
      const period = Number(s.period);
      const pt = periodTimeMap[period];
      if (!pt) return;
      const date = String(s.date).slice(0, 10);
      const dayOfWeek = toDayOfWeek(date);
      out.push({
        id: `base-${s.id || `${date}-${period}`}`,
        title: `Hiện tại: ${scheduleSubjectDisplayName(s, 'Tiết học')}`,
        start: toIso(date, pt.startMin),
        end: toIso(date, pt.endMin),
        display: 'block',
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        textColor: '#475569',
      });
    });
    Object.values(templateMap).forEach((t) => {
      const period = Number(t.period);
      const pt = periodTimeMap[period];
      if (!pt) return;
      // Ưu tiên hiển thị TKB chính: nếu ô đã có lịch chính thì ẩn event mẫu để tránh chồng event.
      if (classScheduleMap[`${t.dayOfWeek}-${period}`]) {
        return;
      }
      const subject = subjects.find((x) => Number(x.id) === Number(t.subjectId));
      const fixedLabel = t.fixedActivityCode
        ? FIXED_ACTIVITY_LABELS[String(t.fixedActivityCode).toUpperCase()]
        : '';
      const title = subject?.name || fixedLabel || 'Mẫu';
      const palette = colorsForSubject(subject?.id, title);
      out.push({
        id: `tpl-${t.dayOfWeek}-${t.period}`,
        title: `Mẫu: ${title}`,
        start: toIso(t.date, pt.startMin),
        end: toIso(t.date, pt.endMin),
        backgroundColor: palette.bg,
        borderColor: palette.accent,
        textColor: palette.title,
        extendedProps: {
          teacherName: t.teacherName ||
            (classSections.find(
              (cs) =>
                Number(cs?.teacher?.id ?? cs?.teacher_id) === Number(t.teacherId) &&
                Number(cs?.subject?.id ?? cs?.subject_id) === Number(t.subjectId)
            )?.teacher?.fullName) || '',
        },
      });
    });
    return out;
  }, [classScheduleMap, templateMap, subjects, classSections]);

  const saveTemplate = async () => {
    if (!selectedClassId) return;
    const slots = Object.values(templateMap).sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.period - b.period));
    if (!slots.length) {
      toast.warn('Chưa có tiết mẫu để lưu.');
      return;
    }
    try {
      await api.post('/schedules/template', {
        classId: Number(selectedClassId),
        weekStart: normalizeToMonday(weekStart),
        slots: slots.map((s) => ({
          date: s.date,
          dayOfWeek: s.dayOfWeek,
          period: s.period,
          subjectId: s.subjectId || null,
          teacherId: s.teacherId || null,
          room: s.room || null,
          fixedActivityCode: s.fixedActivityCode || null,
        })),
      });
      setPrefillTemplateFromGeneratedSchedules(false);
      toast.success('Đã lưu thời khóa biểu mẫu thành công.');
    } catch (e) {
      console.error(e);
      toast.error('Lưu mẫu thất bại: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleGenerate = async () => {
    try {
      const normalizedAssignments = (generateData.subjectAssignments || [])
        .map((a) => ({
          subjectId: String(a?.subjectId || '').trim(),
          teacherId: String(a?.teacherId || '').trim(),
          periodsPerWeek: String(a?.periodsPerWeek || '').trim(),
        }))
        .filter((a) => a.subjectId || a.teacherId || a.periodsPerWeek);

      if (!generateData.classId || normalizedAssignments.length === 0) {
        toast.warn('Vui lòng chọn lớp và thêm ít nhất một môn học.');
        return;
      }

      const invalidRowIndex = normalizedAssignments.findIndex(
        (a) => !a.subjectId || !a.teacherId || !a.periodsPerWeek
      );
      if (invalidRowIndex >= 0) {
        toast.warn(`Dòng ${invalidRowIndex + 1} chưa đủ thông tin (môn, giáo viên, tiết/tuần).`);
        return;
      }

      const schoolId = user?.school?.id;
      const payload = {
        classId: parseInt(generateData.classId, 10),
        ...(schoolId != null && schoolId !== '' ? { schoolId: Number(schoolId) } : {}),
        subjectAssignments: normalizedAssignments.map((a) => ({
          subjectId: parseInt(a.subjectId, 10),
          teacherId: parseInt(a.teacherId, 10),
          periodsPerWeek: parseInt(a.periodsPerWeek, 10),
        })),
        numberOfWeeks: parseInt(generateData.numberOfWeeks, 10) || 1,
        session: generateData.session || 'BOTH',
      };

      const response = await api.post('/schedules/generate', payload);
      const data = response.data || {};
      const numberOfWeeksCreated = parseInt(generateData.numberOfWeeks, 10) || 1;
      if (data.success) {
        const generatedMonday = computeGenerateStartMonday();
        const generatedClassId = String(generateData.classId);
        const slots = Array.isArray(data.templateSlots) ? data.templateSlots : [];
        setShowGenerateModal(false);
        setGenerateData({
          classId: generatedClassId || selectedClassId || '',
          subjectAssignments: [],
          numberOfWeeks: 1,
          session: 'BOTH',
        });
        setSelectedClassId(generatedClassId);
        setWeekStart(generatedMonday);
        setTemplateMap(buildTemplateMapFromTemplateSlots(slots));
        setPrefillTemplateFromGeneratedSchedules(false);
        toast.success(
          `${data.message || 'Thành công.'}\n\n` +
            `Tiết yêu cầu (tổng/tuần): ${data.requestedPeriods ?? '-'} — Đã tạo: ${data.assignedPeriods ?? '-'}\n` +
            `Sức chứa tuần đầu: ${data.weeklyCapacity ?? '-'}\n\n` +
            `Đã tạo cho ${numberOfWeeksCreated} tuần (dữ liệu mẫu hiển thị ở tuần bắt đầu sinh).`
        );
      } else {
        const unmet = Array.isArray(data.unmetAssignments) ? data.unmetAssignments : [];
        const unmetText =
          unmet.length > 0
            ? '\n\nChưa đủ tiết:\n' +
              unmet
                .map(
                  (u) =>
                    `- Dòng ${u.lineIndex + 1}: ${u.subjectName ?? u.subjectId} / ${u.teacherName ?? u.teacherId} — cần ${u.requiredPeriods}, được ${u.assignedPeriods}`
                )
                .join('\n')
            : '';
        toast.error((data.message || 'Tạo TKB tự động không hoàn tất.') + unmetText);
      }
    } catch (error) {
      console.error('Error generating schedules:', error);
      toast.error('Lỗi khi tạo thời khóa biểu: ' + (error.response?.data?.error || error.message));
    }
  };

  const addSubjectAssignment = () => {
    setGenerateData((prev) => ({
      ...prev,
      subjectAssignments: [
        ...prev.subjectAssignments,
        { subjectId: '', teacherId: '', periodsPerWeek: '' },
      ],
    }));
  };

  const removeSubjectAssignment = (index) => {
    setGenerateData((prev) => ({
      ...prev,
      subjectAssignments: prev.subjectAssignments.filter((_, i) => i !== index),
    }));
  };

  const updateSubjectAssignment = (index, field, value) => {
    setGenerateData((prev) => {
      const updated = [...prev.subjectAssignments];
      if (field === 'subjectId') {
        updated[index] = { ...updated[index], subjectId: value, teacherId: '' };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, subjectAssignments: updated };
    });
  };

  const getSubjectsForAssignmentRow = (rowIndex) => {
    const assignments = generateData.subjectAssignments;
    const takenElsewhere = new Set(
      assignments
        .map((a, i) => (i !== rowIndex && a.subjectId ? String(a.subjectId) : null))
        .filter(Boolean)
    );
    const currentId = assignments[rowIndex]?.subjectId ? String(assignments[rowIndex].subjectId) : '';
    return subjects.filter(
      (s) =>
        !takenElsewhere.has(String(s.id)) || (currentId !== '' && String(s.id) === currentId)
    );
  };

  const getTeachersForGenerateSubject = (subjectIdRaw) => {
    const subjectId = subjectIdRaw ? Number(subjectIdRaw) : null;
    if (!subjectId) return [];
    const seen = new Set();
    const out = [];
    (generateClassSections || []).forEach((cs) => {
      const sid = cs?.subject?.id ?? cs?.subject_id;
      const teacher = cs?.teacher;
      const tid = teacher?.id;
      const st = (cs?.status || '').toUpperCase();
      if (Number(sid) !== subjectId) return;
      if (!tid) return;
      if (st && st !== 'ACTIVE') return;
      if (seen.has(tid)) return;
      seen.add(tid);
      out.push({ id: tid, fullName: teacher.fullName || `GV #${tid}` });
    });
    return out;
  };

  const openPopup = (dateStr) => {
    const dayOfWeek = toDayOfWeek(dateStr);
    if (!DAYS.includes(dayOfWeek)) return;
    setPopup({
      dayOfWeek,
      subjectId: '',
      teacherId: '',
      room: selectedClass?.room || '',
      periods: [],
    });
    setShowPopup(true);
  };

  const submitPopup = () => {
    if (!popup.subjectId) {
      toast.warn('Vui lòng chọn môn.');
      return;
    }
    if (!popup.teacherId) {
      toast.warn('Vui lòng chọn giáo viên.');
      return;
    }
    if (!popup.periods.length) {
      toast.warn('Vui lòng chọn ít nhất 1 tiết.');
      return;
    }
    if (!isConsecutive(popup.periods)) {
      toast.warn('Các tiết phải liên tục nhau.');
      return;
    }

    const subjectId = Number(popup.subjectId);
    const dayOfWeek = Number(popup.dayOfWeek);
    const existingSameSubjectCount = Object.values(templateMap).filter(
      (x) => Number(x.dayOfWeek) === dayOfWeek && Number(x.subjectId) === subjectId
    ).length;
    const incomingNewCount = popup.periods.filter((p) => {
      const k = `${dayOfWeek}-${p}`;
      const old = templateMap[k];
      if (!old) return true;
      return Number(old.subjectId) !== subjectId;
    }).length;
    if (existingSameSubjectCount + incomingNewCount > 5) {
      toast.warn('Không quá 5 tiết cho cùng 1 môn trong 1 ngày.');
      return;
    }

    const date = fmtDate(new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + dayOfWeek - 1)));
    setTemplateMap((prev) => {
      const next = { ...prev };
      popup.periods.forEach((period) => {
        next[`${dayOfWeek}-${period}`] = {
          dayOfWeek,
          period,
          date,
          subjectId,
          teacherId: Number(popup.teacherId),
          teacherName: teachersForPopupSubject.find((x) => String(x.id) === String(popup.teacherId))?.fullName || '',
          room: popup.room || '',
          fixedActivityCode: null,
        };
      });
      return next;
    });
    setShowPopup(false);
  };

  const removeTemplateAt = (eventStart) => {
    const date = fmtDate(eventStart);
    const day = toDayOfWeek(date);
    const hh = new Date(eventStart).getHours();
    const mm = new Date(eventStart).getMinutes();
    const minutes = hh * 60 + mm;
    const period = PERIODS.find((p) => periodTimeMap[p]?.startMin === minutes);
    if (!period) return;
    const key = `${day}-${period}`;
    if (!templateMap[key]) return;
    setTemplateMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return <div className="schedule-template-page"><div className="loading">Đang tải...</div></div>;
  }

  return (
    <div className="schedule-template-page">
      <div className="schedule-template-hero">
        <div className="schedule-template-hero__content">
          <div className="schedule-template-hero__icon" aria-hidden="true">📅</div>
          <div className="schedule-template-hero__text">
            <div className="schedule-template-hero__title-row">
              <h1>Thiết lập thời khóa biểu mẫu</h1>
              <span className="schedule-template-hero__badge">FullCalendar</span>
            </div>
            <p>Cấu hình và quản lý thời khóa biểu mẫu cho hệ thống</p>
          </div>
        </div>
        <div className="schedule-template-hero__visual" aria-hidden="true">
          <div className="schedule-template-hero__calendar">🗓️</div>
        </div>
      </div>

      <div className="schedule-template-controls-card">
        <div className="schedule-template-toolbar">
          <label>
            Lớp (niên khóa mới nhất):
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {(() => {
                    const className = c?.name || '';
                    const schoolYearName = c?.schoolYear?.name || '';
                    if (!schoolYearName) return className || 'N/A';
                    const normalizedClassName = className.toLowerCase();
                    const normalizedSchoolYear = schoolYearName.toLowerCase();
                    if (normalizedClassName.includes(normalizedSchoolYear)) {
                      return className;
                    }
                    return `${className} (${schoolYearName})`;
                  })()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tuần mẫu:
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(normalizeToMonday(e.target.value))} />
          </label>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
            onClick={saveTemplate}
          >
            Lưu TKB mẫu
          </button>
          {canManage && (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500"
              onClick={() => {
                setGenerateData((prev) => ({
                  ...prev,
                  classId: selectedClassId || prev.classId,
                }));
                setShowGenerateModal(true);
              }}
            >
              Sinh thời khóa biểu tự động
            </button>
          )}
        </div>

        <div className="schedule-template-hint">
          Click vào ô lịch để mở popup thêm tiết. Click vào event mẫu để xóa 1 tiết mẫu.
        </div>
      </div>

      <div className="schedule-template-calendar-card">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={viLocale}
          firstDay={1}
          hiddenDays={[0]}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="18:00:00"
          height="auto"
          weekends
          selectable
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Hôm nay', week: 'Tuần', day: 'Ngày' }}
          datesSet={(arg) => {
            setCalendarView(arg.view.type);
            if (arg.view.type === 'timeGridWeek') {
              setWeekStart(normalizeToMonday(fmtDate(arg.start)));
            }
          }}
          events={events}
          dateClick={(arg) => openPopup(fmtDate(arg.date))}
          eventClick={(arg) => {
            if (String(arg.event.id || '').startsWith('tpl-')) {
              removeTemplateAt(arg.event.start);
            }
          }}
          eventContent={(eventInfo) => {
            const start = eventInfo.event.start;
            const hh = start ? String(start.getHours()).padStart(2, '0') : '00';
            const mm = start ? String(start.getMinutes()).padStart(2, '0') : '00';
            const timeLabel = `${hh}:${mm}`;
            const teacherName = eventInfo.event.extendedProps?.teacherName || '';
            if (calendarView === 'timeGridDay') {
              return (
                <div className="event-title">
                  {eventInfo.event.title}
                  {teacherName ? <div className="event-meta">{teacherName}</div> : null}
                </div>
              );
            }
            return (
              <div className="event-title">
                {timeLabel} - {eventInfo.event.title}
                {teacherName ? <div className="event-meta">{teacherName}</div> : null}
              </div>
            );
          }}
        />
      </div>

      {showPopup && (
        <div className="template-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="template-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm tiết mẫu</h3>
            <div className="popup-grid">
              <label>
                Thứ
                <select
                  value={popup.dayOfWeek}
                  onChange={(e) => setPopup((p) => ({ ...p, dayOfWeek: Number(e.target.value), periods: [] }))}
                >
                  {DAYS.map((d) => <option key={d} value={d}>Thứ {d + 1}</option>)}
                </select>
              </label>
              <label>
                Môn
                <select
                  value={popup.subjectId}
                  onChange={(e) => setPopup((p) => ({ ...p, subjectId: e.target.value, teacherId: '' }))}
                >
                  <option value="">-- Chọn môn --</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label>
                Giáo viên
                <select
                  value={popup.teacherId}
                  onChange={(e) => setPopup((p) => ({ ...p, teacherId: e.target.value }))}
                  disabled={!popup.subjectId}
                >
                  <option value="">
                    {!popup.subjectId
                      ? '-- Chọn môn trước --'
                      : loadingTeachersForPopup
                        ? '-- Đang tải giáo viên --'
                        : teachersForPopupSubject.length === 0
                        ? '-- Không có GV phù hợp --'
                        : '-- Chọn giáo viên --'}
                  </option>
                  {teachersForPopupSubject.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </label>
              <label>
                Phòng học
                <input value={popup.room} onChange={(e) => setPopup((p) => ({ ...p, room: e.target.value }))} />
              </label>
            </div>

            <div className="period-box">
              <div className="period-title">
                Chọn tiết (có thể chọn nhiều tiết liên tục)
              </div>
              <div className="period-list">
                {PERIODS.map((period) => {
                  const checked = popup.periods.includes(period);
                  const range = periodTimeMap[period];
                  const label = range ? formatTimeRange(range.startMin, range.endMin) : '';
                  return (
                    <label key={period} className="period-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setPopup((prev) => {
                            const nextSet = new Set(prev.periods);
                            if (e.target.checked) nextSet.add(period);
                            else nextSet.delete(period);
                            return { ...prev, periods: Array.from(nextSet).sort((a, b) => a - b) };
                          });
                        }}
                      />
                      <span>Tiết {period} ({label})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="popup-actions">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
                onClick={submitPopup}
              >
                Áp dụng
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowPopup(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="template-popup-overlay" onClick={() => setShowGenerateModal(false)}>
          <div
            className="template-popup template-popup--generate"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Sinh thời khóa biểu tự động</h3>

            <div className="template-generate-form-group">
              <label>Lớp *</label>
              <select
                value={generateData.classId}
                onChange={(e) => setGenerateData((prev) => ({ ...prev, classId: e.target.value }))}
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="template-generate-form-group">
              <label>Số tuần *</label>
              <input
                type="number"
                value={generateData.numberOfWeeks}
                onChange={(e) =>
                  setGenerateData((prev) => ({ ...prev, numberOfWeeks: e.target.value }))
                }
                min="1"
                max="20"
                placeholder="Nhập số tuần (1-20)"
              />
              <small>Thời khóa biểu sẽ được tạo từ tuần hiện tại cho số tuần đã chọn.</small>
            </div>

            <div className="template-generate-form-group">
              <label>Buổi tạo lịch *</label>
              <select
                value={generateData.session}
                onChange={(e) => setGenerateData((prev) => ({ ...prev, session: e.target.value }))}
              >
                <option value="BOTH">Cả ngày (sáng + chiều)</option>
                <option value="MORNING">Chỉ buổi sáng</option>
                <option value="AFTERNOON">Chỉ buổi chiều</option>
              </select>
              <small>Nếu chọn sáng thì không tạo tiết chiều, và ngược lại.</small>
            </div>

            <div className="template-generate-form-group">
              <label>Phân bổ môn học</label>
              {generateData.subjectAssignments.map((assignment, index) => {
                const eligibleTeachers = getTeachersForGenerateSubject(assignment.subjectId);
                return (
                  <div key={index} className="template-generate-assignment-row">
                    <select
                      value={assignment.subjectId}
                      onChange={(e) => updateSubjectAssignment(index, 'subjectId', e.target.value)}
                    >
                      <option value="">-- Môn học --</option>
                      {getSubjectsForAssignmentRow(index).map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={assignment.teacherId}
                      onChange={(e) => updateSubjectAssignment(index, 'teacherId', e.target.value)}
                      disabled={!generateData.classId || !assignment.subjectId || loadingGenerateClassSections}
                    >
                      <option value="">
                        {!generateData.classId
                          ? '-- Chọn lớp trước --'
                          : !assignment.subjectId
                            ? '-- Chọn môn trước --'
                            : loadingGenerateClassSections
                              ? '-- Đang tải giáo viên --'
                              : '-- Giáo viên --'}
                      </option>
                      {eligibleTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={assignment.periodsPerWeek}
                      onChange={(e) =>
                        updateSubjectAssignment(index, 'periodsPerWeek', e.target.value)
                      }
                      placeholder="Tiết/tuần"
                      min="1"
                      max="10"
                    />
                    <button
                      type="button"
                      className="template-generate-remove"
                      onClick={() => removeSubjectAssignment(index)}
                    >
                      Xóa
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="template-generate-add"
                onClick={addSubjectAssignment}
              >
                + Thêm môn
              </button>
            </div>

            <div className="popup-actions">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500"
                onClick={handleGenerate}
              >
                Tạo tự động
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowGenerateModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTemplatePage;

