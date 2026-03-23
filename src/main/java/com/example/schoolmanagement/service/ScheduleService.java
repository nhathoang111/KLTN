package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
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
        getScheduleById(id);
        scheduleRepository.deleteById(id);
    }

    public int deleteAllSchedulesByClass(Integer classId) {
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
    public int generateSchedules(Integer classId, Integer schoolId, List<Map<String, Object>> subjectAssignments, Integer numberOfWeeks) {
        // Lấy class entity
        Optional<ClassEntity> classOpt = classRepository.findById(classId);
        if (!classOpt.isPresent()) {
            throw new ResourceNotFoundException("Class not found");
        }
        ClassEntity classEntity = classOpt.get();
        
        // Lấy school entity
        School school = classEntity.getSchool();
        if (school == null) {
            throw new ResourceNotFoundException("School not found for class");
        }
        
        // Tính toán tuần để tạo lịch - CHỈ tạo cho tuần tiếp theo
        LocalDate today = LocalDate.now();
        System.out.println("🔍 ===== GENERATE SCHEDULES START =====");
        System.out.println("📅 TODAY: " + today + " (Day of week: " + today.getDayOfWeek() + ")");
        
        // Tìm Thứ 2 của tuần hiện tại
        LocalDate currentMonday = today;
        while (currentMonday.getDayOfWeek().getValue() != 1) { // 1 = Monday
            currentMonday = currentMonday.minusDays(1);
        }
        System.out.println("📅 Current Monday: " + currentMonday + " (Day: " + currentMonday.getDayOfWeek() + ")");
        
        // Tính thứ 2 tuần tiếp theo
        final LocalDate nextMonday;
        if (today.getDayOfWeek().getValue() == 1) {
            // Hôm nay là thứ 2 - dùng thứ 2 tuần này (hôm nay) để tạo lịch cho tuần hiện tại
            nextMonday = currentMonday; // currentMonday = today khi today là thứ 2
            System.out.println("📅 Today is Monday (" + today + "), using this Monday for schedule generation: " + nextMonday);
        } else {
            // Hôm nay không phải thứ 2, dùng thứ 2 tuần sau (từ currentMonday)
            nextMonday = currentMonday.plusDays(7);
            System.out.println("📅 Today is not Monday, using next week Monday: " + nextMonday);
        }
        
        System.out.println("📅 Next Monday (will use this): " + nextMonday + " (Day: " + nextMonday.getDayOfWeek() + ")");
        System.out.println("📅 Today: " + today + " (Day: " + today.getDayOfWeek() + ")");
        System.out.println("📅 Number of weeks to generate: " + numberOfWeeks);
        
        // Tạo danh sách các ngày cho tất cả các tuần (Thứ 2 đến Thứ 7, bỏ Chủ nhật)
        List<LocalDate> weekDates = new ArrayList<>();
        for (int week = 0; week < numberOfWeeks; week++) {
            LocalDate weekStart = nextMonday.plusWeeks(week);
            System.out.println("📅 Creating week dates for week " + (week + 1) + " from " + weekStart + " (Monday) to " + weekStart.plusDays(5) + " (Saturday)");
            for (int i = 0; i < 6; i++) { // 6 ngày: Thứ 2 (i=0) đến Thứ 7 (i=5)
                LocalDate date = weekStart.plusDays(i);
                weekDates.add(date);
                String dayName = date.getDayOfWeek().toString();
                System.out.println("✅ [Week " + (week + 1) + ", Day " + (i+1) + "/6] Added date: " + date + " (Day: " + dayName + ")");
            }
        }
        
        System.out.println("📅 Final week dates count: " + weekDates.size() + " (should be " + (numberOfWeeks * 6) + " = " + numberOfWeeks + " weeks × 6 days)");
        System.out.println("📅 Week dates: " + weekDates);
        
        // Lấy danh sách schedules hiện có của lớp để tránh conflict
        // CHỈ kiểm tra conflict cho tuần đầu tiên khi tạo pattern
        List<Schedule> existingSchedules = scheduleRepository.findByClassEntityId(classId);
        Set<String> occupiedClassSlotsFirstWeek = new HashSet<>();
        Set<String> occupiedTeacherSlotsFirstWeek = new HashSet<>();
        
        // Xác định phòng cố định cho lớp này
        String classRoom = null;
        if (classEntity.getRoom() != null && !classEntity.getRoom().trim().isEmpty()) {
            classRoom = classEntity.getRoom();
            System.out.println("🏫 Using room from ClassEntity for class " + classEntity.getName() + ": " + classRoom);
        } else {
            classRoom = "A" + String.format("%03d", classId);
            System.out.println("🏫 Assigning new default room for class " + classEntity.getName() + ": " + classRoom);
        }
        
        // Chỉ block các schedule của tuần đầu tiên (để tạo pattern)
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
        
        // Lấy schedules của các giáo viên cho tuần đầu tiên
        for (Map<String, Object> assignment : subjectAssignments) {
            Integer teacherId = parseInt(assignment.get("teacherId"));
            if (teacherId != null) {
                List<Schedule> teacherSchedules = scheduleRepository.findByTeacherId(teacherId);
                for (Schedule s : teacherSchedules) {
                    if (s.getDate() != null) {
                        for (int i = 0; i < 6; i++) {
                            LocalDate firstWeekDate = firstWeekStart.plusDays(i);
                            if (s.getDate().equals(firstWeekDate)) {
                                occupiedTeacherSlotsFirstWeek.add(teacherId + "-" + s.getDate().toString() + "-" + s.getPeriod());
                            }
                        }
                    }
                }
            }
        }
        
        int createdCount = 0;
        
        // Hai nhóm slot: sáng (1–5) và chiều (6–9), shuffle riêng — tránh trường hợp random chỉ trúng buổi sáng
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
        
        System.out.println("📊 Morning slots: " + morningSlots.size() + ", afternoon slots: " + afternoonSlots.size());
        
        // Lưu pattern: Map<dayOffset-period, subject-teacher>
        Map<String, Object[]> weekPattern = new HashMap<>();
        
        // Shuffle danh sách môn học để random hóa thứ tự phân bổ
        List<Map<String, Object>> shuffledAssignments = new ArrayList<>(subjectAssignments);
        Collections.shuffle(shuffledAssignments);
        
        System.out.println("📚 Subject assignments shuffled for random distribution");
        
        List<GenAssign> batch = new ArrayList<>();
        for (Map<String, Object> assignment : shuffledAssignments) {
            Integer subjectId = parseInt(assignment.get("subjectId"));
            Integer teacherId = parseInt(assignment.get("teacherId"));
            Integer periodsPerWeek = parseInt(assignment.get("periodsPerWeek"));
            if (subjectId == null || teacherId == null || periodsPerWeek == null || periodsPerWeek < 1) {
                continue;
            }
            Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
            Optional<User> teacherOpt = userRepository.findById(teacherId);
            if (!subjectOpt.isPresent() || !teacherOpt.isPresent()) {
                continue;
            }
            GenAssign g = new GenAssign();
            g.subject = subjectOpt.get();
            g.teacher = teacherOpt.get();
            g.teacherId = teacherId;
            g.periodsPerWeek = periodsPerWeek;
            int afternoonCap = Math.min(AFTERNOON_PERIOD_COUNT, (periodsPerWeek + 1) / 2);
            g.afternoonRemaining = afternoonCap;
            g.morningRemaining = periodsPerWeek - afternoonCap;
            batch.add(g);
            System.out.println("📚 Queued " + g.subject.getName() + " P=" + periodsPerWeek
                    + " (chiều " + g.afternoonRemaining + ", sáng " + g.morningRemaining + ")");
        }
        
        // Round-robin chiều: mỗi vòng mỗi môn tối đa 1 tiết chiều — tránh một môn chiếm hết slot chiều
        boolean progress;
        do {
            progress = false;
            Collections.shuffle(afternoonSlots);
            for (GenAssign g : batch) {
                if (g.afternoonRemaining <= 0) {
                    continue;
                }
                int n = tryAssignSlotsToPattern(afternoonSlots, 1, g.subject, g.teacher, g.teacherId,
                        nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
                if (n > 0) {
                    g.afternoonRemaining--;
                    progress = true;
                }
            }
        } while (progress);
        
        for (GenAssign g : batch) {
            if (g.morningRemaining <= 0) {
                continue;
            }
            Collections.shuffle(morningSlots);
            int n = tryAssignSlotsToPattern(morningSlots, g.morningRemaining, g.subject, g.teacher, g.teacherId,
                    nextMonday, today, weekPattern, occupiedClassSlotsFirstWeek, occupiedTeacherSlotsFirstWeek);
            g.morningRemaining -= n;
        }
        
        for (GenAssign g : batch) {
            int have = countPatternSlotsForSubject(g.subject, weekPattern);
            int need = g.periodsPerWeek - have;
            if (need <= 0) {
                continue;
            }
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
        
        System.out.println("📋 Pattern created with " + weekPattern.size() + " slots");
        System.out.println("📋 Pattern details:");
        for (Map.Entry<String, Object[]> entry : weekPattern.entrySet()) {
            String key = entry.getKey();
            Object[] value = entry.getValue();
            Subject s = (Subject) value[0];
            User t = (User) value[1];
            Integer p = (Integer) value[2];
            System.out.println("  - " + key + " -> " + s.getName() + " (" + t.getFullName() + ") period " + p);
        }
        
        // Áp dụng pattern cho tất cả các tuần
        // Tạo Set để track các slot đã tạo (tránh duplicate)
        Set<String> createdSlots = new HashSet<>();
        
        // Lấy tất cả schedules hiện có của lớp và giáo viên để kiểm tra conflict
        // Chỉ kiểm tra conflict với database, không kiểm tra với các slot vừa tạo
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
        
        // Lấy schedules của các giáo viên
        for (Map<String, Object> assignment : subjectAssignments) {
            Integer teacherId = parseInt(assignment.get("teacherId"));
            if (teacherId != null) {
                List<Schedule> teacherSchedules = scheduleRepository.findByTeacherId(teacherId);
                for (Schedule s : teacherSchedules) {
                    if (s.getDate() != null) {
                        existingTeacherSlots.add(teacherId + "-" + s.getDate().toString() + "-" + s.getPeriod());
                    }
                }
            }
        }
        
        // Áp dụng pattern cho từng tuần
        for (int week = 0; week < numberOfWeeks; week++) {
            LocalDate weekStart = nextMonday.plusWeeks(week);
            System.out.println("📅 ===== Applying pattern to week " + (week + 1) + " (starting " + weekStart + ") =====");
            
            // Duyệt pattern theo thứ tự deterministic (dayOffset, period) — không dùng sort chuỗi (tránh lỗi "10" < "2")
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
                
                // Chỉ tạo cho các ngày trong tương lai hoặc hôm nay
                if (date.isBefore(today)) {
                    System.out.println("⚠️ Skipping past date: " + date + " period " + period);
                    continue;
                }
                
                String slotKey = date.toString() + "-" + period;
                
                // Kiểm tra xem slot này đã được tạo chưa (tránh duplicate)
                if (createdSlots.contains(slotKey)) {
                    System.out.println("⚠️ Skipping slot (already created): " + date + " period " + period);
                    continue;
                }
                
                // Kiểm tra conflict với database
                String classSlotKey = date.toString() + "-" + period;
                String teacherSlotKey = teacher.getId() + "-" + date.toString() + "-" + period;
                
                if (existingClassSlots.contains(classSlotKey)) {
                    System.out.println("⚠️ Skipping slot (class conflict in DB): " + date + " period " + period);
                    continue;
                }
                
                if (existingTeacherSlots.contains(teacherSlotKey)) {
                    System.out.println("⚠️ Skipping slot (teacher conflict in DB): " + date + " period " + period);
                    continue;
                }
                
                // Tạo schedule mới
                Schedule newSchedule = new Schedule();
                newSchedule.setDate(date);
                newSchedule.setPeriod(period);
                newSchedule.setRoom(classRoom);
                newSchedule.setSubject(subject);
                newSchedule.setTeacher(teacher);
                newSchedule.setSchool(school);
                newSchedule.setClassEntity(classEntity);
                ClassSection linkedCs = resolveClassSection(classEntity, subject.getId(), teacher.getId(), null);
                newSchedule.setClassSection(linkedCs);
                
                try {
                    scheduleRepository.save(newSchedule);
                    createdSlots.add(slotKey);
                    existingClassSlots.add(classSlotKey); // Thêm vào để tránh conflict với các tuần sau
                    existingTeacherSlots.add(teacherSlotKey);
                    createdCount++;
                    String dayName = date.getDayOfWeek().toString();
                    System.out.println("✅ Week " + (week + 1) + " - " + dayName + " period " + period + 
                                     ": " + subject.getName() + " (" + teacher.getFullName() + ") - " + date);
                } catch (Exception e) {
                    System.out.println("❌ ERROR saving schedule: " + e.getMessage());
                    e.printStackTrace();
                }
            }
        }
        
        System.out.println("🔍 ===== GENERATE SCHEDULES COMPLETE: Created " + createdCount + " schedules =====");
        
        return createdCount;
    }

    private static final class GenAssign {
        Subject subject;
        User teacher;
        Integer teacherId;
        int periodsPerWeek;
        int afternoonRemaining;
        int morningRemaining;
    }

    private int countPatternSlotsForSubject(Subject subject, Map<String, Object[]> weekPattern) {
        int c = 0;
        for (Object[] v : weekPattern.values()) {
            Subject s = (Subject) v[0];
            if (s.getId() != null && subject.getId() != null && s.getId().equals(subject.getId())) {
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
                schedule.setClassEntity(classEntity);
                schedule.setSchool(classEntity.getSchool());
            }
        }

        Object subjectIdObj = scheduleData.get("subjectId");
        Integer subjectId = null;
        if (subjectIdObj != null) {
            subjectId = parseInt(subjectIdObj);
            if (subjectId != null) {
                schedule.setSubject(subjectRepository.findById(subjectId)
                        .orElseThrow(() -> new BadRequestException("Subject not found")));
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

