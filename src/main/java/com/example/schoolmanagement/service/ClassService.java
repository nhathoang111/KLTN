package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
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
import com.example.schoolmanagement.entity.SchoolYear;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClassService {

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
            long count = enrollmentRepository.countByClassIdNative(classEntity.getId());
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
                long count = enrollmentRepository.countByClassEntityId(c.getId());
                map.put(c.getId(), (int) count);
            }
        }
        return map;
    }

    public ClassEntity getClassById(Integer id) {
        ClassEntity entity = classRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("Class not found with id: " + id));
        long count = enrollmentRepository.countByClassEntityId(id);
        entity.setStudentCount((int) count);
        return entity;
    }

    public List<ClassEntity> getClassesBySchool(Integer schoolId) {
        return classRepository.findBySchoolId(schoolId);
    }

    public List<ClassEntity> getClassesByHomeroomTeacher(Integer teacherId) {
        return classRepository.findByHomeroomTeacherId(teacherId);
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

    public void deleteClass(Integer id) {
        log.info("Starting deletion process for class ID: {}", id);
        
        try {
            // Bước 0: Xóa class_sections và schedules tham chiếu tới lớp này
            List<com.example.schoolmanagement.entity.ClassSection> classSections = classSectionRepository.findByClassRoomId(id);
            if (!classSections.isEmpty()) {
                log.debug("Deleting {} class section(s) for class {}", classSections.size(), id);
                classSectionRepository.deleteAll(classSections);
            }
            List<com.example.schoolmanagement.entity.Schedule> schedules = scheduleRepository.findByClassEntityId(id);
            if (!schedules.isEmpty()) {
                log.debug("Deleting {} schedule(s) for class {}", schedules.size(), id);
                scheduleRepository.deleteAll(schedules);
            }

            // Bước 1: Xóa enrollments
            List<com.example.schoolmanagement.entity.Enrollment> enrollments = enrollmentRepository.findByClassEntityId(id);
            if (!enrollments.isEmpty()) {
                log.debug("Deleting {} enrollment(s)", enrollments.size());
                enrollmentRepository.deleteAll(enrollments);
            }
            
            // Bước 2: Xóa assignments (cần xóa assignment submissions trước)
            List<com.example.schoolmanagement.entity.Assignment> assignments = assignmentRepository.findByClassEntityId(id);
            if (!assignments.isEmpty()) {
                log.debug("Deleting {} assignment(s)", assignments.size());
                // Xóa assignment submissions trước
                for (com.example.schoolmanagement.entity.Assignment assignment : assignments) {
                    try {
                        List<com.example.schoolmanagement.entity.AssignmentSubmission> submissions = 
                            assignmentSubmissionRepository.findByAssignmentId(assignment.getId());
                        if (!submissions.isEmpty()) {
                            log.debug("Deleting {} submission(s) for assignment {}", submissions.size(), assignment.getId());
                            assignmentSubmissionRepository.deleteAll(submissions);
                        }
                    } catch (Exception e) {
                        log.error("Error deleting submissions for assignment {}: {}", assignment.getId(), e.getMessage());
                    }
                }
                assignmentRepository.deleteAll(assignments);
            }
            
            
            // Bước 4: Xóa attendance
            List<com.example.schoolmanagement.entity.Attendance> attendances = attendanceRepository.findByClassEntityId(id);
            if (!attendances.isEmpty()) {
                log.debug("Deleting {} attendance record(s)", attendances.size());
                attendanceRepository.deleteAll(attendances);
            }
            
            // Bước 5: Xóa documents
            List<com.example.schoolmanagement.entity.Document> documents = documentRepository.findByClassEntityId(id);
            if (!documents.isEmpty()) {
                log.debug("Deleting {} document(s)", documents.size());
                documentRepository.deleteAll(documents);
            }
            
            // Bước 6: Xóa exam_scores
            List<com.example.schoolmanagement.entity.ExamScore> examScores = examScoreRepository.findByClassEntityId(id);
            if (!examScores.isEmpty()) {
                log.debug("Deleting {} exam score(s)", examScores.size());
                examScoreRepository.deleteAll(examScores);
            }
            
            // Bước 7: Xóa records
            List<com.example.schoolmanagement.entity.Record> records = recordRepository.findByClassEntityId(id);
            if (!records.isEmpty()) {
                log.debug("Deleting {} record(s)", records.size());
                recordRepository.deleteAll(records);
            }
            
            // Bước 8: Xóa announcements
            List<com.example.schoolmanagement.entity.Announcement> announcements = announcementRepository.findByClassEntityId(id);
            if (!announcements.isEmpty()) {
                log.debug("Deleting {} announcement(s)", announcements.size());
                announcementRepository.deleteAll(announcements);
            }
            
            // Bước 9: Set null cho homeroom_teacher (nếu cần)
            ClassEntity classEntity = classRepository.findById(id)
                    .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("Class not found with id: " + id));
            if (classEntity.getHomeroomTeacher() != null) {
                classEntity.setHomeroomTeacher(null);
                classRepository.save(classEntity);
            }
            
            // Bước 10: Cuối cùng, xóa class
            classRepository.deleteById(id);
            log.info("Class deletion completed for ID: {}", id);
        } catch (Exception e) {
            log.error("Error deleting class {}: {}", id, e.getMessage());
            throw e;
        }
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
        if (classEntity.getCapacity() != null && classEntity.getCapacity() <= 0) {
            throw new BadRequestException("Capacity must be greater than 0");
        }
        if (classEntity.getStatus() == null || classEntity.getStatus().trim().isEmpty()) {
            classEntity.setStatus("ACTIVE");
        }
        ClassEntity saved = saveClass(classEntity);
        if (saved.getRoom() == null || saved.getRoom().trim().isEmpty()) {
            String defaultRoom = "A" + String.format("%03d", saved.getId());
            saved.setRoom(defaultRoom);
            saved = classRepository.save(saved);
        }
        return saved;
    }

    public ClassEntity updateClass(Integer id, Map<String, Object> classData) {
        ClassEntity existing = getClassById(id);
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
            if (capacity <= 0) throw new BadRequestException("Capacity must be greater than 0");
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
        return saveClass(existing);
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



