package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.Role;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ParentStudent;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.TeacherSubject;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.RoleRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.AnnouncementRepository;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.RecordRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.AssignmentRepository;
import com.example.schoolmanagement.repository.AssignmentSubmissionRepository;
import com.example.schoolmanagement.repository.DocumentRepository;
import com.example.schoolmanagement.repository.RefreshTokenRepository;
import com.example.schoolmanagement.repository.ParentStudentRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.TeacherSubjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private ExamScoreRepository examScoreRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private ParentStudentRepository parentStudentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TeacherSubjectRepository teacherSubjectRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    /** Trả về user dạng Map cho form sửa, tránh lazy serialization (subject) gây 500. */
    @Transactional(readOnly = true)
    public Map<String, Object> getUserForEdit(Integer id) {
        User u = userRepository.findByIdWithSchoolAndRole(id)
                .orElse(userRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id)));
        Map<String, Object> map = new HashMap<>();
        map.put("id", u.getId());
        map.put("email", u.getEmail() != null ? u.getEmail() : "");
        map.put("fullName", u.getFullName() != null ? u.getFullName() : "");
        map.put("status", u.getStatus() != null ? u.getStatus() : "ACTIVE");
        try {
            map.put("dateOfBirth", u.getDateOfBirth() != null ? u.getDateOfBirth().toString() : null);
        } catch (Exception e) {
            map.put("dateOfBirth", null);
        }
        map.put("gender", u.getGender());
        map.put("phone", u.getPhone());
        map.put("department", u.getDepartment());
        map.put("relationship", u.getRelationship());
        if (u.getRole() != null) {
            Map<String, Object> roleMap = new HashMap<>();
            roleMap.put("id", u.getRole().getId());
            roleMap.put("name", u.getRole().getName() != null ? u.getRole().getName() : "");
            roleMap.put("description", u.getRole().getDescription() != null ? u.getRole().getDescription() : "");
            map.put("role", roleMap);
        }
        if (u.getSchool() != null) {
            Map<String, Object> schoolMap = new HashMap<>();
            schoolMap.put("id", u.getSchool().getId());
            schoolMap.put("name", u.getSchool().getName() != null ? u.getSchool().getName() : "");
            schoolMap.put("code", u.getSchool().getCode() != null ? u.getSchool().getCode() : "");
            map.put("school", schoolMap);
        }
        return map;
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    public User saveUser(User user) {
        if (user.getPasswordHash() != null && !user.getPasswordHash().startsWith("$2a$")) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }
        return userRepository.save(user);
    }

    public void deleteUser(Integer id) {
        // Xóa tất cả các bản ghi liên quan đến user trước khi xóa user
        // Điều này tránh lỗi foreign key constraint
        
        log.info("Starting deletion process for user ID: {}", id);

        // 1. Xóa enrollments (student_id)
        try {
            List<com.example.schoolmanagement.entity.Enrollment> enrollments =
                enrollmentRepository.findByStudentId(id);
            if (!enrollments.isEmpty()) {
                log.debug("Deleting {} enrollment(s)", enrollments.size());
                enrollmentRepository.deleteAll(enrollments);
            }
        } catch (Exception e) {
            log.error("Error deleting enrollments: {}", e.getMessage());
        }

        // 2. Xóa schedules (teacher_id)
        try {
            List<com.example.schoolmanagement.entity.Schedule> schedules =
                scheduleRepository.findByTeacherId(id);
            log.debug("Found {} schedule(s) for teacher ID: {}", schedules.size(), id);
            if (!schedules.isEmpty()) {
                scheduleRepository.deleteAll(schedules);
                log.debug("Successfully deleted all schedules");
            }
        } catch (Exception e) {
            log.error("Error deleting schedules: {}", e.getMessage());
        }

        // 3. Xóa exam_scores (student_id)
        try {
            List<com.example.schoolmanagement.entity.ExamScore> examScores =
                examScoreRepository.findByStudentId(id);
            if (!examScores.isEmpty()) {
                log.debug("Deleting {} exam score(s)", examScores.size());
                examScoreRepository.deleteAll(examScores);
            }
        } catch (Exception e) {
            log.error("Error deleting exam scores: {}", e.getMessage());
        }

        // 4. Xóa announcements (created_by)
        try {
            List<com.example.schoolmanagement.entity.Announcement> announcements =
                announcementRepository.findByCreatedById(id);
            if (!announcements.isEmpty()) {
                log.debug("Deleting {} announcement(s)", announcements.size());
                announcementRepository.deleteAll(announcements);
            }
        } catch (Exception e) {
            log.error("Error deleting announcements: {}", e.getMessage());
        }

        // 5. Xóa attendance (student_id)
        try {
            List<com.example.schoolmanagement.entity.Attendance> attendances =
                attendanceRepository.findByStudentId(id);
            if (!attendances.isEmpty()) {
                log.debug("Deleting {} attendance record(s)", attendances.size());
                attendanceRepository.deleteAll(attendances);
            }
        } catch (Exception e) {
            log.error("Error deleting attendance records: {}", e.getMessage());
        }

        // 6. Xóa records (student_id, actor_id)
        try {
            List<com.example.schoolmanagement.entity.Record> records =
                recordRepository.findByStudentId(id);
            if (!records.isEmpty()) {
                log.debug("Deleting {} record(s) (student)", records.size());
                recordRepository.deleteAll(records);
            }
            List<com.example.schoolmanagement.entity.Record> actorRecords =
                recordRepository.findByActorId(id);
            if (!actorRecords.isEmpty()) {
                log.debug("Deleting {} record(s) (actor)", actorRecords.size());
                recordRepository.deleteAll(actorRecords);
            }
        } catch (Exception e) {
            log.error("Error deleting records: {}", e.getMessage());
        }

        // 7. Set null cho classes.homeroom_teacher_id (không xóa lớp)
        try {
            List<com.example.schoolmanagement.entity.ClassEntity> classes =
                classRepository.findByHomeroomTeacherId(id);
            if (!classes.isEmpty()) {
                log.debug("Setting homeroom_teacher_id to null for {} class(es)", classes.size());
                for (com.example.schoolmanagement.entity.ClassEntity cls : classes) {
                    cls.setHomeroomTeacher(null);
                    classRepository.save(cls);
                }
            }
        } catch (Exception e) {
            log.error("Error updating classes: {}", e.getMessage());
        }

        // 8. Xóa assignments (created_by)
        try {
            List<com.example.schoolmanagement.entity.Assignment> assignments =
                assignmentRepository.findByCreatedById(id);
            if (!assignments.isEmpty()) {
                log.debug("Deleting {} assignment(s)", assignments.size());
                assignmentRepository.deleteAll(assignments);
            }
        } catch (Exception e) {
            log.error("Error deleting assignments: {}", e.getMessage());
        }

        // 9. Xóa assignment_submissions (student_id, graded_by)
        try {
            List<com.example.schoolmanagement.entity.AssignmentSubmission> studentSubmissions =
                assignmentSubmissionRepository.findByStudentId(id);
            List<com.example.schoolmanagement.entity.AssignmentSubmission> gradedSubmissions =
                assignmentSubmissionRepository.findAll().stream()
                    .filter(sub -> sub.getGradedBy() != null && sub.getGradedBy().getId().equals(id))
                    .collect(java.util.stream.Collectors.toList());
            java.util.Set<com.example.schoolmanagement.entity.AssignmentSubmission> allSubmissions =
                new java.util.HashSet<>(studentSubmissions);
            allSubmissions.addAll(gradedSubmissions);
            if (!allSubmissions.isEmpty()) {
                log.debug("Deleting {} assignment submission(s)", allSubmissions.size());
                assignmentSubmissionRepository.deleteAll(allSubmissions);
            }
        } catch (Exception e) {
            log.error("Error deleting assignment submissions: {}", e.getMessage());
        }

        // 10. Xóa documents (uploaded_by)
        try {
            List<com.example.schoolmanagement.entity.Document> documents =
                documentRepository.findByUploadedById(id);
            if (!documents.isEmpty()) {
                log.debug("Deleting {} document(s)", documents.size());
                documentRepository.deleteAll(documents);
            }
        } catch (Exception e) {
            log.error("Error deleting documents: {}", e.getMessage());
        }

        // 11. Xóa refresh_tokens (user_id)
        try {
            List<com.example.schoolmanagement.entity.RefreshToken> tokens =
                refreshTokenRepository.findAll().stream()
                    .filter(token -> token.getUser() != null && token.getUser().getId().equals(id))
                    .collect(java.util.stream.Collectors.toList());
            if (!tokens.isEmpty()) {
                log.debug("Deleting {} refresh token(s)", tokens.size());
                refreshTokenRepository.deleteAll(tokens);
            }
        } catch (Exception e) {
            log.error("Error deleting refresh tokens: {}", e.getMessage());
        }

        // 12. Xóa parent_student (parent_id hoặc student_id) — tránh lỗi FK khi xóa user
        try {
            List<ParentStudent> asParent = parentStudentRepository.findByParentId(id);
            if (!asParent.isEmpty()) {
                log.debug("Deleting {} parent_student record(s) (as parent)", asParent.size());
                parentStudentRepository.deleteAll(asParent);
            }
            List<ParentStudent> asStudent = parentStudentRepository.findByStudentId(id);
            if (!asStudent.isEmpty()) {
                log.debug("Deleting {} parent_student record(s) (as student)", asStudent.size());
                parentStudentRepository.deleteAll(asStudent);
            }
        } catch (Exception e) {
            log.error("Error deleting parent_student records: {}", e.getMessage());
        }

        // 13. Xóa teacher_subjects (user_id)
        try {
            teacherSubjectRepository.deleteByUserId(id);
            log.debug("Deleted teacher_subjects for user ID: {}", id);
        } catch (Exception e) {
            log.error("Error deleting teacher_subjects: {}", e.getMessage());
        }

        log.info("User deletion completed for ID: {}", id);
        userRepository.deleteById(id);
    }
    
    public List<User> getUsersBySchoolAndRole(Integer schoolId, String roleName) {
        return userRepository.findBySchoolIdAndRoleName(schoolId, roleName + "%");
    }
    
    public List<User> getUsersBySchool(Integer schoolId) {
        return userRepository.findBySchoolId(schoolId);
    }
    
    public List<User> getUsersByRole(String roleName) {
        return userRepository.findByRoleName(roleName + "%");
    }
    
    // Lấy TEACHER, STUDENT và PARENT users trong một trường
    public List<User> getTeachersAndStudentsBySchool(Integer schoolId) {
        List<User> allUsers = userRepository.findBySchoolId(schoolId);
        return allUsers.stream()
            .filter(user -> {
                if (user.getRole() == null) return false;
                String roleName = user.getRole().getName() != null ? user.getRole().getName().trim().toUpperCase() : "";
                if (roleName.startsWith("TEACHER") || roleName.startsWith("STUDENT")) return true;
                if (roleName.startsWith("PARENT") || roleName.contains("PARENT")) return true;
                if (roleName.contains("PHU HUYNH") || roleName.contains("PHỤ HUYNH")) return true;
                return false;
            })
            .collect(Collectors.toList());
    }

    public boolean existsByEmail(String email) {
        return email != null && userRepository.findByEmail(email).isPresent();
    }

    public boolean isEmailTakenByOtherUser(String email, Integer excludeUserId) {
        if (email == null) return false;
        return userRepository.findByEmail(email)
                .filter(u -> !u.getId().equals(excludeUserId))
                .isPresent();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUsersFilteredAndEnriched(String userRole, Integer schoolId, String currentUserRole) {
        String requestUserRole = currentUserRole != null ? currentUserRole.toUpperCase() : null;
        List<User> users;

        if ("SUPER_ADMIN".equals(requestUserRole) || "SUPER_ADMIN".equals(userRole)) {
            users = "ADMIN".equals(userRole) ? getUsersByRole("ADMIN") : getAllUsers();
        } else if ("ADMIN".equals(requestUserRole) || ("ADMIN".equals(userRole) && schoolId != null)) {
            users = schoolId != null ? getTeachersAndStudentsBySchool(schoolId) : Collections.emptyList();
        } else if ("TEACHER".equals(userRole) && schoolId != null) {
            users = getUsersBySchool(schoolId);
        } else {
            throw new ForbiddenException("Access denied");
        }

        return users.stream().map(u -> enrichUserToMap(u)).collect(Collectors.toList());
    }

    private Map<String, Object> enrichUserToMap(User u) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", u.getId());
        userMap.put("email", u.getEmail());
        userMap.put("fullName", u.getFullName());
        userMap.put("status", u.getStatus());
        if (u.getRole() != null) {
            Map<String, Object> roleMap = new HashMap<>();
            roleMap.put("id", u.getRole().getId());
            roleMap.put("name", u.getRole().getName());
            roleMap.put("description", u.getRole().getDescription());
            userMap.put("role", roleMap);
        }
        if (u.getSchool() != null) {
            Map<String, Object> schoolMap = new HashMap<>();
            schoolMap.put("id", u.getSchool().getId());
            schoolMap.put("name", u.getSchool().getName());
            schoolMap.put("code", u.getSchool().getCode());
            userMap.put("school", schoolMap);
        }
        if (u.getDateOfBirth() != null) userMap.put("dateOfBirth", u.getDateOfBirth().toString());
        if (u.getGender() != null) userMap.put("gender", u.getGender());
        if (u.getPhone() != null) userMap.put("phone", u.getPhone());
        if (u.getDepartment() != null) userMap.put("department", u.getDepartment());
        if (u.getRelationship() != null) userMap.put("relationship", u.getRelationship());
        try {
            if (u.getSubject() != null) {
                Map<String, Object> subMap = new HashMap<>();
                subMap.put("id", u.getSubject().getId());
                subMap.put("name", u.getSubject().getName());
                subMap.put("code", u.getSubject().getCode());
                userMap.put("subject", subMap);
            }
        } catch (Exception e) {
            // Lazy load có thể lỗi ngoài transaction; bỏ qua subject
        }
        String roleName = u.getRole() != null ? u.getRole().getName() : "";
        String roleNameUpper = roleName != null ? roleName.toUpperCase() : "";
        boolean isStudent = roleNameUpper.contains("STUDENT") || "STUDENT".equals(roleNameUpper);
        boolean isTeacher = roleNameUpper.contains("TEACHER") || "TEACHER".equals(roleNameUpper);
        if (isTeacher) {
            List<TeacherSubject> tsList = teacherSubjectRepository.findByUserId(u.getId());
            List<Map<String, Object>> subjectsList = new ArrayList<>();
            for (TeacherSubject ts : tsList) {
                if (ts.getSubject() != null) {
                    Map<String, Object> subMap = new HashMap<>();
                    subMap.put("id", ts.getSubject().getId());
                    subMap.put("name", ts.getSubject().getName());
                    subMap.put("code", ts.getSubject().getCode());
                    subjectsList.add(subMap);
                }
            }
            if (!subjectsList.isEmpty()) {
                userMap.put("subjects", subjectsList);
                userMap.put("subject", subjectsList.get(0));
            }
        }
        if (isStudent) {
            List<Enrollment> enrollments = enrollmentRepository.findByStudentId(u.getId());
            Enrollment enrollment = enrollments.isEmpty() ? null : enrollments.get(0);
            if (enrollment != null && enrollment.getClassEntity() != null) {
                ClassEntity ce = enrollment.getClassEntity();
                Map<String, Object> classMap = new HashMap<>();
                classMap.put("id", ce.getId());
                classMap.put("name", ce.getName());
                classMap.put("schoolYear", ce.getSchoolYear() != null ? ce.getSchoolYear().getName() : null);
                userMap.put("class", classMap);
                userMap.put("rollno", enrollment.getRollno());
            }
        } else if (isTeacher) {
            List<com.example.schoolmanagement.entity.Schedule> schedules = scheduleRepository.findByTeacherId(u.getId());
            Set<Integer> classIds = new HashSet<>();
            List<Map<String, Object>> classesList = new ArrayList<>();
            for (com.example.schoolmanagement.entity.Schedule schedule : schedules) {
                if (schedule.getClassEntity() != null) {
                    Integer classId = schedule.getClassEntity().getId();
                    if (!classIds.contains(classId)) {
                        classIds.add(classId);
                        ClassEntity ce = schedule.getClassEntity();
                        Map<String, Object> classMap = new HashMap<>();
                        classMap.put("id", ce.getId());
                        classMap.put("name", ce.getName());
                        classMap.put("schoolYear", ce.getSchoolYear() != null ? ce.getSchoolYear().getName() : null);
                        classesList.add(classMap);
                    }
                }
            }
            if (!classesList.isEmpty()) userMap.put("classes", classesList);
        }
        return userMap;
    }

    private static Integer parseIntFromMap(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof Number) return ((Number) obj).intValue();
        if (obj instanceof String) {
            try { return Integer.parseInt((String) obj); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    public User createUser(Map<String, Object> userData, String currentUserRole, Integer currentUserSchoolId) {
        if (currentUserRole == null || (!"SUPER_ADMIN".equals(currentUserRole) && !"ADMIN".equals(currentUserRole))) {
            throw new ForbiddenException("Access denied");
        }
        User user = new User();
        user.setEmail((String) userData.get("email"));
        user.setFullName((String) userData.get("fullName"));
        user.setStatus((String) userData.getOrDefault("status", "ACTIVE"));
        String password = (String) userData.get("password");
        if (password != null) user.setPasswordHash(password);

        Integer roleId = parseIntFromMap(userData.get("roleId"));
        if (roleId == null) {
            throw new BadRequestException("Vai trò (role) là bắt buộc");
        }
        Role role = roleRepository.findById(roleId).orElseThrow(() -> new BadRequestException("Invalid role ID"));
        String roleName = role.getName() != null ? role.getName().trim().toUpperCase() : "";
        if ("SUPER_ADMIN".equals(currentUserRole)) {
            user.setRole(role);
        } else if ("ADMIN".equals(currentUserRole)) {
            boolean allowed = "STUDENT".equals(roleName) || "TEACHER".equals(roleName) || "PARENT".equals(roleName)
                    || (roleName.startsWith("STUDENT") || roleName.startsWith("TEACHER") || roleName.startsWith("PARENT"));
            if (allowed) {
                user.setRole(role);
            } else {
                throw new BadRequestException("Admin can only create STUDENT, TEACHER and PARENT users");
            }
        } else {
            throw new BadRequestException("Access denied");
        }

        Integer schoolId = parseIntFromMap(userData.get("schoolId"));
        if (schoolId != null) {
            School school = schoolRepository.findById(schoolId).orElseThrow(() -> new BadRequestException("Invalid school ID"));
            if ("SUPER_ADMIN".equals(currentUserRole)) {
                user.setSchool(school);
            } else if ("ADMIN".equals(currentUserRole) && schoolId.equals(currentUserSchoolId)) {
                user.setSchool(school);
            } else {
                throw new BadRequestException("You can only create users for your own school");
            }
        } else {
            if (!"SUPER_ADMIN".equals(currentUserRole)) throw new BadRequestException("School ID is required");
        }

        setUserProfileFieldsFromMap(user, userData);

        if (user.getEmail() != null && existsByEmail(user.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        User savedUser = saveUser(user);

        Integer classId = parseIntFromMap(userData.get("classId"));
        if (classId != null && savedUser.getRole() != null) {
            String rn = savedUser.getRole().getName().toUpperCase();
            if ("STUDENT".equals(rn) || rn.startsWith("STUDENT")) {
                Optional<ClassEntity> classOpt = classRepository.findById(classId);
                if (classOpt.isPresent()) {
                    List<Enrollment> existingEnrollments = enrollmentRepository.findByClassEntityId(classId);
                    boolean alreadyEnrolled = existingEnrollments.stream()
                            .anyMatch(e -> e.getStudent() != null && e.getStudent().getId().equals(savedUser.getId()));
                    if (!alreadyEnrolled) {
                        Enrollment enrollment = new Enrollment();
                        enrollment.setStudent(savedUser);
                        enrollment.setClassEntity(classOpt.get());
                        enrollment.setSchool(savedUser.getSchool());
                        enrollment.setStatus("ACTIVE");
                        Integer maxRollno = existingEnrollments.stream()
                                .filter(e -> e.getRollno() != null)
                                .map(Enrollment::getRollno)
                                .max(Integer::compare)
                                .orElse(0);
                        enrollment.setRollno(maxRollno + 1);
                        enrollmentRepository.save(enrollment);
                    }
                }
            }
        }

        // PARENT: optional studentIds — tạo mapping parent_student (cùng trường, không trùng)
        if (savedUser.getRole() != null) {
            String rn = savedUser.getRole().getName() != null ? savedUser.getRole().getName().trim().toUpperCase() : "";
            if (rn.startsWith("PARENT") || rn.contains("PARENT")) {
                List<Integer> studentIds = parseIntegerListFromMap(userData.get("studentIds"));
                if (studentIds != null && !studentIds.isEmpty() && savedUser.getSchool() != null) {
                    School parentSchool = savedUser.getSchool();
                    for (Integer studentId : studentIds) {
                        if (studentId == null) continue;
                        User student = userRepository.findById(studentId).orElse(null);
                        if (student == null) {
                            throw new BadRequestException("Học sinh không tồn tại: id=" + studentId);
                        }
                        String studentRole = student.getRole() != null && student.getRole().getName() != null
                                ? student.getRole().getName().trim().toUpperCase() : "";
                        if (!studentRole.startsWith("STUDENT")) {
                            throw new BadRequestException("User id=" + studentId + " không phải học sinh");
                        }
                        if (student.getSchool() == null || !student.getSchool().getId().equals(parentSchool.getId())) {
                            throw new BadRequestException("Học sinh id=" + studentId + " phải cùng trường với phụ huynh");
                        }
                        if (parentStudentRepository.existsByParentIdAndStudentId(savedUser.getId(), studentId)) {
                            continue; // không tạo trùng
                        }
                        ParentStudent ps = new ParentStudent();
                        ps.setParent(savedUser);
                        ps.setStudent(student);
                        ps.setSchool(parentSchool);
                        parentStudentRepository.save(ps);
                    }
                }
            }
        }

        // TEACHER: optional subjectIds — nhiều môn, lưu vào teacher_subjects
        if (savedUser.getRole() != null) {
            String rn = savedUser.getRole().getName() != null ? savedUser.getRole().getName().trim().toUpperCase() : "";
            if (rn.startsWith("TEACHER") || rn.contains("TEACHER")) {
                List<Integer> subjectIds = parseIntegerListFromMap(userData.get("subjectIds"));
                if (subjectIds != null && !subjectIds.isEmpty() && savedUser.getSchool() != null) {
                    Integer teacherSchoolId = savedUser.getSchool().getId();
                    for (Integer sid : subjectIds) {
                        if (sid == null) continue;
                        Subject sub = subjectRepository.findById(sid).orElse(null);
                        if (sub == null) continue;
                        if (sub.getSchool() == null || !sub.getSchool().getId().equals(teacherSchoolId)) continue;
                        TeacherSubject ts = new TeacherSubject();
                        ts.setUser(savedUser);
                        ts.setSubject(sub);
                        teacherSubjectRepository.save(ts);
                    }
                }
            }
        }
        return savedUser;
    }

    /** Set optional profile fields: dateOfBirth, gender, phone, department, subjectId, relationship. */
    private void setUserProfileFieldsFromMap(User user, Map<String, Object> userData) {
        Object dob = userData.get("dateOfBirth");
        if (dob != null && dob.toString().trim().length() > 0) {
            try {
                user.setDateOfBirth(LocalDate.parse(dob.toString().trim()));
            } catch (Exception ignored) {}
        }
        if (userData.get("gender") != null) user.setGender((String) userData.get("gender"));
        if (userData.get("phone") != null) user.setPhone((String) userData.get("phone"));
        if (userData.get("department") != null) user.setDepartment((String) userData.get("department"));
        if (userData.get("relationship") != null) user.setRelationship((String) userData.get("relationship"));
        // Giáo viên dùng subjectIds (nhiều môn) qua bảng teacher_subjects, không set user.subject ở đây
    }

    private static boolean isTeacherRoleName(String rn) {
        if (rn == null || rn.isEmpty()) return false;
        return rn.startsWith("TEACHER") || rn.contains("TEACHER")
                || rn.contains("GIÁO VIÊN") || rn.contains("GIAO VIEN") || rn.contains("GV");
    }

    /** Parse list of integers from request (e.g. studentIds). */
    private static List<Integer> parseIntegerListFromMap(Object obj) {
        if (obj == null) return Collections.emptyList();
        if (obj instanceof List<?>) {
            List<Integer> out = new ArrayList<>();
            for (Object o : (List<?>) obj) {
                Integer v = parseIntFromMap(o);
                if (v != null) out.add(v);
            }
            return out;
        }
        return Collections.emptyList();
    }

    @Transactional
    public User updateUser(Integer id, Map<String, Object> userData) {
        User existingUser = getUserById(id);
        Role oldRole = existingUser.getRole();

        if (userData.get("email") != null) {
            String newEmail = (String) userData.get("email");
            if (isEmailTakenByOtherUser(newEmail, id)) throw new BadRequestException("Email already exists");
            existingUser.setEmail(newEmail);
        }
        if (userData.get("fullName") != null) existingUser.setFullName((String) userData.get("fullName"));
        if (userData.get("status") != null) existingUser.setStatus((String) userData.get("status"));
        if (userData.get("password") != null) existingUser.setPasswordHash((String) userData.get("password"));
        setUserProfileFieldsFromMap(existingUser, userData);

        Integer roleId = parseIntFromMap(userData.get("roleId"));
        if (roleId != null) {
            existingUser.setRole(roleRepository.findById(roleId).orElseThrow(() -> new BadRequestException("Invalid role ID")));
        }
        Integer schoolId = parseIntFromMap(userData.get("schoolId"));
        if (schoolId != null) {
            existingUser.setSchool(schoolRepository.findById(schoolId).orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }

        User updatedUser = saveUser(existingUser);
        String newRoleName = updatedUser.getRole() != null ? updatedUser.getRole().getName().trim().toUpperCase() : "";
        boolean roleChanged = oldRole != null && updatedUser.getRole() != null && !oldRole.getId().equals(updatedUser.getRole().getId());

        // Đổi role: cleanup dữ liệu vai trò cũ
        if (roleChanged && oldRole != null) {
            String oldRn = oldRole.getName() != null ? oldRole.getName().trim().toUpperCase() : "";
            if (oldRn.startsWith("STUDENT") || oldRn.contains("STUDENT")) {
                List<Enrollment> enrollments = enrollmentRepository.findByStudentId(id);
                for (Enrollment e : enrollments) {
                    e.setStatus("INACTIVE");
                    enrollmentRepository.save(e);
                }
            }
            if (oldRn.startsWith("PARENT") || oldRn.contains("PARENT")) {
                List<ParentStudent> list = parentStudentRepository.findByParentId(id);
                if (!list.isEmpty()) parentStudentRepository.deleteAll(list);
            }
            if (isTeacherRoleName(oldRn)) {
                teacherSubjectRepository.deleteByUserId(id);
            }
        }

        // STUDENT: chỉ update users + enrollment (lớp). KHÔNG đụng parent_student
        if ("STUDENT".equals(newRoleName) || newRoleName.startsWith("STUDENT")) {
            Integer newClassId = parseIntFromMap(userData.get("classId"));
            if (newClassId != null) {
                Optional<ClassEntity> classOpt = classRepository.findById(newClassId);
                if (classOpt.isPresent()) {
                    List<Enrollment> existingEnrollments = enrollmentRepository.findByStudentId(updatedUser.getId());
                    Enrollment activeEnrollment = existingEnrollments.stream()
                            .filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus()))
                            .findFirst().orElse(null);

                    if (activeEnrollment != null) {
                        Integer currentClassId = activeEnrollment.getClassEntity() != null ? activeEnrollment.getClassEntity().getId() : null;
                        if (currentClassId != null && !currentClassId.equals(newClassId)) {
                            activeEnrollment.setStatus("INACTIVE");
                            enrollmentRepository.save(activeEnrollment);
                        } else if (currentClassId != null && currentClassId.equals(newClassId)) {
                            return updatedUser;
                        }
                    }

                    List<Enrollment> classEnrollments = enrollmentRepository.findByClassEntityId(newClassId);
                    boolean alreadyEnrolled = classEnrollments.stream()
                            .anyMatch(e -> e.getStudent() != null && e.getStudent().getId().equals(updatedUser.getId()) && "ACTIVE".equalsIgnoreCase(e.getStatus()));
                    if (!alreadyEnrolled) {
                        Enrollment newEnrollment = new Enrollment();
                        newEnrollment.setStudent(updatedUser);
                        newEnrollment.setClassEntity(classOpt.get());
                        newEnrollment.setSchool(updatedUser.getSchool());
                        newEnrollment.setStatus("ACTIVE");
                        Integer maxRollno = classEnrollments.stream()
                                .filter(e -> e.getRollno() != null)
                                .map(Enrollment::getRollno)
                                .max(Integer::compare)
                                .orElse(0);
                        newEnrollment.setRollno(maxRollno + 1);
                        enrollmentRepository.save(newEnrollment);
                    }
                }
            }
        }

        // PARENT: diff update parent_student — thêm mới, xóa bị bỏ (KHÔNG xóa hết rồi insert lại)
        if (newRoleName.startsWith("PARENT") || newRoleName.contains("PARENT")) {
            Integer parentSchoolId = updatedUser.getSchool() != null ? updatedUser.getSchool().getId() : null;
            if (parentSchoolId != null) {
                List<ParentStudent> currentList = parentStudentRepository.findByParentIdFetchStudent(updatedUser.getId());
                Set<Integer> currentIds = currentList.stream()
                        .map(ps -> ps.getStudent() != null ? ps.getStudent().getId() : null)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                List<Integer> requested = parseIntegerListFromMap(userData.get("studentIds"));
                Set<Integer> requestedSet = new HashSet<>(requested);

                for (ParentStudent ps : currentList) {
                    Integer sid = ps.getStudent() != null ? ps.getStudent().getId() : null;
                    if (sid != null && !requestedSet.contains(sid)) parentStudentRepository.delete(ps);
                }
                for (Integer studentId : requestedSet) {
                    if (currentIds.contains(studentId)) continue;
                    User studentUser = userRepository.findById(studentId).orElse(null);
                    if (studentUser == null || studentUser.getSchool() == null || !studentUser.getSchool().getId().equals(parentSchoolId)) continue;
                    if (studentUser.getRole() == null || !studentUser.getRole().getName().toUpperCase().contains("STUDENT")) continue;
                    if (parentStudentRepository.existsByParentIdAndStudentId(updatedUser.getId(), studentId)) continue;
                    ParentStudent ps = new ParentStudent();
                    ps.setParent(updatedUser);
                    ps.setStudent(studentUser);
                    ps.setSchool(updatedUser.getSchool());
                    parentStudentRepository.save(ps);
                }
            }
        }

        // TEACHER: update teacher_subjects (users + teacher info). Nhận diện cả "Giáo viên", "GV"
        if (isTeacherRoleName(newRoleName)) {
            List<Integer> subjectIds = parseIntegerListFromMap(userData.get("subjectIds"));
            teacherSubjectRepository.deleteByUserId(updatedUser.getId());
            if (subjectIds != null && !subjectIds.isEmpty() && updatedUser.getSchool() != null) {
                Integer teacherSchoolId = updatedUser.getSchool().getId();
                for (Integer sid : subjectIds) {
                    if (sid == null) continue;
                    Subject sub = subjectRepository.findById(sid).orElse(null);
                    if (sub == null) continue;
                    if (sub.getSchool() == null || !sub.getSchool().getId().equals(teacherSchoolId)) continue;
                    TeacherSubject ts = new TeacherSubject();
                    ts.setUser(updatedUser);
                    ts.setSubject(sub);
                    teacherSubjectRepository.save(ts);
                }
            }
        }
        return updatedUser;
    }

    /** Danh sách studentId của phụ huynh (dùng cho form sửa PARENT). */
    public List<Integer> getStudentIdsForParent(Integer parentId) {
        List<ParentStudent> list = parentStudentRepository.findByParentIdFetchStudent(parentId);
        return list.stream()
                .map(ps -> ps.getStudent() != null ? ps.getStudent().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /** Danh sách subjectId của giáo viên (dùng cho form sửa TEACHER). Không load entity Subject. */
    @Transactional(readOnly = true)
    public List<Integer> getSubjectIdsForTeacher(Integer teacherId) {
        try {
            List<Integer> ids = teacherSubjectRepository.findSubjectIdsByUserId(teacherId);
            return ids != null ? ids : Collections.emptyList();
        } catch (Exception e) {
            log.warn("getSubjectIdsForTeacher({}) failed: {}", teacherId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public Map<String, Object> getStudentEnrollment(Integer id) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(id);
        List<Enrollment> activeEnrollments = enrollments.stream()
                .filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());

        if (activeEnrollments.isEmpty()) {
            return Map.of(
                    "enrollments", Collections.emptyList(),
                    "message", "Student has no active enrollment"
            );
        }

        Enrollment enrollment = activeEnrollments.get(0);
        Map<String, Object> enrollmentData = new HashMap<>();
        enrollmentData.put("id", enrollment.getId());
        enrollmentData.put("classId", enrollment.getClassEntity() != null ? enrollment.getClassEntity().getId() : null);
        enrollmentData.put("className", enrollment.getClassEntity() != null ? enrollment.getClassEntity().getName() : null);
        enrollmentData.put("rollno", enrollment.getRollno());
        enrollmentData.put("status", enrollment.getStatus());

        List<Map<String, Object>> list = activeEnrollments.stream().map(e -> {
            Map<String, Object> eData = new HashMap<>();
            eData.put("id", e.getId());
            eData.put("classId", e.getClassEntity() != null ? e.getClassEntity().getId() : null);
            eData.put("className", e.getClassEntity() != null ? e.getClassEntity().getName() : null);
            eData.put("rollno", e.getRollno());
            eData.put("status", e.getStatus());
            return eData;
        }).collect(Collectors.toList());

        return Map.of("enrollment", enrollmentData, "enrollments", list);
    }

    public Map<String, Object> testClassEnrichment(Integer studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        Map<String, Object> result = new HashMap<>();
        result.put("studentId", studentId);
        result.put("enrollmentCount", enrollments.size());
        if (!enrollments.isEmpty()) {
            Enrollment e = enrollments.get(0);
            result.put("enrollmentId", e.getId());
            result.put("enrollmentStatus", e.getStatus());
            if (e.getClassEntity() != null) {
                result.put("classId", e.getClassEntity().getId());
                result.put("className", e.getClassEntity().getName());
                result.put("classSchoolYear", e.getClassEntity().getSchoolYear() != null ? e.getClassEntity().getSchoolYear().getName() : null);
            } else {
                result.put("classId", null);
                result.put("className", null);
            }
        }
        return result;
    }
}