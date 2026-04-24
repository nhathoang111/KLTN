package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.dto.schedule.ScheduleGenerateResult;
import com.example.schoolmanagement.dto.schedule.ScheduleGenerateResult.UnmetAssignment;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.util.ClassStatusPolicy;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScheduleService {

    /** Tiết 1–5 sáng, 6–10 chiều (đồng bộ FE). */
    private static final int MIN_PERIOD = 1;
    private static final int MAX_PERIOD = 10;
    /** Số tiết chiều trong ngày (period 6…MAX_PERIOD). */
    private static final int AFTERNOON_PERIOD_COUNT = MAX_PERIOD - 5;

    /** Mã tiết cố định trên bản ghi schedule (không dùng bảng subjects). */
    public static final String FIXED_ACTIVITY_CHAOCO = "CHAOCO";
    public static final String FIXED_ACTIVITY_SHL = "SHL";

    /**
     * Tiết cố định theo buổi (dayOffset: 0 = Thứ 2 … 5 = Thứ 7 trong mô hình TKB 6 ngày).
     * Buổi sáng: T2 tiết 1 chào cờ; T7 tiết 5 sinh hoạt lớp.
     * Buổi chiều: T2 tiết 5 (chiều) = period 10 chào cờ; T7 tiết 5 chiều = period 10 sinh hoạt lớp.
     */
    private static void collectFixedSlotsForSession(String sessionMode, List<int[]> outDayOffsetAndPeriod) {
        boolean morning = "MORNING".equals(sessionMode) || "BOTH".equals(sessionMode);
        boolean afternoon = "AFTERNOON".equals(sessionMode) || "BOTH".equals(sessionMode);
        if (morning) {
            outDayOffsetAndPeriod.add(new int[]{0, 1});   // Thứ 2 — chào cờ
            outDayOffsetAndPeriod.add(new int[]{5, 5});   // Thứ 7 — sinh hoạt lớp
        }
        if (afternoon) {
            outDayOffsetAndPeriod.add(new int[]{0, MAX_PERIOD}); // Thứ 2 tiết 5 chiều — chào cờ
            outDayOffsetAndPeriod.add(new int[]{5, MAX_PERIOD}); // Thứ 7 tiết 5 chiều — sinh hoạt lớp
        }
    }

    private static boolean isChaocoSlot(int dayOffset, int period) {
        return dayOffset == 0 && (period == 1 || period == MAX_PERIOD);
    }

    private static boolean isShlSlot(int dayOffset, int period) {
        return dayOffset == 5 && (period == 5 || period == MAX_PERIOD);
    }

    /** Đánh dấu các ô cố định tuần đầu để không xếp môn khác và kiểm tra trùng GV chủ nhiệm. */
    private static void reserveFixedSlotsFirstWeek(
            LocalDate firstMonday,
            LocalDate today,
            String sessionMode,
            Set<String> occupiedClassSlotsFirstWeek,
            Set<String> occupiedTeacherSlotsFirstWeek,
            User homeroomTeacher) {
        List<int[]> slots = new ArrayList<>();
        collectFixedSlotsForSession(sessionMode, slots);
        Integer homeroomId = homeroomTeacher != null ? homeroomTeacher.getId() : null;
        for (int[] dp : slots) {
            int dayOffset = dp[0];
            int period = dp[1];
            LocalDate d = firstMonday.plusDays(dayOffset);
            if (d.isBefore(today)) {
                continue;
            }
            String cKey = d + "-" + period;
            occupiedClassSlotsFirstWeek.add(cKey);
            if (homeroomId != null) {
                occupiedTeacherSlotsFirstWeek.add(homeroomId + "-" + d + "-" + period);
            }
        }
    }

    /**
     * Tạo các bản ghi tiết cố định (fixedActivityCode, không subject_id).
     */
    private List<Schedule> buildFixedActivitySchedules(
            ClassEntity classEntity,
            School school,
            String sessionMode,
            LocalDate nextMonday,
            int numberOfWeeks,
            LocalDate today,
            String classRoom,
            User homeroomTeacher) {
        List<Schedule> fixed = new ArrayList<>();
        List<int[]> defs = new ArrayList<>();
        collectFixedSlotsForSession(sessionMode, defs);
        for (int week = 0; week < numberOfWeeks; week++) {
            LocalDate weekStart = nextMonday.plusWeeks(week);
            for (int[] dp : defs) {
                int dayOffset = dp[0];
                int period = dp[1];
                LocalDate date = weekStart.plusDays(dayOffset);
                if (date.isBefore(today)) {
                    continue;
                }
                String code;
                if (isChaocoSlot(dayOffset, period)) {
                    code = FIXED_ACTIVITY_CHAOCO;
                } else if (isShlSlot(dayOffset, period)) {
                    code = FIXED_ACTIVITY_SHL;
                } else {
                    continue;
                }
                Schedule sch = new Schedule();
                sch.setDate(date);
                sch.setPeriod(period);
                sch.setRoom(classRoom);
                sch.setSubject(null);
                sch.setFixedActivityCode(code);
                sch.setTeacher(homeroomTeacher);
                sch.setSchool(school);
                sch.setClassEntity(classEntity);
                sch.setClassSection(null);
                fixed.add(sch);
            }
        }
        return fixed;
    }
    @Autowired
    private ScheduleRepository scheduleRepository;
    
    @Autowired
    private ClassRepository classRepository;
    
    @Autowired
    private SubjectRepository subjectRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    public List<Schedule> getAllSchedules() {
        return scheduleRepository.findAllWithRelations();
    }

    public Schedule getScheduleById(Integer id) {
        return scheduleRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with id: " + id));
    }

    public List<Schedule> getSchedulesBySchool(Integer schoolId) {
        return scheduleRepository.findBySchoolId(schoolId);
    }

    public List<Schedule> getSchedulesByClass(Integer classId) {
        return scheduleRepository.findByClassEntityId(classId);
    }

    public List<Schedule> getSchedulesByTeacher(Integer teacherId) {
        return scheduleRepository.findByTeacherId(teacherId);
    }

    public List<Schedule> getSchedulesByStudent(Integer studentId) {
        // Lấy enrollment của học sinh (chỉ lấy ACTIVE)
        List<com.example.schoolmanagement.entity.Enrollment> enrollments = 
            enrollmentRepository.findByStudentId(studentId);
        
        // Lọc chỉ lấy enrollment ACTIVE
        List<com.example.schoolmanagement.entity.Enrollment> activeEnrollments = enrollments.stream()
            .filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus()))
            .collect(java.util.stream.Collectors.toList());
        
        if (activeEnrollments.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Lấy class_id từ enrollment đầu tiên (học sinh thường chỉ học 1 lớp)
        Integer classId = activeEnrollments.get(0).getClassEntity() != null 
            ? activeEnrollments.get(0).getClassEntity().getId() 
            : null;
        
        if (classId == null) {
            return new ArrayList<>();
        }
        
        // Lấy schedules của lớp đó
        return scheduleRepository.findByClassEntityId(classId);
    }
    
    public List<Schedule> findConflictsByDate(LocalDate date, Integer period, Integer teacherId, Integer classId) {
        return scheduleRepository.findConflictsByDate(date, period, teacherId, classId);
    }

    public Schedule saveSchedule(Schedule schedule) {
        return scheduleRepository.save(schedule);
    }

    public void deleteSchedule(Integer id) {
        Schedule existing = getScheduleById(id);
        ClassStatusPolicy.assertTeachActionAllowed(existing.getClassEntity(), "xóa thời khóa biểu");
        scheduleRepository.deleteById(id);
    }

    public int deleteAllSchedulesByClass(Integer classId) {
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new BadRequestException("Class not found"));
        ClassStatusPolicy.assertTeachActionAllowed(classEntity, "xóa thời khóa biểu");
        List<Schedule> schedules = scheduleRepository.findByClassEntityId(classId);
        int count = schedules.size();
        scheduleRepository.deleteAll(schedules);
        return count;
    }

    public int deleteAllSchedulesBySchool(Integer schoolId) {
        List<Schedule> schedules = scheduleRepository.findBySchoolId(schoolId);
        int count = schedules.size();
        scheduleRepository.deleteAll(schedules);
        return count;
    }

    public int deleteAllSchedules() {
        List<Schedule> allSchedules = scheduleRepository.findAll();
        int count = allSchedules.size();
        scheduleRepository.deleteAll(allSchedules);
        return count;
    }

    @Transactional
    public ScheduleGenerateResult generateSchedules(Integer classId, Integer schoolIdRequest, List<Map<String, Object>> subjectAssignments, Integer numberOfWeeks, String session) {
        ScheduleGenerateResult out = new ScheduleGenerateResult();
        out.setUnmetAssignments(new ArrayList<>());

        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        ClassStatusPolicy.assertTeachActionAllowed(classEntity, "tạo thời khóa biểu");
        School school = classEntity.getSchool();
        if (school == null) {
            throw new ResourceNotFoundException("School not found for class");
        }
        Integer schoolId = school.getId();
        if (schoolIdRequest != null && schoolId != null && !schoolIdRequest.equals(schoolId)) {
            throw new BadRequestException("classId does not belong to the given schoolId");
        }

        List<GenAssign> batch = new ArrayList<>();
        Set<String> duplicatePairs = new HashSet<>();
        for (int line = 0; line < subjectAssignments.size(); line++) {
            final int rowIndex = line;
            Map<String, Object> row = subjectAssignments.get(line);
            Integer subjectId = parseInt(row.get("subjectId"));
            Integer teacherId = parseInt(row.get("teacherId"));
            Integer periodsPerWeek = parseInt(row.get("periodsPerWeek"));
            if (subjectId == null || teacherId == null || periodsPerWeek == null) {
                throw new BadRequestException("subjectAssignments[" + rowIndex + "]: subjectId, teacherId, periodsPerWeek are required");
            }
            if (periodsPerWeek < 1) {
                throw new BadRequestException("subjectAssignments[" + rowIndex + "]: periodsPerWeek must be >= 1");
            }
            Subject subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new BadRequestException("subjectAssignments[" + rowIndex + "]: subject not found id=" + subjectId));
            User teacher = userRepository.findById(teacherId)
                    .orElseThrow(() -> new BadRequestException("subjectAssignments[" + rowIndex + "]: teacher not found id=" + teacherId));
            validateSubjectForGenerate(subject, schoolId);
            validateTeacherForGenerate(teacher, schoolId);

            String pairKey = subjectId + "_" + teacherId;
            if (!duplicatePairs.add(pairKey)) {
                throw new BadRequestException("Duplicate subject–teacher pair at line " + rowIndex + " (subjectId=" + subjectId + ", teacherId=" + teacherId + ")");
            }

            GenAssign g = new GenAssign();
            g.lineIndex = rowIndex;
            g.subject = subject;
            g.teacher = teacher;
            g.teacherId = teacherId;
            g.periodsPerWeek = periodsPerWeek;
            batch.add(g);
        }

        int requestedPeriods = batch.stream().mapToInt(g -> g.periodsPerWeek).sum();

        LocalDate today = LocalDate.now();
        LocalDate currentMonday = today;
        while (currentMonday.getDayOfWeek().getValue() != 1) {
            currentMonday = currentMonday.minusDays(1);
        }
        final LocalDate nextMonday;
        if (today.getDayOfWeek().getValue() == 1) {
            nextMonday = currentMonday;
        } else {
            nextMonday = currentMonday.plusDays(7);
        }

        List<Schedule> existingSchedules = scheduleRepository.findByClassEntityId(classId);
        Set<String> occupiedClassSlotsFirstWeek = new HashSet<>();
        Set<String> occupiedTeacherSlotsFirstWeek = new HashSet<>();

        String classRoom = (classEntity.getRoom() != null && !classEntity.getRoom().trim().isEmpty())
                ? classEntity.getRoom()
                : "A" + String.format("%03d", classId);

        LocalDate firstWeekStart = nextMonday;
        for (int i = 0; i < 6; i++) {
            LocalDate firstWeekDate = firstWeekStart.plusDays(i);
            for (Schedule s : existingSchedules) {
                if (s.getDate() != null && s.getDate().equals(firstWeekDate)) {
                    occupiedClassSlotsFirstWeek.add(s.getDate().toString() + "-" + s.getPeriod());
                    if (s.getTeacher() != null) {
                        occupiedTeacherSlotsFirstWeek.add(s.getTeacher().getId() + "-" + s.getDate().toString() + "-" + s.getPeriod());
                    }
                }
            }
        }
        for (GenAssign g : batch) {
            List<Schedule> teacherSchedules = scheduleRepository.findByTeacherId(g.teacherId);
            for (Schedule s : teacherSchedules) {
                if (s.getDate() == null) continue;
                for (int i = 0; i < 6; i++) {
                    LocalDate firstWeekDate = firstWeekStart.plusDays(i);
                    if (s.getDate().equals(firstWeekDate)) {
                        occupiedTeacherSlotsFirstWeek.add(g.teacherId + "-" + s.getDate().toString() + "-" + s.getPeriod());
                    }
                }
            }
        }

        String sessionMode = (session == null ? "BOTH" : session.trim().toUpperCase());
        if (!"MORNING".equals(sessionMode) && !"AFTERNOON".equals(sessionMode) && !"BOTH".equals(sessionMode)) {
            sessionMode = "BOTH";
        }

        reserveFixedSlotsFirstWeek(
                firstWeekStart,
                today,
                sessionMode,
                occupiedClassSlotsFirstWeek,
                occupiedTeacherSlotsFirstWeek,
                classEntity.getHomeroomTeacher());

        int weeklyCapacity = computeWeeklyFreeSlotCapacity(firstWeekStart, sessionMode, occupiedClassSlotsFirstWeek);
        out.setWeeklyCapacity(weeklyCapacity);
        out.setRequestedPeriods(requestedPeriods);

        if (requestedPeriods > weeklyCapacity) {
            throw new BadRequestException(
                    String.format("Tổng số tiết yêu cầu mỗi tuần (%d) vượt quá số ô trống trong tuần đầu (%d).",
                            requestedPeriods, weeklyCapacity));
        }

        List<Object[]> morningSlots = new ArrayList<>();
        List<Object[]> afternoonSlots = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            for (int period = MIN_PERIOD; period <= 5; period++) {
                morningSlots.add(new Object[]{i, period});
            }
            for (int period = 6; period <= MAX_PERIOD; period++) {
                afternoonSlots.add(new Object[]{i, period});
            }
        }
        Collections.shuffle(morningSlots);
        Collections.shuffle(afternoonSlots);
        if ("MORNING".equals(sessionMode)) {
            afternoonSlots.clear();
        } else if ("AFTERNOON".equals(sessionMode)) {
            morningSlots.clear();
        }

        Map<String, Object[]> weekPattern = new HashMap<>();
        List<GenAssign> workBatch = new ArrayList<>(batch);
        Collections.shuffle(workBatch);

        for (GenAssign g : workBatch) {
            if ("MORNING".equals(sessionMode)) {
                g.afternoonRemaining = 0;
                g.morningRemaining = g.periodsPerWeek;
            } else if ("AFTERNOON".equals(sessionMode)) {
                g.afternoonRemaining = g.periodsPerWeek;
                g.morningRemaining = 0;
            } else {
                int afternoonCap = Math.min(AFTERNOON_PERIOD_COUNT, (g.periodsPerWeek + 1) / 2);
                g.afternoonRemaining = afternoonCap;
                g.morningRemaining = g.periodsPerWeek - afternoonCap;
            }
        }

        boolean progress;
        do {
            progress = false;
            Collections.shuffle(afternoonSlots);
            for (GenAssign g : workBatch) {
                if (g.afternoonRemaining <= 0) continue;
                int n = tryAssignSlotsToPattern(afternoonSlots, 1, g.subject, g.teacher, g.teacherId,
                        nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
                if (n > 0) {
                    g.afternoonRemaining--;
                    progress = true;
                }
            }
        } while (progress);

        for (GenAssign g : workBatch) {
            if (g.morningRemaining <= 0) continue;
            Collections.shuffle(morningSlots);
            int n = tryAssignSlotsToPattern(morningSlots, g.morningRemaining, g.subject, g.teacher, g.teacherId,
                    nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
            g.morningRemaining -= n;
        }

        for (GenAssign g : workBatch) {
            int have = countPatternSlotsForGenAssign(g, weekPattern);
            int need = g.periodsPerWeek - have;
            if (need <= 0) continue;
            Collections.shuffle(afternoonSlots);
            int n = tryAssignSlotsToPattern(afternoonSlots, need, g.subject, g.teacher, g.teacherId,
                    nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
            need -= n;
            if (need > 0) {
                Collections.shuffle(morningSlots);
                tryAssignSlotsToPattern(morningSlots, need, g.subject, g.teacher, g.teacherId,
                        nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
            }
        }

        List<UnmetAssignment> unmetPattern = new ArrayList<>();
        for (GenAssign g : batch) {
            int have = countPatternSlotsForGenAssign(g, weekPattern);
            if (have < g.periodsPerWeek) {
                UnmetAssignment u = new UnmetAssignment();
                u.setLineIndex(g.lineIndex);
                u.setSubjectId(g.subject.getId());
                u.setSubjectName(g.subject.getName());
                u.setTeacherId(g.teacherId);
                u.setTeacherName(g.teacher.getFullName());
                u.setRequiredPeriods(g.periodsPerWeek);
                u.setAssignedPeriods(have);
                unmetPattern.add(u);
            }
        }
        if (!unmetPattern.isEmpty()) {
            out.setSuccess(false);
            out.setAssignedPeriods(0);
            out.setUnmetAssignments(unmetPattern);
            out.setMessage("Không ghép đủ tiết trong tuần mẫu (pattern).");
            return out;
        }

        Map<String, Integer> pairToLine = new HashMap<>();
        for (GenAssign g : batch) {
            pairToLine.put(g.subject.getId() + "-" + g.teacherId, g.lineIndex);
        }

        int[] expectedPerLine = new int[batch.size()];
        for (int week = 0; week < numberOfWeeks; week++) {
            LocalDate weekStart = nextMonday.plusWeeks(week);
            List<String> sortedKeys = new ArrayList<>(weekPattern.keySet());
            sortedKeys.sort((ka, kb) -> {
                String[] a = ka.split("-");
                String[] b = kb.split("-");
                int d = Integer.compare(Integer.parseInt(a[0]), Integer.parseInt(b[0]));
                if (d != 0) return d;
                return Integer.compare(Integer.parseInt(a[1]), Integer.parseInt(b[1]));
            });
            for (String patternKey : sortedKeys) {
                Object[] patternValue = weekPattern.get(patternKey);
                Subject subject = (Subject) patternValue[0];
                User teacher = (User) patternValue[1];
                Integer dayOffset = (Integer) patternValue[3];
                LocalDate date = weekStart.plusDays(dayOffset);
                if (date.isBefore(today)) {
                    continue;
                }
                Integer lineIdx = pairToLine.get(subject.getId() + "-" + teacher.getId());
                if (lineIdx != null && lineIdx >= 0 && lineIdx < expectedPerLine.length) {
                    expectedPerLine[lineIdx]++;
                }
            }
        }

        Set<String> createdSlots = new HashSet<>();
        Set<String> existingClassSlots = new HashSet<>();
        Set<String> existingTeacherSlots = new HashSet<>();
        for (Schedule s : existingSchedules) {
            if (s.getDate() != null) {
                existingClassSlots.add(s.getDate().toString() + "-" + s.getPeriod());
                if (s.getTeacher() != null) {
                    existingTeacherSlots.add(s.getTeacher().getId() + "-" + s.getDate().toString() + "-" + s.getPeriod());
                }
            }
        }
        for (GenAssign g : batch) {
            for (Schedule s : scheduleRepository.findByTeacherId(g.teacherId)) {
                if (s.getDate() != null) {
                    existingTeacherSlots.add(g.teacherId + "-" + s.getDate().toString() + "-" + s.getPeriod());
                }
            }
        }

        boolean conflictSkip = false;
        List<Schedule> toSave = new ArrayList<>();
        List<Integer> linePerRow = new ArrayList<>();

        for (int week = 0; week < numberOfWeeks; week++) {
            LocalDate weekStart = nextMonday.plusWeeks(week);
            List<String> sortedPatternKeys = new ArrayList<>(weekPattern.keySet());
            sortedPatternKeys.sort((ka, kb) -> {
                String[] a = ka.split("-");
                String[] b = kb.split("-");
                int d = Integer.compare(Integer.parseInt(a[0]), Integer.parseInt(b[0]));
                if (d != 0) return d;
                return Integer.compare(Integer.parseInt(a[1]), Integer.parseInt(b[1]));
            });

            for (String patternKey : sortedPatternKeys) {
                Object[] patternValue = weekPattern.get(patternKey);
                Subject subject = (Subject) patternValue[0];
                User teacher = (User) patternValue[1];
                Integer period = (Integer) patternValue[2];
                Integer dayOffset = (Integer) patternValue[3];
                LocalDate date = weekStart.plusDays(dayOffset);

                if (date.isBefore(today)) {
                    continue;
                }
                String slotKey = date + "-" + period;
                if (createdSlots.contains(slotKey)) {
                    continue;
                }
                String classSlotKey = date + "-" + period;
                String teacherSlotKey = teacher.getId() + "-" + date + "-" + period;
                if (existingClassSlots.contains(classSlotKey) || existingTeacherSlots.contains(teacherSlotKey)) {
                    conflictSkip = true;
                    continue;
                }

                Integer lineIdx = pairToLine.get(subject.getId() + "-" + teacher.getId());
                if (lineIdx == null) {
                    continue;
                }

                Schedule newSchedule = new Schedule();
                newSchedule.setDate(date);
                newSchedule.setPeriod(period);
                newSchedule.setRoom(classRoom);
                newSchedule.setSubject(subject);
                newSchedule.setTeacher(teacher);
                newSchedule.setSchool(school);
                newSchedule.setClassEntity(classEntity);
                newSchedule.setClassSection(resolveClassSection(classEntity, subject.getId(), teacher.getId(), null));

                toSave.add(newSchedule);
                linePerRow.add(lineIdx);
                createdSlots.add(slotKey);
                existingClassSlots.add(classSlotKey);
                existingTeacherSlots.add(teacherSlotKey);
            }
        }

        int[] perLine = new int[batch.size()];
        for (int i = 0; i < linePerRow.size(); i++) {
            int li = linePerRow.get(i);
            if (li >= 0 && li < perLine.length) {
                perLine[li]++;
            }
        }

        List<UnmetAssignment> unmetExpand = new ArrayList<>();
        for (GenAssign g : batch) {
            int exp = expectedPerLine[g.lineIndex];
            int got = perLine[g.lineIndex];
            if (got < exp) {
                UnmetAssignment u = new UnmetAssignment();
                u.setLineIndex(g.lineIndex);
                u.setSubjectId(g.subject.getId());
                u.setSubjectName(g.subject.getName());
                u.setTeacherId(g.teacherId);
                u.setTeacherName(g.teacher.getFullName());
                u.setRequiredPeriods(exp);
                u.setAssignedPeriods(got);
                unmetExpand.add(u);
            }
        }

        if (conflictSkip || !unmetExpand.isEmpty()) {
            out.setSuccess(false);
            out.setAssignedPeriods(0);
            out.setUnmetAssignments(unmetExpand);
            out.setMessage(conflictSkip
                    ? "Không thể tạo đủ tiết do trùng lịch lớp/giáo viên với dữ liệu có sẵn."
                    : "Không đủ số tiết có thể xếp được trong các tuần đã chọn (xem unmetAssignments).");
            return out;
        }

        List<Schedule> fixedActivities = buildFixedActivitySchedules(
                classEntity,
                school,
                sessionMode,
                nextMonday,
                numberOfWeeks,
                today,
                classRoom,
                classEntity.getHomeroomTeacher());
        for (Schedule fs : fixedActivities) {
            String classKey = fs.getDate().toString() + "-" + fs.getPeriod();
            if (createdSlots.contains(classKey)) {
                out.setSuccess(false);
                out.setAssignedPeriods(0);
                out.setUnmetAssignments(new ArrayList<>());
                out.setMessage("Ô tiết cố định (Chào cờ / Sinh hoạt lớp) trùng với tiết vừa xếp — kiểm tra logic block slot.");
                return out;
            }
            if (existingClassSlots.contains(classKey)) {
                out.setSuccess(false);
                out.setAssignedPeriods(0);
                out.setUnmetAssignments(new ArrayList<>());
                out.setMessage("Ô tiết cố định trùng lịch lớp đã có trong hệ thống.");
                return out;
            }
            if (fs.getTeacher() != null) {
                String tk = fs.getTeacher().getId() + "-" + fs.getDate().toString() + "-" + fs.getPeriod();
                if (existingTeacherSlots.contains(tk)) {
                    out.setSuccess(false);
                    out.setAssignedPeriods(0);
                    out.setUnmetAssignments(new ArrayList<>());
                    out.setMessage("Ô tiết cố định trùng lịch giáo viên chủ nhiệm với lịch đã có.");
                    return out;
                }
            }
            toSave.add(fs);
            createdSlots.add(classKey);
            existingClassSlots.add(classKey);
            if (fs.getTeacher() != null) {
                existingTeacherSlots.add(fs.getTeacher().getId() + "-" + fs.getDate().toString() + "-" + fs.getPeriod());
            }
        }

        scheduleRepository.saveAll(toSave);
        out.setSuccess(true);
        out.setAssignedPeriods(toSave.size());
        out.setMessage("Đã tạo thời khóa biểu tự động thành công.");
        return out;
    }

    private static void validateSubjectForGenerate(Subject s, Integer schoolId) {
        if (s.getDeletedAt() != null) {
            throw new BadRequestException("Subject id " + s.getId() + " is deleted");
        }
        if (s.getStatus() != null && !"ACTIVE".equalsIgnoreCase(s.getStatus().trim())) {
            throw new BadRequestException("Subject id " + s.getId() + " is not ACTIVE");
        }
        if (schoolId != null && s.getSchool() != null && s.getSchool().getId() != null
                && !schoolId.equals(s.getSchool().getId())) {
            throw new BadRequestException("Subject id " + s.getId() + " does not belong to this school");
        }
    }

    private static void validateTeacherForGenerate(User t, Integer schoolId) {
        if (t.getRole() == null || t.getRole().getName() == null) {
            throw new BadRequestException("Teacher id " + t.getId() + " has no role");
        }
        String rn = t.getRole().getName().toUpperCase();
        boolean isTeacher = rn.startsWith("TEACHER") || rn.contains("TEACHER")
                || rn.contains("GIÁO VIÊN") || rn.contains("GIAO VIEN") || rn.contains("GV");
        if (!isTeacher) {
            throw new BadRequestException("User id " + t.getId() + " is not a teacher role");
        }
        if (schoolId != null) {
            if (t.getSchool() == null || t.getSchool().getId() == null
                    || !schoolId.equals(t.getSchool().getId())) {
                throw new BadRequestException("Teacher id " + t.getId() + " does not belong to this school");
            }
        }
    }

    private static int computeWeeklyFreeSlotCapacity(LocalDate firstMonday, String sessionMode, Set<String> occupiedClassSlotsFirstWeek) {
        int count = 0;
        for (int d = 0; d < 6; d++) {
            LocalDate day = firstMonday.plusDays(d);
            String dateStr = day.toString();
            if ("MORNING".equals(sessionMode)) {
                for (int p = MIN_PERIOD; p <= 5; p++) {
                    if (!occupiedClassSlotsFirstWeek.contains(dateStr + "-" + p)) {
                        count++;
                    }
                }
            } else if ("AFTERNOON".equals(sessionMode)) {
                for (int p = 6; p <= MAX_PERIOD; p++) {
                    if (!occupiedClassSlotsFirstWeek.contains(dateStr + "-" + p)) {
                        count++;
                    }
                }
            } else {
                for (int p = MIN_PERIOD; p <= MAX_PERIOD; p++) {
                    if (!occupiedClassSlotsFirstWeek.contains(dateStr + "-" + p)) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private static final class GenAssign {
        int lineIndex;
        Subject subject;
        User teacher;
        Integer teacherId;
        int periodsPerWeek;
        int afternoonRemaining;
        int morningRemaining;
    }

    private int countPatternSlotsForGenAssign(GenAssign g, Map<String, Object[]> weekPattern) {
        int c = 0;
        for (Object[] v : weekPattern.values()) {
            Subject s = (Subject) v[0];
            User t = (User) v[1];
            if (s.getId() != null && g.subject.getId() != null && s.getId().equals(g.subject.getId())
                    && t.getId() != null && g.teacherId != null && t.getId().equals(g.teacherId)) {
                c++;
            }
        }
        return c;
    }

    /**
     * Gán tối đa {@code maxToAssign} slot từ {@code slots} vào pattern (tuần đầu). Trả về số slot đã gán được.
     */
    private int tryAssignSlotsToPattern(
            List<Object[]> slots,
            int maxToAssign,
            Subject subject,
            User teacher,
            Integer teacherId,
            LocalDate nextMonday,
            LocalDate today,
            Map<String, Object[]> weekPattern,
            Set<String> occupiedClassSlotsFirstWeek,
            Set<String> occupiedTeacherSlotsFirstWeek) {
        if (maxToAssign <= 0) {
            return 0;
        }
        int assigned = 0;
        for (Object[] slot : slots) {
            if (assigned >= maxToAssign) {
                break;
            }
            Integer dayOffset = (Integer) slot[0];
            Integer period = (Integer) slot[1];
            LocalDate firstWeekDate = nextMonday.plusDays(dayOffset);
            if (firstWeekDate.isBefore(today)) {
                continue;
            }
            String patternKey = dayOffset + "-" + period;
            if (weekPattern.containsKey(patternKey)) {
                continue;
            }
            String classSlotKey = firstWeekDate.toString() + "-" + period;
            String teacherSlotKey = teacherId + "-" + firstWeekDate.toString() + "-" + period;
            if (occupiedClassSlotsFirstWeek.contains(classSlotKey)
                    || occupiedTeacherSlotsFirstWeek.contains(teacherSlotKey)) {
                continue;
            }
            weekPattern.put(patternKey, new Object[]{subject, teacher, period, dayOffset});
            occupiedClassSlotsFirstWeek.add(classSlotKey);
            occupiedTeacherSlotsFirstWeek.add(teacherSlotKey);
            assigned++;
            System.out.println("✅ Pattern slot assigned: Day " + (dayOffset + 1) + " (offset=" + dayOffset + "), Period "
                    + period + " -> " + subject.getName() + " (" + teacher.getFullName() + ")");
        }
        return assigned;
    }

    private static Integer parseInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof Number) return ((Number) obj).intValue();
        if (obj instanceof String) {
            String s = (String) obj;
            if (s.trim().isEmpty()) return null;
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Gắn học phần (class_section): ưu tiên id gửi từ FE; nếu không có thì khớp lớp–môn–GV
     * và năm học của lớp khi có nhiều bản ghi (HK1/HK2).
     */
    private ClassSection resolveClassSection(ClassEntity classEntity, Integer subjectId, Integer teacherId,
                                             Integer explicitClassSectionId) {
        if (classEntity == null || subjectId == null || teacherId == null) return null;
        if (explicitClassSectionId != null) {
            ClassSection cs = classSectionRepository.findByIdFetchClassRoomAndSchool(explicitClassSectionId)
                    .orElseThrow(() -> new BadRequestException("classSection not found"));
            if (!Objects.equals(cs.getClassRoom().getId(), classEntity.getId())) {
                throw new BadRequestException("classSection does not belong to this class");
            }
            if (cs.getSubject() == null || cs.getTeacher() == null
                    || !subjectId.equals(cs.getSubject().getId())
                    || !teacherId.equals(cs.getTeacher().getId())) {
                throw new BadRequestException("classSection does not match subject/teacher");
            }
            return cs;
        }
        List<ClassSection> sections = classSectionRepository.findByClassRoomId(classEntity.getId());
        List<ClassSection> matches = sections.stream()
                .filter(cs -> cs.getSubject() != null && cs.getTeacher() != null
                        && subjectId.equals(cs.getSubject().getId())
                        && teacherId.equals(cs.getTeacher().getId()))
                .collect(Collectors.toList());
        if (matches.isEmpty()) return null;
        if (matches.size() == 1) return matches.get(0);

        String syName = classEntity.getSchoolYear() != null ? classEntity.getSchoolYear().getName() : null;
        if (syName != null) {
            Optional<ClassSection> byYear = matches.stream()
                    .filter(cs -> syName.equals(cs.getSchoolYear()))
                    .findFirst();
            if (byYear.isPresent()) return byYear.get();
        }
        return matches.get(0);
    }

    @Transactional
    public Schedule createSchedule(Map<String, Object> scheduleData) {
        Schedule schedule = new Schedule();
        Integer classId = parseInt(scheduleData.get("classId"));
        if (classId == null) throw new BadRequestException("classId is required");
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new BadRequestException("Class not found"));
        ClassStatusPolicy.assertTeachActionAllowed(classEntity, "tạo thời khóa biểu");
        schedule.setClassEntity(classEntity);
        schedule.setSchool(classEntity.getSchool());

        Integer subjectId = parseInt(scheduleData.get("subjectId"));
        if (subjectId != null) {
            schedule.setSubject(subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new BadRequestException("Subject not found")));
        }

        Integer teacherId = parseInt(scheduleData.get("teacherId"));
        if (teacherId != null) {
            schedule.setTeacher(userRepository.findById(teacherId)
                    .orElseThrow(() -> new BadRequestException("Teacher not found")));
        }

        Integer period = parseInt(scheduleData.get("period"));
        if (period == null || period < MIN_PERIOD || period > MAX_PERIOD) {
            throw new BadRequestException("Period must be between " + MIN_PERIOD + " and " + MAX_PERIOD);
        }
        schedule.setPeriod(period);

        LocalDate date = parseDate(scheduleData.get("date"));
        Integer explicitDayOfWeek = parseInt(scheduleData.get("dayOfWeek"));
        LocalDate weekStart = parseDate(scheduleData.get("weekStart"));

        if (date != null) {
            schedule.setDate(date);
            schedule.setDayOfWeek(null);
        } else if (explicitDayOfWeek != null && explicitDayOfWeek >= 1 && explicitDayOfWeek <= 6) {
            schedule.setDayOfWeek(explicitDayOfWeek);
            if (weekStart != null) {
                schedule.setDate(weekStart.plusDays(explicitDayOfWeek - 1L));
            } else {
                LocalDate today = LocalDate.now();
                int currentDayOfWeek = today.getDayOfWeek().getValue();
                int daysToAdd = explicitDayOfWeek - currentDayOfWeek;
                if (daysToAdd < 0) daysToAdd += 7;
                schedule.setDate(today.plusDays(daysToAdd));
            }
        } else {
            throw new BadRequestException("Either date or dayOfWeek is required");
        }

        date = schedule.getDate();
        if (date == null) throw new BadRequestException("Either date or dayOfWeek is required");

        String room = (String) scheduleData.get("room");
        if (room == null || room.trim().isEmpty()) {
            room = (classEntity.getRoom() != null && !classEntity.getRoom().trim().isEmpty())
                    ? classEntity.getRoom() : "A" + String.format("%03d", classId);
        }
        schedule.setRoom(room);

        Integer explicitCsId = parseInt(scheduleData.get("classSectionId"));
        if (subjectId != null && teacherId != null) {
            ClassSection matched = resolveClassSection(classEntity, subjectId, teacherId, explicitCsId);
            schedule.setClassSection(matched);
        }

        List<Schedule> conflicts = findConflictsByDate(date, period, teacherId, classId);
        if (!conflicts.isEmpty()) throw new BadRequestException("Schedule conflict detected");

        Schedule saved = scheduleRepository.save(schedule);
        return scheduleRepository.findByIdWithRelations(saved.getId()).orElse(saved);
    }

    private static LocalDate parseDate(Object dateObj) {
        if (dateObj == null || dateObj.toString().trim().isEmpty()) return null;
        if (dateObj instanceof LocalDate) return (LocalDate) dateObj;
        if (dateObj instanceof String) {
            try {
                return LocalDate.parse(((String) dateObj).trim());
            } catch (Exception e) {
                throw new BadRequestException("Invalid date format. Use YYYY-MM-DD. Received: " + dateObj);
            }
        }
        return null;
    }

    @Transactional
    public Schedule updateSchedule(Integer id, Map<String, Object> scheduleData) {
        Schedule schedule = getScheduleById(id);

        Object classIdObj = scheduleData.get("classId");
        if (classIdObj != null) {
            Integer classId = parseInt(classIdObj);
            if (classId != null) {
                ClassEntity classEntity = classRepository.findById(classId)
                        .orElseThrow(() -> new BadRequestException("Class not found"));
                ClassStatusPolicy.assertTeachActionAllowed(classEntity, "cập nhật thời khóa biểu");
                schedule.setClassEntity(classEntity);
                schedule.setSchool(classEntity.getSchool());
            }
        }
        ClassStatusPolicy.assertTeachActionAllowed(schedule.getClassEntity(), "cập nhật thời khóa biểu");

        Object subjectIdObj = scheduleData.get("subjectId");
        Integer subjectId = null;
        if (subjectIdObj != null) {
            subjectId = parseInt(subjectIdObj);
            if (subjectId != null) {
                schedule.setSubject(subjectRepository.findById(subjectId)
                        .orElseThrow(() -> new BadRequestException("Subject not found")));
                schedule.setFixedActivityCode(null);
            }
        }

        Object teacherIdObj = scheduleData.get("teacherId");
        Integer teacherId = null;
        if (teacherIdObj != null) {
            teacherId = parseInt(teacherIdObj);
            if (teacherId != null) {
                schedule.setTeacher(userRepository.findById(teacherId)
                        .orElseThrow(() -> new BadRequestException("Teacher not found")));
            }
        }

        Object periodObj = scheduleData.get("period");
        if (periodObj != null) {
            Integer period = parseInt(periodObj);
            if (period != null && period >= MIN_PERIOD && period <= MAX_PERIOD) schedule.setPeriod(period);
        }

        Object dateObj = scheduleData.get("date");
        if (dateObj != null && !dateObj.toString().trim().isEmpty()) {
            LocalDate parsed = parseDate(dateObj);
            if (parsed != null) {
                schedule.setDate(parsed);
                schedule.setDayOfWeek(null);
            }
        } else if (scheduleData.containsKey("dayOfWeek") || scheduleData.containsKey("weekStart")) {
            Object dayOfWeekObj = scheduleData.get("dayOfWeek");
            if (dayOfWeekObj != null && !dayOfWeekObj.toString().trim().isEmpty()) {
                Integer dayOfWeek = parseInt(dayOfWeekObj);
                if (dayOfWeek != null && dayOfWeek >= 1 && dayOfWeek <= 6) {
                    schedule.setDayOfWeek(dayOfWeek);
                    LocalDate weekStart = parseDate(scheduleData.get("weekStart"));
                    if (weekStart != null) {
                        schedule.setDate(weekStart.plusDays(dayOfWeek - 1L));
                    } else {
                        LocalDate today = LocalDate.now();
                        int currentDayOfWeek = today.getDayOfWeek().getValue();
                        int daysToAdd = dayOfWeek - currentDayOfWeek;
                        if (daysToAdd < 0) daysToAdd += 7;
                        schedule.setDate(today.plusDays(daysToAdd));
                    }
                }
            }
        }

        String room = (String) scheduleData.get("room");
        if (room != null) schedule.setRoom(room);

        ClassEntity effectiveClass = schedule.getClassEntity();
        Integer effectiveSubjectId = subjectId != null ? subjectId
                : (schedule.getSubject() != null ? schedule.getSubject().getId() : null);
        Integer effectiveTeacherId = teacherId != null ? teacherId
                : (schedule.getTeacher() != null ? schedule.getTeacher().getId() : null);
        Integer explicitCsId = parseInt(scheduleData.get("classSectionId"));

        if (effectiveClass != null && effectiveSubjectId != null && effectiveTeacherId != null) {
            ClassSection matched = resolveClassSection(effectiveClass, effectiveSubjectId, effectiveTeacherId, explicitCsId);
            schedule.setClassSection(matched);
        }

        Schedule saved = scheduleRepository.save(schedule);
        return scheduleRepository.findByIdWithRelations(saved.getId()).orElse(saved);
    }
}

