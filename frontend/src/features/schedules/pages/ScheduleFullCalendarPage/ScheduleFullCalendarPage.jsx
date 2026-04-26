import React, { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';
import { scheduleSubjectDisplayName } from '../../../../shared/lib/scheduleLabels';
import {
  TIMELINE_AFTERNOON,
  TIMELINE_MORNING,
  formatTimeRange,
} from '../ScheduleListPage/schoolScheduleTimeline';
import { colorsForSubject } from '../ScheduleListPage/subjectColors';
import './ScheduleFullCalendarPage.css';
import { buildTeacherVisibleClasses } from '../../../../shared/lib/teacherScope';
import { useNavigate } from 'react-router-dom';

const lessonRows = [...TIMELINE_MORNING, ...TIMELINE_AFTERNOON].filter(
  (row) => row.type === 'lesson' && typeof row.period === 'number'
);

const periodTimeMap = lessonRows.reduce((acc, row) => {
  acc[row.period] = { startMin: row.startMin, endMin: row.endMin };
  return acc;
}, {});

const toIsoDateTime = (dateInput, minutesFromStartOfDay) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  const hours = Math.floor(minutesFromStartOfDay / 60);
  const mins = minutesFromStartOfDay % 60;
  date.setHours(hours, mins, 0, 0);
  return date.toISOString();
};

const ScheduleFullCalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateFromTemplateModal, setShowGenerateFromTemplateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingFromTemplate, setGeneratingFromTemplate] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    date: '',
    period: '',
    room: '',
  });
  const [templateWeekStart, setTemplateWeekStart] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [generateFromTemplateData, setGenerateFromTemplateData] = useState({
    semesterStart: '',
    semesterEnd: '',
  });

  const userRole = user?.role?.name?.toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isTeacher = userRole === 'TEACHER';
  const isParent = userRole === 'PARENT';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isViewOnly = isStudent || isTeacher || isParent;

  useEffect(() => {
    fetchBootstrapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role?.name, user?.school?.id]);

  useEffect(() => {
    if (loading) return;
    const canFetchBySelectedClass = !!selectedClassId && !isStudent && !isParent;
    if (canFetchBySelectedClass || isTeacher || isStudent || isParent) {
      fetchSchedules();
    } else {
      setSchedules([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, loading, user?.id, user?.role?.name]);

  const fetchBootstrapData = async () => {
    try {
      setLoading(true);
      const schoolId = user?.school?.id;
      const activeStudentId = localStorage.getItem('activeStudentId');

      const classesRes = await api.get('/classes');
      let allClasses = classesRes.data.classes || [];

      if (userRole === 'ADMIN' && schoolId) {
        allClasses = allClasses.filter((cls) => cls.school?.id === schoolId);
      } else if ((userRole === 'STUDENT' && user?.id) || (userRole === 'PARENT' && activeStudentId)) {
        const targetStudentId = userRole === 'STUDENT' ? user.id : activeStudentId;
        try {
          const enrollmentRes = await api.get(`/users/${targetStudentId}/enrollment`);
          const enrollment = enrollmentRes.data.enrollment || enrollmentRes.data;
          if (enrollment?.classId) {
            allClasses = allClasses.filter((cls) => cls.id === enrollment.classId);
            if (allClasses.length > 0) setSelectedClassId(String(allClasses[0].id));
          } else {
            allClasses = [];
          }
        } catch (_) {
          allClasses = [];
        }
      } else if (userRole === 'TEACHER' && user?.id) {
        try {
          const sectionsRes = await api.get(`/class-sections/teacher/${user.id}`);
          const teacherSections = sectionsRes.data.classSections || [];
          allClasses = buildTeacherVisibleClasses({
            allClasses,
            classSections: teacherSections,
            teacherId: Number(user.id),
            schoolId: Number(schoolId),
            includeHomeroom: true,
          });
        } catch (_) {
          allClasses = [];
        }
      }

      setClasses(allClasses);
      if (allClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(String(allClasses[0].id));
      }

      if (isAdmin) {
        try {
          const schoolIdForFetch = schoolId || allClasses[0]?.school?.id || null;
          const [subjectsRes, usersRes] = await Promise.all([
            schoolIdForFetch ? api.get(`/subjects/school/${schoolIdForFetch}`) : api.get('/subjects'),
            schoolIdForFetch ? api.get(`/users?userRole=ADMIN&schoolId=${schoolIdForFetch}`) : api.get('/users?userRole=TEACHER'),
          ]);
          setSubjects(subjectsRes.data?.subjects || []);
          const teacherUsers = (usersRes.data?.users || []).filter((u) => {
            const rn = (u?.role?.name || '').toUpperCase();
            return rn === 'TEACHER' || rn.startsWith('TEACHER') || rn.includes('GIÁO VIÊN') || rn.includes('GIAO VIEN');
          });
          setTeachers(teacherUsers);
        } catch (_) {
          setSubjects([]);
          setTeachers([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const activeStudentId = localStorage.getItem('activeStudentId');
      let schedulesData = [];

      if ((userRole === 'STUDENT' && user?.id) || (userRole === 'PARENT' && activeStudentId)) {
        const targetStudentId = userRole === 'STUDENT' ? user.id : activeStudentId;
        const response = await api.get(`/schedules/student/${targetStudentId}`);
        schedulesData = response.data.schedules || [];
      } else if (userRole === 'TEACHER' && user?.id) {
        const response = await api.get(`/schedules/teacher/${user.id}`);
        const allTeacherSchedules = response.data.schedules || [];
        schedulesData = selectedClassId
          ? allTeacherSchedules.filter((schedule) => {
              const classId = schedule.classEntity?.id || schedule.class_id;
              return classId && String(classId) === selectedClassId;
            })
          : allTeacherSchedules;
      } else if (selectedClassId) {
        const response = await api.get(`/schedules/class/${selectedClassId}`);
        schedulesData = response.data.schedules || [];
      }

      setSchedules(schedulesData);
    } catch (_) {
      setSchedules([]);
    }
  };

  const handleDeleteAllByClass = async () => {
    if (!selectedClassId) {
      window.alert('Vui lòng chọn lớp trước khi xóa toàn bộ thời khóa biểu.');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ thời khóa biểu của lớp đang chọn?')) {
      return;
    }
    try {
      await api.delete(`/schedules/class/${selectedClassId}`);
      window.alert('Đã xóa toàn bộ thời khóa biểu của lớp.');
      fetchSchedules();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Xóa thời khóa biểu thất bại.');
    }
  };

  const calendarEvents = useMemo(() => {
    return (schedules || [])
      .map((schedule) => {
        const scheduleDate = schedule?.date;
        const period = schedule?.period;
        const periodTime = periodTimeMap[period];
        if (!scheduleDate || !periodTime) return null;

        const start = toIsoDateTime(scheduleDate, periodTime.startMin);
        const end = toIsoDateTime(scheduleDate, periodTime.endMin);
        if (!start || !end) return null;

        const sid = schedule?.subject?.id ?? schedule?.subject_id;
        const title = scheduleSubjectDisplayName(schedule, 'Tiết học');
        const palette = colorsForSubject(sid, title);
        const teacherName = schedule?.teacher?.fullName || 'Chưa có giáo viên';
        const room = schedule?.room || 'Chưa có phòng';

        return {
          id: String(schedule.id),
          title,
          start,
          end,
          extendedProps: {
            teacherName,
            room,
            period,
            timeText: formatTimeRange(periodTime.startMin, periodTime.endMin),
          },
          backgroundColor: palette.bg,
          borderColor: palette.accent,
          textColor: palette.title,
        };
      })
      .filter(Boolean);
  }, [schedules]);

  const openAddModal = () => {
    setFormData({
      classId: selectedClassId || '',
      subjectId: '',
      teacherId: '',
      date: '',
      period: '',
      room: '',
    });
    setShowAddModal(true);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!formData.classId || !formData.date || !formData.period) {
      window.alert('Vui lòng chọn lớp, ngày và tiết.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/schedules', {
        classId: Number(formData.classId),
        subjectId: formData.subjectId ? Number(formData.subjectId) : null,
        teacherId: formData.teacherId ? Number(formData.teacherId) : null,
        date: formData.date,
        period: Number(formData.period),
        room: formData.room || null,
      });
      window.alert('Đã thêm lịch học bù thành công.');
      setShowAddModal(false);
      if (String(selectedClassId) !== String(formData.classId)) {
        setSelectedClassId(String(formData.classId));
      } else {
        fetchSchedules();
      }
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Thêm lịch học bù thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeToMonday = (dateStr) => {
    if (!dateStr) return dateStr;
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedClassId) {
      window.alert('Vui lòng chọn lớp.');
      return;
    }
    if (!templateWeekStart || !generateFromTemplateData.semesterStart || !generateFromTemplateData.semesterEnd) {
      window.alert('Vui lòng nhập đầy đủ tuần mẫu, ngày bắt đầu và ngày kết thúc học kỳ.');
      return;
    }
    if (!window.confirm('Hệ thống sẽ xóa toàn bộ thời khóa biểu hiện có của lớp trong khoảng học kỳ trước khi sinh lại. Tiếp tục?')) {
      return;
    }
    try {
      setGeneratingFromTemplate(true);
      const payload = {
        classId: Number(selectedClassId),
        weekStartTemplate: normalizeToMonday(templateWeekStart),
        semesterStart: generateFromTemplateData.semesterStart,
        semesterEnd: generateFromTemplateData.semesterEnd,
      };
      const res = await api.post('/schedules/generate-from-template', payload);
      const data = res.data || {};
      window.alert(
        `${data.message || 'Đã sinh thời khóa biểu từ mẫu.'}\n` +
        `Đã xóa: ${data.deletedCount ?? 0} | Đã tạo: ${data.createdCount ?? 0} | Bỏ qua (quá khứ): ${data.skippedPastDateCount ?? 0}`
      );
      setShowGenerateFromTemplateModal(false);
      fetchSchedules();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Sinh thời khóa biểu từ mẫu thất bại.');
    } finally {
      setGeneratingFromTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="schedule-fullcalendar-page">
        <div className="loading">Đang tải dữ liệu thời khóa biểu...</div>
      </div>
    );
  }

  return (
    <div className="schedule-fullcalendar-page">
      <div className="schedule-fullcalendar-hero">
        <div className="schedule-fullcalendar-hero__main">
          <div className="schedule-fullcalendar-hero__icon" aria-hidden="true">📅</div>
          <div className="schedule-fullcalendar-hero__text">
            <h1>Thời khóa biểu</h1>
            <p>Quản lý và thao tác thời khóa biểu dễ dàng, nhanh chóng</p>
          </div>
        </div>
        {isAdmin && (
          <div className="schedule-fullcalendar-actions">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => navigate('/schedules-template')}
            >
              Thiết lập TKB mẫu
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setShowGenerateFromTemplateModal(true)}
            >
              Sinh TKB mẫu
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
              onClick={openAddModal}
            >
              Thêm lịch học bù
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDeleteAllByClass}
              disabled={!selectedClassId}
            >
              Xóa toàn bộ TKB lớp này
            </button>
          </div>
        )}
      </div>

      {!isStudent && (
        <div className="schedule-fullcalendar-filters">
          <label htmlFor="class-select-fullcalendar">Chọn lớp:</label>
          <select
            id="class-select-fullcalendar"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isStudent}
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedClassId && !isTeacher && !isStudent && !isParent ? (
        <div className="schedule-fullcalendar-empty">
          Vui lòng chọn lớp để xem thời khóa biểu.
        </div>
      ) : (
        <div className="schedule-fullcalendar-card">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={viLocale}
            firstDay={1}
            allDaySlot={false}
            weekends={true}
            hiddenDays={[0]}
            slotMinTime="07:00:00"
            slotMaxTime="18:00:00"
            height="auto"
            expandRows={true}
            eventMaxStack={2}
            dayMaxEvents={3}
            dayMaxEventRows={3}
            slotEventOverlap={false}
            displayEventTime={false}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay,dayGridMonth',
            }}
            buttonText={{
              today: 'Hôm nay',
              week: 'Theo tiết',
              day: 'Ngày',
              month: 'Tháng',
            }}
            datesSet={(arg) => setCurrentView(arg.view.type)}
            moreLinkText={(n) => `+${n} tiết`}
            events={calendarEvents}
            eventContent={(eventInfo) => {
              const { teacherName, room, period, timeText } = eventInfo.event.extendedProps;
              const isMonthView = currentView === 'dayGridMonth';

              if (isMonthView) {
                return (
                  <div className="fc-school-event fc-school-event--compact">
                    <div className="fc-school-event__title">
                      Tiết {period}: {eventInfo.event.title}
                    </div>
                  </div>
                );
              }

              return (
                <div className="fc-school-event">
                  <div className="fc-school-event__row">
                    <div className="fc-school-event__left fc-school-event__title">
                      Tiết {period}: {eventInfo.event.title}
                    </div>
                    <div className="fc-school-event__right fc-school-event__meta">
                      Phòng {room}
                    </div>
                  </div>
                  <div className="fc-school-event__row">
                    <div className="fc-school-event__left fc-school-event__meta">{timeText}</div>
                    <div className="fc-school-event__right fc-school-event__meta">{teacherName}</div>
                  </div>
                </div>
              );
            }}
          />
          {calendarEvents.length === 0 && (
            <div className="schedule-fullcalendar-empty">
              {isViewOnly
                ? 'Hiện chưa có tiết học nào trong phạm vi bạn được xem.'
                : 'Chưa có dữ liệu thời khóa biểu cho lớp hiện tại.'}
            </div>
          )}
        </div>
      )}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Thêm lịch học bù</h2>
            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label>Lớp *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Môn học</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                >
                  <option value="">-- Chọn môn --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Giáo viên</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teacherId: e.target.value }))}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tiết *</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData((prev) => ({ ...prev, period: e.target.value }))}
                  required
                >
                  <option value="">-- Chọn tiết --</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Tiết {i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Phòng học</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                  placeholder="VD: A101"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang thêm...' : 'Thêm'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showGenerateFromTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateFromTemplateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <h2>Sinh thời khóa biểu học kỳ từ mẫu</h2>
            <div className="form-group">
              <label>Tuần mẫu</label>
              <input
                type="date"
                value={templateWeekStart}
                onChange={(e) => setTemplateWeekStart(normalizeToMonday(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Ngày bắt đầu học kỳ</label>
              <input
                type="date"
                value={generateFromTemplateData.semesterStart}
                onChange={(e) => setGenerateFromTemplateData((p) => ({ ...p, semesterStart: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Ngày kết thúc học kỳ</label>
              <input
                type="date"
                value={generateFromTemplateData.semesterEnd}
                onChange={(e) => setGenerateFromTemplateData((p) => ({ ...p, semesterEnd: e.target.value }))}
              />
            </div>
            <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>
              Lưu ý: hệ thống sẽ xóa toàn bộ lịch hiện có của lớp trong khoảng học kỳ trước khi sinh lại.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleGenerateFromTemplate}
                disabled={generatingFromTemplate}
              >
                {generatingFromTemplate ? 'Đang sinh...' : 'Sinh học kỳ'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowGenerateFromTemplateModal(false)}
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

export default ScheduleFullCalendarPage;
