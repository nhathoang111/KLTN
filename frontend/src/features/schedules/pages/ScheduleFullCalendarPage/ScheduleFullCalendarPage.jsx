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
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [currentView, setCurrentView] = useState('timeGridWeek');

  const userRole = user?.role?.name?.toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isTeacher = userRole === 'TEACHER';
  const isParent = userRole === 'PARENT';
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

  if (loading) {
    return (
      <div className="schedule-fullcalendar-page">
        <div className="loading">Đang tải dữ liệu thời khóa biểu...</div>
      </div>
    );
  }

  return (
    <div className="schedule-fullcalendar-page">
      <div className="common-page-header">
        <h1>Thời khóa biểu (FullCalendar)</h1>
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
    </div>
  );
};

export default ScheduleFullCalendarPage;
