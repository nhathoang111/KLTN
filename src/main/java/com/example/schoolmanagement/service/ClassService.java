package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.util.ClassStatusPolicy;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.AssignmentRepository;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.DocumentRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.RecordRepository;
import com.example.schoolmanagement.repository.AnnouncementRepository;
import com.example.schoolmanagement.repository.AssignmentSubmissionRepository;
import com.example.schoolmanagement.repository.SchoolYearRepository;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.SchoolYear;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClassService {
    private static final int MIN_CLASS_CAPACITY = 1;
    private static final int MAX_CLASS_CAPACITY = 50;

    private static final Logger log = LoggerFactory.getLogger(ClassService.class);

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EnrollmentRepository enrollmentRepository;
    
    @Autowired
    private AssignmentRepository assignmentRepository;
    
    @Autowired
    private AttendanceRepository attendanceRepository;
    
    @Autowired
    private DocumentRepository documentRepository;
    
    @Autowired
    private ExamScoreRepository examScoreRepository;
    
    @Autowired
    private RecordRepository recordRepository;
    
    @Autowired
    private AnnouncementRepository announcementRepository;
    
    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private SchoolYearRepository schoolYearRepository;

    @Autowired
    private com.example.schoolmanagement.repository.ClassSectionRepository classSectionRepository;

    @Autowired
    private com.example.schoolmanagement.repository.ScheduleRepository scheduleRepository;

    public List<ClassEntity> getAllClasses() {
        List<ClassEntity> classes = classRepository.findAll();
        
        // Đảm bảo mỗi lớp có phòng học (lấy từ schedule nếu chưa có)
        for (ClassEntity classEntity : classes) {
            String currentRoom = classEntity.getRoom();
            log.debug("Class {} (ID: {}) - Current room: {}", classEntity.getName(), classEntity.getId(), currentRoom);

            if (currentRoom == null || currentRoom.trim().isEmpty()) {
                String defaultRoom = "A" + String.format("%03d", classEntity.getId());
                classEntity.setRoom(defaultRoom);
                try {
                    classRepository.save(classEntity);
                    classRepository.flush();
                    log.debug("Created default room {} for class {}", defaultRoom, classEntity.getName());
                } catch (Exception e) {
                    log.error("Error saving room for class {}: {}", classEntity.getName(), e.getMessage());
                }
            }
        }

        for (ClassEntity classEntity : classes) {
            long count = enrollmentRepository.countActiveByClassEntityId(classEntity.getId());
            classEntity.setStudentCount((int) count);
        }
        
        return classes;
    }

    /** Trả về map classId -> số học sinh (để frontend gắn vào từng lớp). */
    public Map<Integer, Integer> getStudentCountByClassId() {
        List<ClassEntity> all = classRepository.findAll();
        Map<Integer, Integer> map = new HashMap<>();
        for (ClassEntity c : all) {
            if (c.getId() != null) {
                long count = enrollmentRepository.countActiveByClassEntityId(c.getId());
                map.put(c.getId(), (int) count);
            }
        }
        return map;
    }

    public ClassEntity getClassById(Integer id) {
        ClassEntity entity = classRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("Class not found with id: " + id));
        long count = enrollmentRepository.countActiveByClassEntityId(id);
        entity.setStudentCount((int) count);
        return entity;
    }

    public List<ClassEntity> getClassesBySchool(Integer schoolId) {
        List<ClassEntity> list = classRepository.findBySchoolId(schoolId);
        for (ClassEntity c : list) {
            if (c.getId() != null) {
                long count = enrollmentRepository.countActiveByClassEntityId(c.getId());
                c.setStudentCount((int) count);
            }
        }
        return list;
    }

    public List<ClassEntity> getClassesByHomeroomTeacher(Integer teacherId) {
        List<ClassEntity> homeroom = classRepository.findByHomeroomTeacherId(teacherId);
        List<com.example.schoolmanagement.entity.ClassSection> sections =
                classSectionRepository.findByTeacherIdFetchAll(teacherId);
        java.util.LinkedHashMap<Integer, ClassEntity> merged = new java.util.LinkedHashMap<>();
        for (ClassEntity c : homeroom) {
            if (c != null && c.getId() != null) merged.put(c.getId(), c);
        }
        for (com.example.schoolmanagement.entity.ClassSection cs : sections) {
            if (cs == null || cs.getClassRoom() == null || cs.getClassRoom().getId() == null) continue;
            String st = cs.getStatus() == null ? "ACTIVE" : cs.getStatus().trim().toUpperCase();
            if (!"ACTIVE".equals(st)) continue;
            merged.putIfAbsent(cs.getClassRoom().getId(), cs.getClassRoom());
        }
        return new java.util.ArrayList<>(merged.values());
    }

    public ClassEntity saveClass(ClassEntity classEntity) {
        ClassEntity saved = classRepository.save(classEntity);
        
        // Đảm bảo lớp luôn có phòng học sau khi lưu
        if (saved.getRoom() == null || saved.getRoom().trim().isEmpty()) {
            String defaultRoom = "A" + String.format("%03d", saved.getId());
            saved.setRoom(defaultRoom);
            saved = classRepository.save(saved);
            classRepository.flush(); // Force flush to database
            log.debug("Auto-created room for class {} (ID: {}): {}", saved.getName(), saved.getId(), defaultRoom);
        }
        
        return saved;
    }

    /**
     * API "xóa" lớp → thực tế chỉ lưu trữ (không xóa enrollments / điểm / lịch sử).
     */
    @Transactional
    public void deleteClass(Integer id) {
        archiveClass(id);
    }

    /**
     * Xóa vật lý lớp và quan hệ (chỉ dùng nội bộ khi xóa trường — {@link com.example.schoolmanagement.service.SchoolService}).
     */
    @Transactional
    public void forcePhysicalDeleteClass(Integer id) {
        log.info("Physical delete class ID: {}", id);
        List<com.example.schoolmanagement.entity.ClassSection> classSections = classSectionRepository.findByClassRoomId(id);
        if (!classSections.isEmpty()) {
            classSectionRepository.deleteAll(classSections);
        }
        List<com.example.schoolmanagement.entity.Schedule> schedules = scheduleRepository.findByClassEntityId(id);
        if (!schedules.isEmpty()) {
            scheduleRepository.deleteAll(schedules);
        }
        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityId(id);
        if (!enrollments.isEmpty()) {
            enrollmentRepository.deleteAll(enrollments);
        }
        List<com.example.schoolmanagement.entity.Assignment> assignments = assignmentRepository.findByClassEntityId(id);
        if (!assignments.isEmpty()) {
            for (com.example.schoolmanagement.entity.Assignment assignment : assignments) {
                try {
                    List<com.example.schoolmanagement.entity.AssignmentSubmission> submissions =
                            assignmentSubmissionRepository.findByAssignmentId(assignment.getId());
                    if (!submissions.isEmpty()) {
                        assignmentSubmissionRepository.deleteAll(submissions);
                    }
                } catch (Exception e) {
                    log.error("Error deleting submissions for assignment {}: {}", assignment.getId(), e.getMessage());
                }
            }
            assignmentRepository.deleteAll(assignments);
        }
        List<com.example.schoolmanagement.entity.Attendance> attendances = attendanceRepository.findByClassEntityId(id);
        if (!attendances.isEmpty()) {
            attendanceRepository.deleteAll(attendances);
        }
        List<com.example.schoolmanagement.entity.Document> documents = documentRepository.findByClassEntityId(id);
        if (!documents.isEmpty()) {
            documentRepository.deleteAll(documents);
        }
        List<com.example.schoolmanagement.entity.ExamScore> examScores = examScoreRepository.findByClassEntityId(id);
        if (!examScores.isEmpty()) {
            examScoreRepository.deleteAll(examScores);
        }
        List<com.example.schoolmanagement.entity.Record> records = recordRepository.findByClassEntityId(id);
        if (!records.isEmpty()) {
            recordRepository.deleteAll(records);
        }
        List<com.example.schoolmanagement.entity.Announcement> announcements = announcementRepository.findByClassEntityId(id);
        if (!announcements.isEmpty()) {
            announcementRepository.deleteAll(announcements);
        }
        ClassEntity classEntity = classRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("Class not found with id: " + id));
        if (classEntity.getHomeroomTeacher() != null) {
            classEntity.setHomeroomTeacher(null);
            classRepository.save(classEntity);
        }
        classRepository.deleteById(id);
        log.info("Physical delete completed for class ID: {}", id);
    }

    /**
     * Lưu trữ lớp: trạng thái ARCHIVED, gỡ GVCN, hủy enrollment ACTIVE (dữ liệu enrollment vẫn còn).
     */
    @Transactional
    public void archiveClass(Integer id) {
        ClassEntity classEntity = classRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("Class not found with id: " + id));
        String st = classEntity.getStatus();
        if (st != null && "ARCHIVED".equalsIgnoreCase(st.trim())) {
            throw new BadRequestException("Lớp đã được lưu trữ trước đó.");
        }
        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityId(id);
        for (Enrollment e : enrollments) {
            if (e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus())) {
                e.setStatus("INACTIVE");
                enrollmentRepository.save(e);
            }
        }
        classEntity.setHomeroomTeacher(null);
        classEntity.setStatus("ARCHIVED");
        classRepository.save(classEntity);
        log.info("Archived class ID {}", id);
    }

    /** Lưu trữ hàng loạt mọi lớp thuộc một niên khóa (theo tên) của trường. */
    @Transactional
    public int archiveClassesForSchoolYear(Integer schoolId, String schoolYearName) {
        if (schoolId == null) throw new BadRequestException("Thiếu schoolId.");
        if (schoolYearName == null || schoolYearName.isBlank()) {
            throw new BadRequestException("Thiếu tên niên khóa (schoolYear).");
        }
        SchoolYear sy = schoolYearRepository.findBySchoolIdAndName(schoolId, schoolYearName.trim())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy niên khóa \"" + schoolYearName.trim() + "\" của trường."));
        List<ClassEntity> all = classRepository.findBySchoolId(schoolId);
        int n = 0;
        for (ClassEntity c : all) {
            if (c.getSchoolYear() == null || !sy.getId().equals(c.getSchoolYear().getId())) {
                continue;
            }
            if (c.getStatus() != null && "ARCHIVED".equalsIgnoreCase(c.getStatus().trim())) {
                continue;
            }
            archiveClass(c.getId());
            n++;
        }
        return n;
    }

    /**
     * Chuyển toàn bộ lớp từ niên khóa nguồn sang niên khóa đích (lên một khối).
     * Khối 12 ở niên khóa nguồn: chỉ lưu trữ lớp + kết thúc enrollment ACTIVE (không tạo khối 13).
     * Khối 10–11: tìm hoặc tạo lớp tương ứng ở niên khóa đích (khối +1, cùng số lớp), chuyển học sinh, rồi lưu trữ lớp nguồn.
     */
    @Transactional
    public Map<String, Object> rolloverSchoolYear(Integer schoolId, String fromYearName, String toYearName) {
        if (schoolId == null) {
            throw new BadRequestException("Thiếu schoolId.");
        }
        if (fromYearName == null || fromYearName.isBlank() || toYearName == null || toYearName.isBlank()) {
            throw new BadRequestException("Thiếu niên khóa nguồn hoặc đích.");
        }
        String fromTrim = fromYearName.trim();
        String toTrim = toYearName.trim();
        if (fromTrim.equalsIgnoreCase(toTrim)) {
            throw new BadRequestException("Niên khóa nguồn và đích không được trùng nhau.");
        }
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy trường."));
        SchoolYear fromSy = schoolYearRepository.findBySchoolIdAndName(schoolId, fromTrim)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy niên khóa nguồn \"" + fromTrim + "\" của trường."));
        SchoolYear toSy = schoolYearRepository.findBySchoolIdAndName(schoolId, toTrim).orElseGet(() -> {
            SchoolYear n = new SchoolYear();
            n.setSchool(school);
            n.setName(toTrim);
            n.setStatus("ACTIVE");
            return schoolYearRepository.save(n);
        });

        List<ClassEntity> pool = new ArrayList<>(classRepository.findBySchoolId(schoolId));
        List<ClassEntity> fromClasses = pool.stream()
                .filter(c -> c.getSchoolYear() != null && fromSy.getId().equals(c.getSchoolYear().getId()))
                .filter(c -> c.getStatus() == null || !"ARCHIVED".equalsIgnoreCase(c.getStatus().trim()))
                .collect(Collectors.toList());

        int archivedGrade12 = 0;
        int rolloverChains = 0;
        int createdTargets = 0;
        int movedStudents = 0;
        List<String> errors = new ArrayList<>();

        for (ClassEntity src : fromClasses) {
            Integer gl = src.getGradeLevel();
            if (gl == null) {
                errors.add("Lớp \"" + src.getName() + "\" (id=" + src.getId() + ") thiếu khối — bỏ qua.");
                continue;
            }
            if (gl >= 12) {
                try {
                    archiveClass(src.getId());
                    archivedGrade12++;
                } catch (Exception ex) {
                    errors.add("Lưu trữ khối 12, lớp id=" + src.getId() + ": " + ex.getMessage());
                }
                continue;
            }
            int newGrade = gl + 1;
            Integer cn = src.getClassNumber();
            if (cn == null) {
                errors.add("Lớp \"" + src.getName() + "\" thiếu số lớp — bỏ qua.");
                continue;
            }

            Optional<ClassEntity> existingTarget = pool.stream()
                    .filter(c -> c.getSchoolYear() != null && toSy.getId().equals(c.getSchoolYear().getId()))
                    .filter(c -> c.getGradeLevel() != null && c.getGradeLevel() == newGrade)
                    .filter(c -> c.getClassNumber() != null && c.getClassNumber().equals(cn))
                    .filter(c -> c.getStatus() == null || !"ARCHIVED".equalsIgnoreCase(c.getStatus().trim()))
                    .findFirst();

            ClassEntity target = existingTarget.orElse(null);
            if (target == null) {
                try {
                    Map<String, Object> cd = new LinkedHashMap<>();
                    cd.put("schoolId", schoolId);
                    cd.put("gradeLevel", newGrade);
                    cd.put("classNumber", cn);
                    cd.put("schoolYear", toTrim);
                    int cap = src.getCapacity() != null && src.getCapacity() > 0 ? src.getCapacity() : 45;
                    cd.put("capacity", cap);
                    cd.put("status", "ACTIVE");
                    cd.put("room", null);
                    target = createClass(cd);
                    pool.add(target);
                    createdTargets++;
                } catch (BadRequestException ex) {
                    errors.add("Không tạo được lớp đích " + newGrade + "/" + cn + " (" + toTrim + "): " + ex.getMessage());
                    continue;
                }
            }

            List<Integer> studentIds = enrollmentRepository.findByClassEntityId(src.getId()).stream()
                    .filter(e -> e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus()))
                    .map(e -> e.getStudent() != null ? e.getStudent().getId() : null)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            for (Integer stId : studentIds) {
                try {
                    movedStudents += promoteOneStudent(stId, target.getId(), schoolId);
                } catch (BadRequestException ex) {
                    errors.add("HS " + stId + " → \"" + target.getName() + "\": " + ex.getMessage());
                }
            }
            try {
                archiveClass(src.getId());
                rolloverChains++;
            } catch (Exception ex) {
                errors.add("Lưu trữ lớp nguồn sau chuyển, id=" + src.getId() + ": " + ex.getMessage());
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("message", "Đã chuyển niên khóa: khối 12 lưu trữ; khối 10–11 lên lớp trong niên khóa mới.");
        out.put("fromSchoolYear", fromTrim);
        out.put("toSchoolYear", toTrim);
        out.put("archivedGrade12Classes", archivedGrade12);
        out.put("sourceClassesArchivedAfterRollover", rolloverChains);
        out.put("createdTargetClasses", createdTargets);
        out.put("movedStudentSlots", movedStudents);
        out.put("errors", errors);
        return out;
    }

    /**
     * Chuyển học sinh sang lớp đích (mỗi phần tử: studentId, toClassId).
     * graduateStudentIds: đánh dấu tốt nghiệp / không chuyển tiếp — hủy mọi enrollment ACTIVE của các học sinh này.
     */
    @Transactional
    public Map<String, Object> promoteStudents(Integer schoolId, List<?> movesRaw, List<?> graduateRaw) {
        List<String> errors = new ArrayList<>();
        int moved = 0;
        Set<Integer> graduated = new HashSet<>();
        for (Integer sid : normalizeIntList(graduateRaw)) {
            User u = userRepository.findById(sid).orElse(null);
            if (u == null) {
                errors.add("Tốt nghiệp: không tìm thấy học sinh id=" + sid);
                continue;
            }
            for (Enrollment e : enrollmentRepository.findByStudentId(sid)) {
                if (e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus())) {
                    e.setStatus("INACTIVE");
                    enrollmentRepository.save(e);
                }
            }
            graduated.add(sid);
        }
        if (movesRaw != null) {
            for (Object row : movesRaw) {
                if (!(row instanceof Map)) {
                    continue;
                }
                Map<?, ?> m = (Map<?, ?>) row;
                Integer studentId = toInteger(m.get("studentId"));
                Integer toClassId = toInteger(m.get("toClassId"));
                if (studentId == null || toClassId == null) {
                    errors.add("Bỏ qua dòng thiếu studentId hoặc toClassId");
                    continue;
                }
                try {
                    moved += promoteOneStudent(studentId, toClassId, schoolId);
                } catch (BadRequestException ex) {
                    errors.add("HS " + studentId + " → lớp " + toClassId + ": " + ex.getMessage());
                }
            }
        }
        return Map.of(
                "movedCount", moved,
                "graduatedStudentIds", new ArrayList<>(graduated),
                "errors", errors
        );
    }

    private int promoteOneStudent(Integer studentId, Integer toClassId, Integer schoolIdOptional) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy học sinh " + studentId));
        String rn = student.getRole() != null && student.getRole().getName() != null
                ? student.getRole().getName().toUpperCase() : "";
        if (!rn.contains("STUDENT")) {
            throw new BadRequestException("User " + studentId + " không phải học sinh.");
        }
        ClassEntity target = classRepository.findById(toClassId)
                .orElseThrow(() -> new BadRequestException("Lớp đích không tồn tại."));
        ClassStatusPolicy.assertTeachActionAllowed(target, "gán học sinh vào lớp");
        if (schoolIdOptional != null && target.getSchool() != null && !schoolIdOptional.equals(target.getSchool().getId())) {
            throw new BadRequestException("Lớp đích không thuộc trường đã chọn.");
        }
        List<Enrollment> byStudent = enrollmentRepository.findByStudentId(studentId);
        boolean alreadyInTarget = byStudent.stream().anyMatch(e ->
                e.getClassEntity() != null && e.getClassEntity().getId().equals(toClassId)
                        && e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus()));
        if (alreadyInTarget) {
            return 0;
        }
        for (Enrollment e : byStudent) {
            if (e.getStatus() != null && "ACTIVE".equalsIgnoreCase(e.getStatus())) {
                e.setStatus("INACTIVE");
                enrollmentRepository.save(e);
            }
        }
        ensureClassHasCapacityForNewEnrollment(target);
        List<Enrollment> classEnrollments = enrollmentRepository.findByClassEntityId(toClassId);
        int maxRoll = classEnrollments.stream()
                .filter(e -> e.getRollno() != null)
                .mapToInt(Enrollment::getRollno)
                .max()
                .orElse(0);
        Enrollment en = new Enrollment();
        en.setStudent(student);
        en.setClassEntity(target);
        en.setSchool(student.getSchool() != null ? student.getSchool() : target.getSchool());
        en.setStatus("ACTIVE");
        en.setRollno(maxRoll + 1);
        enrollmentRepository.save(en);
        enrollmentRepository.flush();
        return 1;
    }

    private void ensureClassHasCapacityForNewEnrollment(ClassEntity classEntity) {
        Integer cap = classEntity.getCapacity();
        if (cap == null || cap < MIN_CLASS_CAPACITY) {
            return;
        }
        long active = enrollmentRepository.countActiveByClassEntityId(classEntity.getId());
        if (active >= cap) {
            throw new BadRequestException("Lớp đích đã đủ sĩ số (" + cap + ").");
        }
    }

    private void validateClassCapacity(Integer capacity) {
        if (capacity == null) {
            throw new BadRequestException("Capacity is required");
        }
        if (capacity < MIN_CLASS_CAPACITY || capacity > MAX_CLASS_CAPACITY) {
            throw new BadRequestException(
                    "Sĩ số tối đa phải nằm trong khoảng từ " + MIN_CLASS_CAPACITY + " đến " + MAX_CLASS_CAPACITY + ".");
        }
    }

    private static Integer toInteger(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(v.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static List<Integer> normalizeIntList(List<?> raw) {
        if (raw == null) {
            return Collections.emptyList();
        }
        List<Integer> out = new ArrayList<>();
        for (Object o : raw) {
            Integer x = toInteger(o);
            if (x != null) {
                out.add(x);
            }
        }
        return out;
    }

    public Map<String, Object> checkStudentsInClass(Integer classId) {
        Optional<ClassEntity> classOpt = classRepository.findById(classId);
        if (classOpt.isEmpty()) {
            return Map.of(
                    "classId", classId,
                    "classExists", false,
                    "message", "Lớp không tồn tại",
                    "totalEnrollments", 0,
                    "totalStudents", 0,
                    "enrollments", Collections.emptyList(),
                    "students", Collections.emptyList()
            );
        }
        ClassEntity classEntity = classOpt.get();
        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityIdWithStudents(classId);
        List<User> students = enrollments.stream()
                .filter(e -> e.getStudent() != null && e.getStudent().getRole() != null
                        && ("STUDENT".equals(e.getStudent().getRole().getName().toUpperCase())
                        || e.getStudent().getRole().getName().toUpperCase().startsWith("STUDENT")))
                .map(Enrollment::getStudent)
                .distinct()
                .collect(Collectors.toList());
        List<Map<String, Object>> enrollmentDetails = enrollments.stream()
                .map(e -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("enrollmentId", e.getId());
                    detail.put("studentId", e.getStudent() != null ? e.getStudent().getId() : null);
                    detail.put("studentName", e.getStudent() != null ? e.getStudent().getFullName() : null);
                    detail.put("studentEmail", e.getStudent() != null ? e.getStudent().getEmail() : null);
                    detail.put("studentRole", e.getStudent() != null && e.getStudent().getRole() != null ? e.getStudent().getRole().getName() : null);
                    detail.put("rollno", e.getRollno());
                    detail.put("status", e.getStatus());
                    return detail;
                })
                .collect(Collectors.toList());
        List<Map<String, Object>> studentInfos = students.stream()
                .map(s -> {
                    Map<String, Object> info = new HashMap<>();
                    info.put("id", s.getId());
                    info.put("fullName", s.getFullName());
                    info.put("email", s.getEmail());
                    info.put("role", s.getRole() != null ? s.getRole().getName() : null);
                    return info;
                })
                .collect(Collectors.toList());
        return Map.of(
                "classId", classId,
                "className", classEntity.getName(),
                "classExists", true,
                "totalEnrollments", enrollments.size(),
                "totalStudents", students.size(),
                "enrollments", enrollmentDetails,
                "students", studentInfos
        );
    }

    public Map<String, Object> getStudentsByClass(Integer id) {
        Optional<ClassEntity> classOpt = classRepository.findByIdWithSchool(id);
        if (classOpt.isEmpty()) {
            classOpt = classRepository.findById(id);
        }
        if (classOpt.isEmpty()) {
            return Map.of("students", Collections.<User>emptyList());
        }
        List<Enrollment> enrollments = enrollmentRepository.findByClassEntityIdWithStudents(id);
        if (enrollments.isEmpty()) {
            enrollments = enrollmentRepository.findActiveEnrollmentsByClassId(id);
        }
        enrollments = enrollments.stream()
                .filter(e -> e.getStatus() != null && "ACTIVE".equals(e.getStatus()))
                .collect(Collectors.toList());
        List<User> students = enrollments.stream()
                .filter(e -> {
                    if (e.getStudent() == null || e.getStudent().getRole() == null) return false;
                    String rn = e.getStudent().getRole().getName();
                    return rn != null && ("STUDENT".equals(rn.toUpperCase()) || rn.toUpperCase().startsWith("STUDENT"));
                })
                .map(Enrollment::getStudent)
                .distinct()
                .collect(Collectors.toList());
        return Map.of("students", students);
    }

    public ClassEntity createClass(Map<String, Object> classData) {
        ClassEntity classEntity = new ClassEntity();
        Integer gradeLevel = classData.get("gradeLevel") instanceof Number
                ? ((Number) classData.get("gradeLevel")).intValue() : null;
        Integer classNumber = classData.get("classNumber") instanceof Number
                ? ((Number) classData.get("classNumber")).intValue() : null;
        String name = (String) classData.get("name");
        if ((name == null || name.trim().isEmpty()) && gradeLevel != null && classNumber != null) {
            Object syObj = classData.get("schoolYear");
            String schoolYearStr = syObj != null ? syObj.toString().trim() : null;
            name = (schoolYearStr != null && !schoolYearStr.isEmpty())
                    ? gradeLevel + "/" + classNumber + " (" + schoolYearStr + ")"
                    : "Khối " + gradeLevel + " - Lớp " + classNumber;
        }
        classEntity.setName(name);
        classEntity.setGradeLevel(gradeLevel);
        classEntity.setClassNumber(classNumber);
        resolveAndSetSchoolYear(classEntity, classData.get("schoolId"), classData.get("schoolYear"));
        classEntity.setCapacity((Integer) classData.get("capacity"));
        classEntity.setStatus((String) classData.getOrDefault("status", "ACTIVE"));
        Object roomObj = classData.get("room");
        if (roomObj != null && !roomObj.toString().trim().isEmpty()) {
            classEntity.setRoom(roomObj.toString().trim());
        } else {
            classEntity.setRoom(null);
        }
        Integer schoolId = (Integer) classData.get("schoolId");
        if (schoolId != null) {
            classEntity.setSchool(schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }
        Integer teacherId = (Integer) classData.get("homeroomTeacherId");
        if (teacherId != null) {
            classEntity.setHomeroomTeacher(userRepository.findById(teacherId)
                    .orElseThrow(() -> new BadRequestException("Invalid teacher ID")));
        }
        validateClassCapacity(classEntity.getCapacity());
        if (classEntity.getStatus() == null || classEntity.getStatus().trim().isEmpty()) {
            classEntity.setStatus("ACTIVE");
        }
        assertClassUniquenessForSave(classEntity, null);
        ClassEntity saved;
        try {
            saved = saveClass(classEntity);
        } catch (DataIntegrityViolationException e) {
            log.warn("createClass constraint: {}", e.getMessage());
            throw new BadRequestException("Không thể tạo lớp: dữ liệu trùng (tên/niên khóa/trường) hoặc vi phạm ràng buộc CSDL.");
        }
        if (saved.getRoom() == null || saved.getRoom().trim().isEmpty()) {
            String defaultRoom = "A" + String.format("%03d", saved.getId());
            saved.setRoom(defaultRoom);
            saved = classRepository.save(saved);
        }
        return saved;
    }

    @Transactional
    public ClassEntity updateClass(Integer id, Map<String, Object> classData) {
        ClassEntity existing = getClassById(id);
        if (existing.getStatus() != null && "ARCHIVED".equalsIgnoreCase(existing.getStatus().trim())) {
            throw new BadRequestException("Lớp đã lưu trữ, không thể chỉnh sửa.");
        }
        final String classroomBeforeUpdate = existing.getRoom() == null ? "" : existing.getRoom().trim();
        String name = (String) classData.get("name");
        Integer gradeLevel = classData.get("gradeLevel") instanceof Number
                ? ((Number) classData.get("gradeLevel")).intValue() : null;
        Integer classNumber = classData.get("classNumber") instanceof Number
                ? ((Number) classData.get("classNumber")).intValue() : null;
        if (name != null && !name.trim().isEmpty()) {
            existing.setName(name);
        } else if (gradeLevel != null && classNumber != null) {
            Object syObj = classData.get("schoolYear");
            String schoolYearStr = syObj != null ? syObj.toString().trim() : null;
            String generatedName = (schoolYearStr != null && !schoolYearStr.isEmpty())
                    ? gradeLevel + "/" + classNumber + " (" + schoolYearStr + ")"
                    : "Khối " + gradeLevel + " - Lớp " + classNumber;
            existing.setName(generatedName);
        }
        if (gradeLevel != null) existing.setGradeLevel(gradeLevel);
        if (classNumber != null) existing.setClassNumber(classNumber);
        if (classData.get("schoolYear") != null) {
            Integer schoolId = existing.getSchool() != null ? existing.getSchool().getId() : (Integer) classData.get("schoolId");
            resolveAndSetSchoolYear(existing, schoolId, classData.get("schoolYear"));
        }
        if (classData.get("capacity") != null) {
            Integer capacity = (Integer) classData.get("capacity");
            validateClassCapacity(capacity);
            existing.setCapacity(capacity);
        }
        if (classData.get("status") != null) existing.setStatus((String) classData.get("status"));
        if (classData.containsKey("room")) existing.setRoom((String) classData.get("room"));
        if (classData.get("schoolId") != null) {
            Integer schoolId = (Integer) classData.get("schoolId");
            existing.setSchool(schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }
        if (classData.get("homeroomTeacherId") != null) {
            Integer teacherId = (Integer) classData.get("homeroomTeacherId");
            existing.setHomeroomTeacher(userRepository.findById(teacherId)
                    .orElseThrow(() -> new BadRequestException("Invalid teacher ID")));
        }
        assertClassUniquenessForSave(existing, existing.getId());
        try {
            ClassEntity saved = saveClass(existing);
            String classroomAfterUpdate = saved.getRoom() == null ? "" : saved.getRoom().trim();
            if (!classroomBeforeUpdate.equals(classroomAfterUpdate)) {
                syncScheduleRoomsForClass(saved.getId(), saved.getRoom());
            }
            return saved;
        } catch (DataIntegrityViolationException e) {
            log.warn("updateClass constraint: {}", e.getMessage());
            throw new BadRequestException("Không thể cập nhật lớp: dữ liệu trùng hoặc vi phạm ràng buộc CSDL.");
        }
    }

    /**
     * Khi phòng lớp thay đổi: cập nhật {@link Schedule#getRoom()} trên mọi tiết TKB của lớp
     * (không xóa/tạo lại tiết — chỉ để hiển thị khớp phòng hiện tại của lớp).
     */
    private void syncScheduleRoomsForClass(Integer classId, String newRoomValue) {
        if (classId == null) {
            return;
        }
        List<Schedule> schedules = scheduleRepository.findByClassEntityId(classId);
        if (schedules.isEmpty()) {
            return;
        }
        for (Schedule s : schedules) {
            s.setRoom(newRoomValue);
        }
        scheduleRepository.saveAll(schedules);
        log.debug("Synced class room to {} schedule row(s) for class id={}", schedules.size(), classId);
    }

    /**
     * Chặn trùng lớp (khối+số+niên khóa, kể cả lệch null FK), trùng tên cùng trường (lớp chưa ARCHIVED),
     * và trùng phòng (lớp chưa ARCHIVED).
     */
    private void assertClassUniquenessForSave(ClassEntity entity, Integer excludeId) {
        if (entity.getSchool() == null) return;
        if (entity.getGradeLevel() != null && entity.getClassNumber() != null) {
            Integer syId = entity.getSchoolYear() != null ? entity.getSchoolYear().getId() : null;
            if (classRepository.countDuplicateClassStructure(
                    entity.getSchool().getId(), syId, entity.getGradeLevel(), entity.getClassNumber(), excludeId) > 0) {
                throw new BadRequestException("Đã tồn tại lớp cùng khối và số lớp trong trường (trùng hoặc lệch niên khóa với lớp đang hoạt động).");
            }
        }
        if (entity.getName() != null && !entity.getName().trim().isEmpty()) {
            if (classRepository.countBySchoolAndNameNormalized(
                    entity.getSchool().getId(), entity.getName().trim(), excludeId) > 0) {
                throw new BadRequestException("Đã tồn tại lớp cùng tên trong trường (lớp đang hoạt động).");
            }
        }
        assertRoomUniqueInSchool(entity, excludeId);
    }

    private void assertRoomUniqueInSchool(ClassEntity entity, Integer excludeId) {
        if (entity.getSchool() == null) return;
        String r = entity.getRoom();
        if (r == null || r.trim().isEmpty()) return;
        String trimmed = r.trim();
        if (classRepository.countBySchoolAndRoomNormalized(entity.getSchool().getId(), trimmed, excludeId) > 0) {
            throw new BadRequestException("Phòng học \"" + trimmed + "\" đã được gán cho lớp khác trong cùng trường.");
        }
    }

    private void resolveAndSetSchoolYear(ClassEntity classEntity, Object schoolIdObj, Object schoolYearNameObj) {
        if (schoolYearNameObj == null || (schoolYearNameObj instanceof String && ((String) schoolYearNameObj).trim().isEmpty())) {
            classEntity.setSchoolYear(null);
            return;
        }
        String name = schoolYearNameObj.toString().trim();
        Integer schoolId = null;
        if (schoolIdObj instanceof Integer) schoolId = (Integer) schoolIdObj;
        else if (schoolIdObj instanceof Number) schoolId = ((Number) schoolIdObj).intValue();
        if (schoolId == null && classEntity.getSchool() != null) schoolId = classEntity.getSchool().getId();
        if (schoolId == null) return;
        final Integer finalSchoolId = schoolId;
        SchoolYear sy = schoolYearRepository.findBySchoolIdAndName(finalSchoolId, name)
                .orElseGet(() -> {
                    SchoolYear newSy = new SchoolYear();
                    newSy.setSchool(schoolRepository.findById(finalSchoolId).orElse(null));
                    newSy.setName(name);
                    newSy.setStatus("ACTIVE");
                    return schoolYearRepository.save(newSy);
                });
        classEntity.setSchoolYear(sy);
    }
}



