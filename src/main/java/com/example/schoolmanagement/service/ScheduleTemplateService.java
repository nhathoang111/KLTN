package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.schedule.GenerateFromTemplateRequest;
import com.example.schoolmanagement.dto.schedule.GenerateFromTemplateResult;
import com.example.schoolmanagement.dto.schedule.ScheduleTemplateSaveRequest;
import com.example.schoolmanagement.dto.schedule.ScheduleTemplateSlotRequest;
import com.example.schoolmanagement.entity.*;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
public class ScheduleTemplateService {

    private static final int MIN_PERIOD = 1;
    private static final int MAX_PERIOD = 10;
    private static final int MONDAY = 1;
    private static final int SATURDAY = 6;
    private static final int MORNING_FIRST_PERIOD = 1;
    private static final int MORNING_LAST_PERIOD = 5;
    private static final String FIXED_ACTIVITY_CHAOCO = "CHAOCO";
    private static final String FIXED_ACTIVITY_SHL = "SHL";

    @Autowired
    private ScheduleTemplateRepository scheduleTemplateRepository;
    @Autowired
    private ScheduleRepository scheduleRepository;
    @Autowired
    private ClassRepository classRepository;
    @Autowired
    private SubjectRepository subjectRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClassSectionRepository classSectionRepository;

    public List<ScheduleTemplate> getTemplateByClassAndWeekStart(Integer classId, LocalDate weekStart) {
        if (classId == null || weekStart == null) {
            throw new BadRequestException("classId and weekStart are required");
        }
        return scheduleTemplateRepository.findByClassIdAndWeekStartWithRelations(classId, normalizeToMonday(weekStart));
    }

    @Transactional
    public List<ScheduleTemplate> saveTemplate(ScheduleTemplateSaveRequest request) {
        if (request == null || request.getClassId() == null || request.getWeekStart() == null) {
            throw new BadRequestException("classId and weekStart are required");
        }
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            throw new BadRequestException("slots is required");
        }

        LocalDate weekStart = normalizeToMonday(request.getWeekStart());
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        School school = classEntity.getSchool();
        if (school == null) {
            throw new BadRequestException("Class has no school");
        }

        List<ScheduleTemplate> toSave = new ArrayList<>();
        Set<String> classSlotDedup = new HashSet<>();
        Set<String> teacherSlotDedup = new HashSet<>();
        boolean hasChaoco = false;
        boolean hasShl = false;

        for (int i = 0; i < request.getSlots().size(); i++) {
            final int rowIndex = i;
            ScheduleTemplateSlotRequest slot = request.getSlots().get(i);
            if (slot == null) {
                throw new BadRequestException("slots[" + rowIndex + "] is invalid");
            }
            if (slot.getPeriod() == null || slot.getPeriod() < MIN_PERIOD || slot.getPeriod() > MAX_PERIOD) {
                throw new BadRequestException("slots[" + rowIndex + "]: period must be between 1 and 10");
            }

            LocalDate date = resolveTemplateDate(slot, weekStart, rowIndex);
            Integer dayOfWeek = date.getDayOfWeek().getValue();
            if (dayOfWeek < 1 || dayOfWeek > 6) {
                throw new BadRequestException("slots[" + rowIndex + "]: only Monday-Saturday are allowed");
            }

            String classKey = date + "-" + slot.getPeriod();
            if (!classSlotDedup.add(classKey)) {
                throw new BadRequestException("Duplicate class slot in request at slots[" + rowIndex + "]");
            }

            User teacher = null;
            if (slot.getTeacherId() != null) {
                teacher = userRepository.findById(slot.getTeacherId())
                        .orElseThrow(() -> new BadRequestException("slots[" + rowIndex + "]: teacher not found"));
                String teacherKey = teacher.getId() + "-" + classKey;
                if (!teacherSlotDedup.add(teacherKey)) {
                    throw new BadRequestException("Duplicate teacher slot in request at slots[" + rowIndex + "]");
                }
            }

            Subject subject = null;
            if (slot.getSubjectId() != null) {
                subject = subjectRepository.findById(slot.getSubjectId())
                        .orElseThrow(() -> new BadRequestException("slots[" + rowIndex + "]: subject not found"));
            }

            ClassSection classSection = null;
            if (slot.getClassSectionId() != null) {
                classSection = classSectionRepository.findByIdFetchClassRoomAndSchool(slot.getClassSectionId())
                        .orElseThrow(() -> new BadRequestException("slots[" + rowIndex + "]: classSection not found"));
                if (!Objects.equals(classSection.getClassRoom().getId(), classEntity.getId())) {
                    throw new BadRequestException("slots[" + rowIndex + "]: classSection does not belong to class");
                }
            }

            ScheduleTemplate row = new ScheduleTemplate();
            row.setSchool(school);
            row.setClassEntity(classEntity);
            row.setWeekStart(weekStart);
            row.setDate(date);
            row.setDayOfWeek(dayOfWeek);
            row.setPeriod(slot.getPeriod());
            row.setSubject(subject);
            row.setTeacher(teacher);
            row.setClassSection(classSection);
            row.setRoom(slot.getRoom() != null ? slot.getRoom() : classEntity.getRoom());
            row.setFixedActivityCode(normalizeFixedCode(slot.getFixedActivityCode()));
            enforceFixedActivityRules(row, classEntity);
            if (FIXED_ACTIVITY_CHAOCO.equals(row.getFixedActivityCode())) {
                hasChaoco = true;
            } else if (FIXED_ACTIVITY_SHL.equals(row.getFixedActivityCode())) {
                hasShl = true;
            }
            row.setStatus("ACTIVE");
            toSave.add(row);
        }

        if (!hasChaoco) {
            throw new BadRequestException("Thời khóa biểu mẫu bắt buộc có Chào cờ vào Thứ 2 tiết 1.");
        }
        if (!hasShl) {
            throw new BadRequestException("Thời khóa biểu mẫu bắt buộc có Sinh hoạt lớp vào Thứ 7 tiết 5.");
        }

        scheduleTemplateRepository.deleteByClassEntityIdAndWeekStart(classEntity.getId(), weekStart);
        scheduleTemplateRepository.saveAll(toSave);
        return scheduleTemplateRepository.findByClassIdAndWeekStartWithRelations(classEntity.getId(), weekStart);
    }

    @Transactional
    public int deleteTemplate(Integer classId, LocalDate weekStart) {
        if (classId == null || weekStart == null) {
            throw new BadRequestException("classId and weekStart are required");
        }
        LocalDate normalized = normalizeToMonday(weekStart);
        List<ScheduleTemplate> rows = scheduleTemplateRepository.findByClassIdAndWeekStart(classId, normalized);
        int count = rows.size();
        scheduleTemplateRepository.deleteAll(rows);
        return count;
    }

    @Transactional
    public GenerateFromTemplateResult generateFromTemplate(GenerateFromTemplateRequest request) {
        if (request == null || request.getClassId() == null
                || request.getWeekStartTemplate() == null
                || request.getSemesterStart() == null
                || request.getSemesterEnd() == null) {
            throw new BadRequestException("classId, weekStartTemplate, semesterStart, semesterEnd are required");
        }
        if (request.getSemesterEnd().isBefore(request.getSemesterStart())) {
            throw new BadRequestException("semesterEnd must be >= semesterStart");
        }

        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        LocalDate templateMonday = normalizeToMonday(request.getWeekStartTemplate());
        List<ScheduleTemplate> templates = scheduleTemplateRepository
                .findByClassIdAndWeekStartWithRelations(classEntity.getId(), templateMonday);
        if (templates.isEmpty()) {
            throw new BadRequestException("No template found for class/weekStartTemplate");
        }
        validateRequiredFixedRules(templates);

        LocalDate semesterStart = request.getSemesterStart();
        LocalDate semesterEnd = request.getSemesterEnd();

        List<Schedule> existingByClass = scheduleRepository.findByClassEntityId(classEntity.getId());
        List<Schedule> toDelete = new ArrayList<>();
        for (Schedule s : existingByClass) {
            if (s.getDate() == null) {
                continue;
            }
            if (!s.getDate().isBefore(semesterStart) && !s.getDate().isAfter(semesterEnd)) {
                toDelete.add(s);
            }
        }
        int deletedCount = toDelete.size();
        if (!toDelete.isEmpty()) {
            scheduleRepository.deleteAll(toDelete);
        }

        Map<String, ScheduleTemplate> pattern = new LinkedHashMap<>();
        for (ScheduleTemplate t : templates) {
            Integer dow = t.getDayOfWeek();
            if (dow == null && t.getDate() != null) {
                dow = t.getDate().getDayOfWeek().getValue();
            }
            if (dow == null || dow < 1 || dow > 6) {
                continue;
            }
            pattern.put(dow + "-" + t.getPeriod(), t);
        }

        LocalDate firstMonday = normalizeToMonday(semesterStart);
        LocalDate lastMonday = normalizeToMonday(semesterEnd);
        List<Schedule> toCreate = new ArrayList<>();
        int skippedPastDateCount = 0;
        LocalDate today = LocalDate.now();
        for (LocalDate monday = firstMonday; !monday.isAfter(lastMonday); monday = monday.plusWeeks(1)) {
            for (ScheduleTemplate t : pattern.values()) {
                Integer dow = t.getDayOfWeek();
                if (dow == null) {
                    if (t.getDate() == null) {
                        continue;
                    }
                    dow = t.getDate().getDayOfWeek().getValue();
                }
                LocalDate realDate = monday.plusDays(dow - 1L);
                if (realDate.isBefore(semesterStart) || realDate.isAfter(semesterEnd)) {
                    continue;
                }
                if (realDate.isBefore(today)) {
                    skippedPastDateCount++;
                    continue;
                }

                Schedule sch = new Schedule();
                sch.setClassEntity(classEntity);
                sch.setSchool(classEntity.getSchool());
                sch.setDate(realDate);
                sch.setDayOfWeek(dow);
                sch.setPeriod(t.getPeriod());
                sch.setRoom(t.getRoom());
                sch.setSubject(t.getSubject());
                sch.setTeacher(t.getTeacher());
                sch.setClassSection(t.getClassSection());
                sch.setFixedActivityCode(t.getFixedActivityCode());
                toCreate.add(sch);
            }
        }

        ensureNoTeacherConflictForGeneratedSchedules(toCreate, toDelete);

        if (!toCreate.isEmpty()) {
            scheduleRepository.saveAll(toCreate);
        }

        GenerateFromTemplateResult result = new GenerateFromTemplateResult();
        result.setSuccess(true);
        result.setDeletedCount(deletedCount);
        result.setCreatedCount(toCreate.size());
        result.setSkippedPastDateCount(skippedPastDateCount);
        result.setMessage("Đã sinh thời khóa biểu từ mẫu thành công.");
        return result;
    }

    private static String normalizeFixedCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            return null;
        }
        String normalized = code.trim().toUpperCase();
        if ("CHAOCO".equals(normalized) || "SHL".equals(normalized)) {
            return normalized;
        }
        return normalized;
    }

    private static void enforceFixedActivityRules(ScheduleTemplate row, ClassEntity classEntity) {
        if (row == null || row.getDayOfWeek() == null || row.getPeriod() == null) {
            return;
        }

        boolean isChaocoSlot = row.getDayOfWeek() == MONDAY && row.getPeriod() == MORNING_FIRST_PERIOD;
        boolean isShlSlot = row.getDayOfWeek() == SATURDAY && row.getPeriod() == MORNING_LAST_PERIOD;

        if (isChaocoSlot) {
            row.setFixedActivityCode(FIXED_ACTIVITY_CHAOCO);
            row.setSubject(null);
            row.setClassSection(null);
            row.setTeacher(classEntity != null ? classEntity.getHomeroomTeacher() : row.getTeacher());
            return;
        }
        if (isShlSlot) {
            row.setFixedActivityCode(FIXED_ACTIVITY_SHL);
            row.setSubject(null);
            row.setClassSection(null);
            row.setTeacher(classEntity != null ? classEntity.getHomeroomTeacher() : row.getTeacher());
            return;
        }

        if (FIXED_ACTIVITY_CHAOCO.equals(row.getFixedActivityCode()) || FIXED_ACTIVITY_SHL.equals(row.getFixedActivityCode())) {
            throw new BadRequestException("Mã tiết cố định chỉ được dùng cho Thứ 2 tiết 1 (Chào cờ) và Thứ 7 tiết 5 (Sinh hoạt lớp).");
        }
    }

    private static void validateRequiredFixedRules(List<ScheduleTemplate> templates) {
        boolean hasChaoco = false;
        boolean hasShl = false;
        for (ScheduleTemplate t : templates) {
            Integer dow = t.getDayOfWeek();
            if (dow == null && t.getDate() != null) {
                dow = t.getDate().getDayOfWeek().getValue();
            }
            Integer period = t.getPeriod();
            String fixedCode = normalizeFixedCode(t.getFixedActivityCode());
            if (dow != null && period != null && dow == MONDAY && period == MORNING_FIRST_PERIOD && FIXED_ACTIVITY_CHAOCO.equals(fixedCode)) {
                hasChaoco = true;
            }
            if (dow != null && period != null && dow == SATURDAY && period == MORNING_LAST_PERIOD && FIXED_ACTIVITY_SHL.equals(fixedCode)) {
                hasShl = true;
            }
        }
        if (!hasChaoco) {
            throw new BadRequestException("Mẫu chưa có Chào cờ ở Thứ 2 tiết 1.");
        }
        if (!hasShl) {
            throw new BadRequestException("Mẫu chưa có Sinh hoạt lớp ở Thứ 7 tiết 5.");
        }
    }

    private void ensureNoTeacherConflictForGeneratedSchedules(List<Schedule> toCreate, List<Schedule> toDelete) {
        if (toCreate == null || toCreate.isEmpty()) {
            return;
        }

        Set<Integer> generatedTeacherIds = new HashSet<>();
        for (Schedule s : toCreate) {
            if (s.getTeacher() != null && s.getTeacher().getId() != null) {
                generatedTeacherIds.add(s.getTeacher().getId());
            }
        }
        if (generatedTeacherIds.isEmpty()) {
            return;
        }

        Set<Integer> deletedScheduleIds = new HashSet<>();
        if (toDelete != null) {
            for (Schedule s : toDelete) {
                if (s.getId() != null) {
                    deletedScheduleIds.add(s.getId());
                }
            }
        }

        Set<String> occupiedTeacherSlots = new HashSet<>();
        for (Integer teacherId : generatedTeacherIds) {
            List<Schedule> teacherSchedules = scheduleRepository.findByTeacherId(teacherId);
            for (Schedule existing : teacherSchedules) {
                if (existing.getDate() == null || existing.getPeriod() == null || existing.getTeacher() == null || existing.getTeacher().getId() == null) {
                    continue;
                }
                if (existing.getId() != null && deletedScheduleIds.contains(existing.getId())) {
                    continue;
                }
                occupiedTeacherSlots.add(existing.getTeacher().getId() + "-" + existing.getDate() + "-" + existing.getPeriod());
            }
        }

        for (Schedule s : toCreate) {
            if (s.getTeacher() == null || s.getTeacher().getId() == null || s.getDate() == null || s.getPeriod() == null) {
                continue;
            }
            String key = s.getTeacher().getId() + "-" + s.getDate() + "-" + s.getPeriod();
            if (occupiedTeacherSlots.contains(key)) {
                throw new BadRequestException("Trùng lịch giáo viên khi sinh từ mẫu: giáo viên " + s.getTeacher().getId()
                        + " đã có lịch vào " + s.getDate() + " tiết " + s.getPeriod() + ".");
            }
            occupiedTeacherSlots.add(key);
        }
    }

    private static LocalDate resolveTemplateDate(ScheduleTemplateSlotRequest slot, LocalDate weekStart, int index) {
        if (slot.getDate() != null) {
            LocalDate d = slot.getDate();
            if (d.isBefore(weekStart) || d.isAfter(weekStart.plusDays(5))) {
                throw new BadRequestException("slots[" + index + "]: date must be inside weekStart Monday-Saturday");
            }
            return d;
        }
        if (slot.getDayOfWeek() == null || slot.getDayOfWeek() < 1 || slot.getDayOfWeek() > 6) {
            throw new BadRequestException("slots[" + index + "]: either date or dayOfWeek (1..6) is required");
        }
        return weekStart.plusDays(slot.getDayOfWeek() - 1L);
    }

    private static LocalDate normalizeToMonday(LocalDate d) {
        if (d == null) {
            return null;
        }
        return d.with(DayOfWeek.MONDAY);
    }
}
