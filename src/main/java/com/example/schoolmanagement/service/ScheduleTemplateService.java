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
    private static final int SHL_PERIOD = 4;
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
            throw new BadRequestException("Vui lòng chọn lớp và tuần mẫu.");
        }
        return scheduleTemplateRepository.findByClassIdAndWeekStartWithRelations(classId, normalizeToMonday(weekStart));
    }

    @Transactional
    public List<ScheduleTemplate> saveTemplate(ScheduleTemplateSaveRequest request) {
        if (request == null || request.getClassId() == null || request.getWeekStart() == null) {
            throw new BadRequestException("Vui lòng chọn lớp và tuần mẫu.");
        }
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            throw new BadRequestException("Vui lòng thêm ít nhất một tiết mẫu.");
        }

        LocalDate weekStart = normalizeToMonday(request.getWeekStart());
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp."));
        School school = classEntity.getSchool();
        if (school == null) {
            throw new BadRequestException("Lớp chưa được gán trường.");
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
                throw new BadRequestException(slotLabel(rowIndex) + " không hợp lệ.");
            }
            if (slot.getPeriod() == null || slot.getPeriod() < MIN_PERIOD || slot.getPeriod() > MAX_PERIOD) {
                throw new BadRequestException(slotLabel(rowIndex) + ": Tiết phải nằm trong khoảng 1-10.");
            }

            LocalDate date = resolveTemplateDate(slot, weekStart, rowIndex);
            Integer dayOfWeek = date.getDayOfWeek().getValue();
            if (dayOfWeek < 1 || dayOfWeek > 6) {
                throw new BadRequestException(slotLabel(rowIndex) + ": Chỉ được lập lịch từ thứ 2 đến thứ 7.");
            }
            boolean isFixedPosition = (dayOfWeek == MONDAY && slot.getPeriod() == MORNING_FIRST_PERIOD)
                    || (dayOfWeek == SATURDAY && slot.getPeriod() == SHL_PERIOD);

            String classKey = date + "-" + slot.getPeriod();
            if (!classSlotDedup.add(classKey)) {
                throw new BadRequestException(slotLabel(rowIndex) + ": Lớp đã có tiết trùng ngày và tiết trong dữ liệu gửi lên.");
            }

            User teacher = null;
            if (!isFixedPosition && slot.getTeacherId() != null) {
                teacher = userRepository.findById(slot.getTeacherId())
                        .orElseThrow(() -> new BadRequestException(slotLabel(rowIndex) + ": Không tìm thấy giáo viên."));
                String teacherKey = teacher.getId() + "-" + classKey;
                if (!teacherSlotDedup.add(teacherKey)) {
                    throw new BadRequestException(slotLabel(rowIndex) + ": Giáo viên bị trùng lịch trong dữ liệu gửi lên.");
                }
            }

            Subject subject = null;
            if (!isFixedPosition && slot.getSubjectId() != null) {
                subject = subjectRepository.findById(slot.getSubjectId())
                        .orElseThrow(() -> new BadRequestException(slotLabel(rowIndex) + ": Không tìm thấy môn học."));
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
            row.setClassSection(null);
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
            throw new BadRequestException("Thời khóa biểu mẫu bắt buộc có Sinh hoạt lớp vào Thứ 7 tiết 4.");
        }

        scheduleTemplateRepository.deleteByClassEntityIdAndWeekStart(classEntity.getId(), weekStart);
        scheduleTemplateRepository.flush();
        scheduleTemplateRepository.saveAll(toSave);
        return scheduleTemplateRepository.findByClassIdAndWeekStartWithRelations(classEntity.getId(), weekStart);
    }

    @Transactional
    public int deleteTemplate(Integer classId, LocalDate weekStart) {
        if (classId == null || weekStart == null) {
            throw new BadRequestException("Vui lòng chọn lớp và tuần mẫu.");
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
            throw new BadRequestException("Vui lòng chọn lớp, tuần mẫu, ngày bắt đầu và ngày kết thúc học kỳ.");
        }
        if (request.getSemesterEnd().isBefore(request.getSemesterStart())) {
            throw new BadRequestException("Ngày kết thúc học kỳ phải lớn hơn hoặc bằng ngày bắt đầu.");
        }

        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp."));
        LocalDate templateMonday = normalizeToMonday(request.getWeekStartTemplate());
        List<ScheduleTemplate> templates = scheduleTemplateRepository
                .findByClassIdAndWeekStartWithRelations(classEntity.getId(), templateMonday);
        if (templates.isEmpty()) {
            throw new BadRequestException("Không tìm thấy thời khóa biểu mẫu cho lớp và tuần mẫu đã chọn.");
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
                sch.setTeacher(FIXED_ACTIVITY_CHAOCO.equals(normalizeFixedCode(t.getFixedActivityCode())) ? null : t.getTeacher());
                sch.setClassSection(resolveCurrentClassSection(classEntity, t.getSubject(), t.getTeacher()));
                sch.setFixedActivityCode(t.getFixedActivityCode());
                toCreate.add(sch);
            }
        }

        ensureNoTeacherConflictForGeneratedSchedules(toCreate, toDelete, classEntity);

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

    private static String slotLabel(int index) {
        return "Dòng " + (index + 1) + " của thời khóa biểu mẫu";
    }

    private ClassSection resolveCurrentClassSection(ClassEntity classEntity, Subject subject, User teacher) {
        if (classEntity == null || subject == null || teacher == null) {
            return null;
        }
        return classSectionRepository.findByClassRoomId(classEntity.getId()).stream()
                .filter(cs -> cs.getSubject() != null && cs.getTeacher() != null)
                .filter(cs -> Objects.equals(cs.getSubject().getId(), subject.getId()))
                .filter(cs -> Objects.equals(cs.getTeacher().getId(), teacher.getId()))
                .findFirst()
                .orElse(null);
    }

    private static void enforceFixedActivityRules(ScheduleTemplate row, ClassEntity classEntity) {
        if (row == null || row.getDayOfWeek() == null || row.getPeriod() == null) {
            return;
        }

        boolean isChaocoSlot = row.getDayOfWeek() == MONDAY && row.getPeriod() == MORNING_FIRST_PERIOD;
        boolean isShlSlot = row.getDayOfWeek() == SATURDAY && row.getPeriod() == SHL_PERIOD;

        if (isChaocoSlot) {
            row.setFixedActivityCode(FIXED_ACTIVITY_CHAOCO);
            row.setSubject(null);
            row.setClassSection(null);
            row.setTeacher(null);
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
            throw new BadRequestException("Mã tiết cố định chỉ được dùng cho Thứ 2 tiết 1 (Chào cờ) và Thứ 7 tiết 4 (Sinh hoạt lớp).");
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
            if (dow != null && period != null && dow == SATURDAY && period == SHL_PERIOD && FIXED_ACTIVITY_SHL.equals(fixedCode)) {
                hasShl = true;
            }
        }
        if (!hasChaoco) {
            throw new BadRequestException("Mẫu chưa có Chào cờ ở Thứ 2 tiết 1.");
        }
        if (!hasShl) {
            throw new BadRequestException("Mẫu chưa có Sinh hoạt lớp ở Thứ 7 tiết 4.");
        }
    }

    private void ensureNoTeacherConflictForGeneratedSchedules(List<Schedule> toCreate, List<Schedule> toDelete, ClassEntity targetClass) {
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
                if (!isSameSchoolYear(existing.getClassEntity(), targetClass)) {
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
                String teacherName = s.getTeacher().getFullName() != null && !s.getTeacher().getFullName().trim().isEmpty()
                        ? s.getTeacher().getFullName()
                        : "#" + s.getTeacher().getId();
                throw new BadRequestException("Trùng lịch giáo viên khi sinh từ mẫu: giáo viên " + teacherName
                        + " đã có lịch vào ngày " + s.getDate() + ", tiết " + s.getPeriod() + ".");
            }
            occupiedTeacherSlots.add(key);
        }
    }

    private static boolean isSameSchoolYear(ClassEntity left, ClassEntity right) {
        Integer leftId = left != null && left.getSchoolYear() != null ? left.getSchoolYear().getId() : null;
        Integer rightId = right != null && right.getSchoolYear() != null ? right.getSchoolYear().getId() : null;
        if (leftId == null || rightId == null) {
            return true;
        }
        return Objects.equals(leftId, rightId);
    }

    private static LocalDate resolveTemplateDate(ScheduleTemplateSlotRequest slot, LocalDate weekStart, int index) {
        if (slot.getDate() != null) {
            LocalDate d = slot.getDate();
            if (d.isBefore(weekStart) || d.isAfter(weekStart.plusDays(5))) {
                throw new BadRequestException(slotLabel(index) + ": Ngày phải nằm trong tuần mẫu từ thứ 2 đến thứ 7.");
            }
            return d;
        }
        if (slot.getDayOfWeek() == null || slot.getDayOfWeek() < 1 || slot.getDayOfWeek() > 6) {
            throw new BadRequestException(slotLabel(index) + ": Vui lòng chọn ngày hoặc thứ trong tuần từ thứ 2 đến thứ 7.");
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
