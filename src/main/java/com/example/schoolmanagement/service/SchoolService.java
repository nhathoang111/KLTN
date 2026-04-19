package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.RoleRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.DefaultSubjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.Role;

@Service
public class SchoolService {

    private static final Logger log = LoggerFactory.getLogger(SchoolService.class);

    @Autowired
    private SchoolRepository schoolRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private ClassRepository classRepository;
    
    @Autowired
    private com.example.schoolmanagement.service.UserService userService;
    
    @Autowired
    private com.example.schoolmanagement.service.ClassService classService;
    
    @Autowired
    private com.example.schoolmanagement.repository.SubjectRepository subjectRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.AnnouncementRepository announcementRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.DocumentRepository documentRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.EnrollmentRepository enrollmentRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.ExamScoreRepository examScoreRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.RecordRepository recordRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.AssignmentRepository assignmentRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.AssignmentSubmissionRepository assignmentSubmissionRepository;
    
    @Autowired
    private com.example.schoolmanagement.repository.AttendanceRepository attendanceRepository;

    @Autowired
    private com.example.schoolmanagement.repository.ScheduleRepository scheduleRepository;

    @Autowired
    private com.example.schoolmanagement.repository.ClassSectionRepository classSectionRepository;

    @Autowired
    private com.example.schoolmanagement.repository.SchoolYearRepository schoolYearRepository;

    @Autowired
    private com.example.schoolmanagement.repository.ParentStudentRepository parentStudentRepository;

    @Autowired
    private com.example.schoolmanagement.repository.TeacherSubjectRepository teacherSubjectRepository;

    @Autowired
    private DefaultSubjectRepository defaultSubjectRepository;

    public List<School> getAllSchools() {
        return schoolRepository.findAll();
    }

    public School getSchoolById(Integer id) {
        return schoolRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("School not found with id: " + id));
    }

    /** Trả về trường kèm số liệu thống kê (học sinh, giáo viên, phụ huynh, số lớp) để hiển thị dashboard. */
    public School getSchoolWithStats(Integer id) {
        School school = getSchoolById(id);
        List<User> users = userRepository.findBySchoolId(id);
        int studentCount = 0, teacherCount = 0, parentCount = 0;
        for (User u : users) {
            String roleName = u.getRole() != null ? (u.getRole().getName() != null ? u.getRole().getName().toUpperCase() : "") : "";
            if (roleName.contains("STUDENT")) studentCount++;
            else if (roleName.contains("TEACHER")) teacherCount++;
            else if (roleName.contains("PARENT")) parentCount++;
        }
        school.setStudentCount(studentCount);
        school.setTeacherCount(teacherCount);
        school.setParentCount(parentCount);
        school.setClassCount((int) classRepository.countBySchoolId(id));
        int maleCount = 0, femaleCount = 0;
        for (User u : users) {
            String roleName = u.getRole() != null ? (u.getRole().getName() != null ? u.getRole().getName().toUpperCase() : "") : "";
            if (!roleName.contains("STUDENT")) continue;
            String g = u.getGender() != null ? u.getGender().trim() : "";
            if (g.equalsIgnoreCase("Nam") || g.equalsIgnoreCase("Male")) maleCount++;
            else if (g.equalsIgnoreCase("Nữ") || g.equalsIgnoreCase("Female")) femaleCount++;
        }
        school.setStudentMaleCount(maleCount);
        school.setStudentFemaleCount(femaleCount);
        return school;
    }
    
    public School getSchoolByCode(String code) {
        return schoolRepository.findByCode(code)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("School not found with code: " + code));
    }

    public School saveSchool(School school) {
        return schoolRepository.save(school);
    }

    /**
     * Chuỗi địa chỉ đầy đủ (giống cách ghép trên UI): địa chỉ chi tiết + phường + quận + tỉnh.
     * Dùng để phát hiện trùng địa chỉ thực tế, không chỉ trường {@code address}.
     */
    private String normalizedFullLocationKey(School school) {
        if (school == null) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        if (school.getAddress() != null && !school.getAddress().trim().isEmpty()) {
            parts.add(school.getAddress().trim());
        }
        if (school.getWard() != null && !school.getWard().trim().isEmpty()) {
            parts.add(school.getWard().trim());
        }
        if (school.getDistrict() != null && !school.getDistrict().trim().isEmpty()) {
            parts.add(school.getDistrict().trim());
        }
        if (school.getProvince() != null && !school.getProvince().trim().isEmpty()) {
            parts.add(school.getProvince().trim());
        }
        String joined = String.join(", ", parts);
        return joined.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    /** True nếu đã có trường khác trùng địa chỉ đầy đủ (sau chuẩn hóa). */
    private boolean existsAnotherSchoolWithSameFullLocation(School candidate, Integer excludeSchoolId) {
        String key = normalizedFullLocationKey(candidate);
        if (key.isEmpty()) {
            return false;
        }
        for (School s : schoolRepository.findAll()) {
            if (excludeSchoolId != null && s.getId() != null && s.getId().equals(excludeSchoolId)) {
                continue;
            }
            if (normalizedFullLocationKey(s).equals(key)) {
                return true;
            }
        }
        return false;
    }

    public School createSchool(School school) {
        if (school.getCode() != null && !school.getCode().trim().isEmpty()) {
            String normalizedCode = school.getCode().trim();
            school.setCode(normalizedCode);
            if (existsByCode(normalizedCode)) {
                throw new BadRequestException("Mã trường đã tồn tại");
            }
        }
        if (school.getPhone() != null && !school.getPhone().trim().isEmpty()) {
            String normalizedPhone = school.getPhone().trim();
            school.setPhone(normalizedPhone);
            if (existsByPhone(normalizedPhone)) {
                throw new BadRequestException("Số điện thoại đã tồn tại");
            }
        }
        if (school.getEmail() != null && !school.getEmail().trim().isEmpty()) {
            String normalizedEmail = school.getEmail().trim();
            school.setEmail(normalizedEmail);
            if (existsByEmail(normalizedEmail)) {
                throw new BadRequestException("Email đã tồn tại");
            }
        }
        if (school.getAddress() != null && !school.getAddress().trim().isEmpty()) {
            school.setAddress(school.getAddress().trim());
        }
        if (school.getWard() != null) {
            school.setWard(school.getWard().trim());
        }
        if (school.getDistrict() != null) {
            school.setDistrict(school.getDistrict().trim());
        }
        if (school.getProvince() != null) {
            school.setProvince(school.getProvince().trim());
        }
        if (existsAnotherSchoolWithSameFullLocation(school, null)) {
            throw new BadRequestException("Địa chỉ này đã được dùng cho một trường khác.");
        }
        if (school.getStatus() == null || school.getStatus().isEmpty()) {
            school.setStatus("ACTIVE");
        }
        School saved = saveSchool(school);
        seedDefaultSubjectsForSchool(saved.getId());
        return saved;
    }

    /**
     * Copy môn mặc định (default_subjects) sang bảng subjects cho trường mới.
     * - Giữ thứ tự theo sort_index.
     * - Chống trùng theo (school_id, code).
     */
    private void seedDefaultSubjectsForSchool(Integer newSchoolId) {
        if (newSchoolId == null) return;

        List<com.example.schoolmanagement.entity.DefaultSubject> templates =
                defaultSubjectRepository.findAllByOrderBySortIndexAsc();
        if (templates == null || templates.isEmpty()) return;

        School schoolRef = getSchoolById(newSchoolId);

        for (com.example.schoolmanagement.entity.DefaultSubject t : templates) {
            if (t == null || t.getCode() == null) continue;

            boolean exists = subjectRepository.findBySchoolIdAndCode(newSchoolId, t.getCode()).isPresent();
            if (exists) continue;

            com.example.schoolmanagement.entity.Subject subject = new com.example.schoolmanagement.entity.Subject();
            subject.setSchool(schoolRef);
            subject.setCode(t.getCode());
            subject.setName(t.getName());
            subject.setStatus(t.getStatus());
            subject.setSortIndex(t.getSortIndex());
            subjectRepository.save(subject);
        }
    }

    public School updateSchool(Integer id, School school) {
        School existing = getSchoolById(id);
        if (school.getCode() != null && !school.getCode().trim().isEmpty()) {
            String normalizedCode = school.getCode().trim();
            schoolRepository.findByCode(normalizedCode).ifPresent(s -> {
                if (!s.getId().equals(id)) {
                    throw new BadRequestException("Mã trường đã tồn tại");
                }
            });
        }
        if (school.getPhone() != null && !school.getPhone().trim().isEmpty()) {
            String normalizedPhone = school.getPhone().trim();
            if (existsByPhoneExcludingId(normalizedPhone, id)) {
                throw new BadRequestException("Số điện thoại đã tồn tại");
            }
        }
        if (school.getEmail() != null && !school.getEmail().trim().isEmpty()) {
            String normalizedEmail = school.getEmail().trim();
            if (existsByEmailExcludingId(normalizedEmail, id)) {
                throw new BadRequestException("Email đã tồn tại");
            }
        }
        if (school.getName() != null) existing.setName(school.getName());
        if (school.getCode() != null) existing.setCode(school.getCode());
        if (school.getAddress() != null) existing.setAddress(school.getAddress());
        if (school.getWard() != null) existing.setWard(school.getWard());
        if (school.getDistrict() != null) existing.setDistrict(school.getDistrict());
        if (school.getProvince() != null) existing.setProvince(school.getProvince());
        if (school.getPhone() != null) existing.setPhone(school.getPhone());
        if (school.getEmail() != null) existing.setEmail(school.getEmail());
        if (school.getStatus() != null) existing.setStatus(school.getStatus());
        if (school.getLogo() != null) existing.setLogo(school.getLogo());
        if (school.getEstablishmentYear() != null) existing.setEstablishmentYear(school.getEstablishmentYear());
        if (school.getManagementType() != null) existing.setManagementType(school.getManagementType());
        if (existsAnotherSchoolWithSameFullLocation(existing, id)) {
            throw new BadRequestException("Địa chỉ này đã được dùng cho một trường khác.");
        }
        return saveSchool(existing);
    }

    /**
     * Lấy thông tin dữ liệu liên quan của trường
     * @param schoolId ID của trường
     * @return Map chứa thông tin users, roles, classes
     */
    public Map<String, Object> getSchoolRelatedData(Integer schoolId) {
        log.debug("=== Getting related data for school ID: " + schoolId + " ===");
        Map<String, Object> data = new java.util.HashMap<>();
        
        try {
            List<User> users = userRepository.findBySchoolId(schoolId);
            int userCount = users != null ? users.size() : 0;
            log.debug("  - Found " + userCount + " user(s)");
            data.put("users", users != null ? users : new java.util.ArrayList<>());
            data.put("userCount", userCount);
        } catch (Exception e) {
            log.error("Error getting users: " + e.getMessage());
            e.printStackTrace();
            data.put("users", new java.util.ArrayList<>());
            data.put("userCount", 0);
        }
        
        try {
            List<Role> roles = roleRepository.findBySchoolId(schoolId);
            int roleCount = roles != null ? roles.size() : 0;
            log.debug("  - Found " + roleCount + " role(s)");
            data.put("roles", roles != null ? roles : new java.util.ArrayList<>());
            data.put("roleCount", roleCount);
        } catch (Exception e) {
            log.error("Error getting roles: " + e.getMessage());
            e.printStackTrace();
            data.put("roles", new java.util.ArrayList<>());
            data.put("roleCount", 0);
        }
        
        try {
            List<com.example.schoolmanagement.entity.ClassEntity> classes = classRepository.findBySchoolId(schoolId);
            int classCount = classes != null ? classes.size() : 0;
            log.debug("  - Found " + classCount + " class(es)");
            data.put("classes", classes != null ? classes : new java.util.ArrayList<>());
            data.put("classCount", classCount);
        } catch (Exception e) {
            log.error("Error getting classes: " + e.getMessage());
            e.printStackTrace();
            data.put("classes", new java.util.ArrayList<>());
            data.put("classCount", 0);
        }
        
        log.debug("=== Returning related data: " + data + " ===");
        return data;
    }
    
    /**
     * Kiểm tra xem trường có dữ liệu liên quan không
     * @param schoolId ID của trường
     * @return Thông báo lỗi nếu có dữ liệu liên quan, null nếu không có
     */
    public String checkSchoolHasRelatedData(Integer schoolId) {
        log.debug("Checking related data for school ID: " + schoolId);
        
        // Kiểm tra users - dùng query rõ ràng để đảm bảo tìm đúng
        try {
            // Thử cả 2 cách: findBySchoolId và query trực tiếp
            List<User> users = userRepository.findBySchoolId(schoolId);
            int userCount = users != null ? users.size() : 0;
            
            // Nếu không tìm thấy, thử query trực tiếp
            if (userCount == 0) {
                // Kiểm tra lại bằng cách query tất cả users và filter
                List<User> allUsers = userRepository.findAll();
                userCount = (int) allUsers.stream()
                    .filter(u -> u.getSchool() != null && u.getSchool().getId() != null && u.getSchool().getId().equals(schoolId))
                    .count();
            }
            
            log.debug("  - Found " + userCount + " user(s) for school ID: " + schoolId);
            if (userCount > 0) {
                return String.format("Không thể xóa trường này vì có %d người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển người dùng trước.", userCount);
            }
        } catch (Exception e) {
            log.error("  - Error checking users: " + e.getMessage());
            e.printStackTrace();
            // Nếu có lỗi khi kiểm tra, vẫn trả về lỗi để an toàn
            return "Không thể kiểm tra dữ liệu liên quan. Vui lòng thử lại.";
        }
        
        // Kiểm tra roles
        try {
            List<Role> roles = roleRepository.findBySchoolId(schoolId);
            int roleCount = roles != null ? roles.size() : 0;
            log.debug("  - Found " + roleCount + " role(s)");
            if (roleCount > 0) {
                return String.format("Không thể xóa trường này vì có %d phân quyền đang thuộc trường này. Vui lòng xóa phân quyền trước.", roleCount);
            }
        } catch (Exception e) {
            log.error("  - Error checking roles: " + e.getMessage());
            e.printStackTrace();
        }
        
        // Kiểm tra classes
        try {
            long classCount = classRepository.countBySchoolId(schoolId);
            log.debug("  - Found " + classCount + " class(es)");
            if (classCount > 0) {
                return String.format("Không thể xóa trường này vì có %d lớp học đang thuộc trường này. Vui lòng xóa lớp học trước.", classCount);
            }
        } catch (Exception e) {
            log.error("  - Error checking classes: " + e.getMessage());
            e.printStackTrace();
        }
        
        log.debug("  - No related data found, school can be deleted");
        return null; // Không có dữ liệu liên quan
    }
    
    public void deleteSchool(Integer id) {
        log.debug("=== Starting deletion process for school ID: " + id + " ===");
        try {
            deleteRelatedDataStep0To3b(id);
            log.debug("  - Deleting school ID: " + id);
            schoolRepository.deleteById(id);
            log.debug("✅ School deletion completed for ID: " + id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            handleDeleteSchoolException(e, "DataIntegrityViolationException");
        } catch (jakarta.persistence.PersistenceException e) {
            handleDeleteSchoolException(e, "PersistenceException");
        } catch (Exception e) {
            handleDeleteSchoolException(e, "Exception");
        }
    }

    /**
     * Chỉ xóa toàn bộ dữ liệu liên quan (người dùng, lớp, môn, v.v.), KHÔNG xóa bản ghi trường học.
     */
    public void deleteAllRelatedDataOnly(Integer id) {
        log.debug("=== Clearing all related data for school ID: " + id + " (keeping school) ===");
        try {
            runDeleteRelatedDataForSchool(id);
            log.debug("✅ All related data cleared for school ID: " + id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            handleDeleteSchoolException(e, "DataIntegrityViolationException");
        } catch (jakarta.persistence.PersistenceException e) {
            handleDeleteSchoolException(e, "PersistenceException");
        } catch (Exception e) {
            handleDeleteSchoolException(e, "Exception");
        }
    }

    private void handleDeleteSchoolException(Exception e, String type) {
        if (e instanceof BadRequestException) throw (BadRequestException) e;
        log.error("=== " + type + " caught in service ===");
        String errorMsg = e.getMessage();
        Throwable cause = e.getCause();
        String fullErrorMsg = errorMsg != null ? errorMsg : "";
        while (cause != null) {
            if (cause.getMessage() != null) fullErrorMsg += " | " + cause.getMessage();
            cause = cause.getCause();
        }
        log.error("Full error message: " + fullErrorMsg);
        String lowerErrorMsg = fullErrorMsg.toLowerCase();
        if (lowerErrorMsg.contains("users") && (lowerErrorMsg.contains("school_id") || lowerErrorMsg.contains("fk3gj5j7vnsoxf1wp9n5hsqdiq3")))
            throw new BadRequestException("Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.");
        if (lowerErrorMsg.contains("roles") && lowerErrorMsg.contains("school_id"))
            throw new BadRequestException("Không thể xóa trường này vì có phân quyền đang thuộc trường này. Vui lòng xóa tất cả phân quyền trước.");
        if (lowerErrorMsg.contains("classes") && lowerErrorMsg.contains("school_id"))
            throw new BadRequestException("Không thể xóa trường này vì có lớp học đang thuộc trường này. Vui lòng xóa tất cả lớp học trước.");
        if (lowerErrorMsg.contains("foreign key") || lowerErrorMsg.contains("cannot delete"))
            throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan (người dùng, phân quyền, lớp học, v.v.). Vui lòng xóa tất cả dữ liệu liên quan trước.");
        if (e.getMessage() != null && e.getMessage().contains("Không thể xóa")) throw new BadRequestException(e.getMessage());
        throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan. Vui lòng xóa tất cả dữ liệu liên quan trước.");
    }

    /** Thực hiện xóa toàn bộ dữ liệu liên quan trường (không xóa bản ghi trường). */
    private void runDeleteRelatedDataForSchool(int id) {
        // Bước 0.1 -> 3b: giống deleteSchool (không có Bước 4)
        try {
            deleteRelatedDataStep0To3b(id);
        } catch (Exception e) {
            throw e;
        }
    }

    private void deleteRelatedDataStep0To3b(int id) {
        // 0.1
        List<com.example.schoolmanagement.entity.AssignmentSubmission> submissions = assignmentSubmissionRepository.findBySchoolId(id);
        if (!submissions.isEmpty()) { assignmentSubmissionRepository.deleteAll(submissions); }
        // 0.2
        List<com.example.schoolmanagement.entity.Assignment> assignments = assignmentRepository.findBySchoolId(id);
        if (!assignments.isEmpty()) { assignmentRepository.deleteAll(assignments); }
        // 0.3
        List<com.example.schoolmanagement.entity.Announcement> announcements = announcementRepository.findBySchoolId(id);
        if (!announcements.isEmpty()) { announcementRepository.deleteAll(announcements); }
        // 0.4
        List<com.example.schoolmanagement.entity.Attendance> attendances = attendanceRepository.findBySchoolId(id);
        if (!attendances.isEmpty()) { attendanceRepository.deleteAll(attendances); }
        // 0.5
        List<com.example.schoolmanagement.entity.Document> documents = documentRepository.findBySchoolId(id);
        if (!documents.isEmpty()) { documentRepository.deleteAll(documents); }
        // 0.6
        List<com.example.schoolmanagement.entity.Enrollment> enrollments = enrollmentRepository.findBySchoolId(id);
        if (!enrollments.isEmpty()) { enrollmentRepository.deleteAll(enrollments); }
        // 0.7
        List<com.example.schoolmanagement.entity.ExamScore> examScores = examScoreRepository.findBySchoolId(id);
        if (!examScores.isEmpty()) { examScoreRepository.deleteAll(examScores); }
        // 0.8
        List<com.example.schoolmanagement.entity.Record> records = recordRepository.findBySchoolId(id);
        if (!records.isEmpty()) { recordRepository.deleteAll(records); }
        // 0.9
        List<com.example.schoolmanagement.entity.Schedule> schedules = scheduleRepository.findBySchoolId(id);
        if (!schedules.isEmpty()) { scheduleRepository.deleteAll(schedules); }
        // 0.9b
        List<com.example.schoolmanagement.entity.ClassSection> classSections = classSectionRepository.findBySchoolId(id);
        if (!classSections.isEmpty()) { classSectionRepository.deleteAll(classSections); }
        // 0.9c
        List<com.example.schoolmanagement.entity.ParentStudent> parentStudents = parentStudentRepository.findBySchoolId(id);
        if (!parentStudents.isEmpty()) { parentStudentRepository.deleteAll(parentStudents); }
        // 0.9d
        List<com.example.schoolmanagement.entity.TeacherSubject> teacherSubjects = teacherSubjectRepository.findBySchoolId(id);
        if (!teacherSubjects.isEmpty()) { teacherSubjectRepository.deleteAll(teacherSubjects); }
        // 0.10
        List<com.example.schoolmanagement.entity.Subject> subjects = subjectRepository.findBySchoolId(id);
        if (!subjects.isEmpty()) { subjectRepository.deleteAll(subjects); }
        // 1
        List<com.example.schoolmanagement.entity.ClassEntity> classes = classRepository.findBySchoolId(id);
        for (com.example.schoolmanagement.entity.ClassEntity cls : classes) {
            try { classService.forcePhysicalDeleteClass(cls.getId()); } catch (Exception ex) { log.error("Error deleting class " + cls.getId(), ex); }
        }
        // 2
        List<User> users = userRepository.findBySchoolId(id);
        List<Integer> userIds = users.stream().map(User::getId).collect(java.util.stream.Collectors.toList());
        for (Integer userId : userIds) {
            try { userService.deleteUser(userId); } catch (Exception ex) { log.error("Error deleting user " + userId, ex); }
        }
        // 3
        List<Role> roles = roleRepository.findBySchoolId(id);
        for (Role role : roles) {
            try { roleRepository.deleteById(role.getId()); } catch (Exception ex) { log.error("Error deleting role " + role.getId(), ex); }
        }
        // 3b
        List<com.example.schoolmanagement.entity.SchoolYear> schoolYears = schoolYearRepository.findBySchoolId(id);
        if (!schoolYears.isEmpty()) { schoolYearRepository.deleteAll(schoolYears); }
    }

    public boolean existsByCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            return false;
        }
        String normalizedCode = code.trim();
        return schoolRepository.findByCode(normalizedCode).isPresent();
    }

    public boolean existsByPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            log.debug("existsByPhone: phone is null or empty");
            return false;
        }
        // Normalize phone: trim
        String normalizedPhone = phone.trim();
        log.debug("=== EXISTS BY PHONE CHECK ===");
        log.debug("Checking phone: '" + normalizedPhone + "'");
        log.debug("Phone length: " + normalizedPhone.length());
        try {
            // Try JPQL query first
            Optional<School> found = schoolRepository.findByPhone(normalizedPhone);
            boolean exists = found.isPresent();
            log.debug("JPQL Query result - exists: " + exists);
            
            // If not found, try native query
            if (!exists) {
                found = schoolRepository.findByPhoneNative(normalizedPhone);
                exists = found.isPresent();
                log.debug("Native Query result - exists: " + exists);
            }
            
            // Also check all schools manually to see what's in DB
            List<School> allSchools = schoolRepository.findAll();
            log.debug("Total schools in DB: " + allSchools.size());
            int matchingCount = 0;
            for (School s : allSchools) {
                if (s.getPhone() != null) {
                    String dbPhone = s.getPhone().trim();
                    log.debug("  School ID " + s.getId() + " phone: '" + dbPhone + "' (length: " + dbPhone.length() + ")");
                    if (dbPhone.equals(normalizedPhone)) {
                        matchingCount++;
                        log.debug("    *** MATCH FOUND! ***");
                    }
                }
            }
            log.debug("Total matching phones found: " + matchingCount);
            
            if (matchingCount > 0 && !exists) {
                log.debug("WARNING: Found " + matchingCount + " matching phones but query returned false!");
                exists = true; // Force to true if we found matches manually
            }
            
            if (found.isPresent()) {
                School foundSchool = found.get();
                log.debug("Found school ID: " + foundSchool.getId());
                log.debug("Found school name: " + foundSchool.getName());
                log.debug("Found school phone in DB: '" + foundSchool.getPhone() + "'");
                log.debug("Found school phone length: " + (foundSchool.getPhone() != null ? foundSchool.getPhone().length() : "null"));
            }
            
            return exists;
        } catch (Exception e) {
            log.error("Error checking phone: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public boolean existsByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        // Use case-insensitive email search
        String normalizedEmail = email.trim();
        try {
            boolean exists = schoolRepository.findByEmailIgnoreCase(normalizedEmail).isPresent();
            log.debug("existsByEmail(" + normalizedEmail + ") = " + exists);
            return exists;
        } catch (Exception e) {
            log.error("Error checking email: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public boolean existsByAddress(String address) {
        if (address == null || address.trim().isEmpty()) {
            return false;
        }
        // Normalize address: trim whitespace
        String normalizedAddress = address.trim();
        try {
            boolean exists = schoolRepository.findByAddress(normalizedAddress).isPresent();
            log.debug("existsByAddress(" + normalizedAddress + ") = " + exists);
            return exists;
        } catch (Exception e) {
            log.error("Error checking address: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public boolean existsByPhoneExcludingId(String phone, Integer id) {
        if (phone == null || phone.trim().isEmpty()) {
            return false;
        }
        // Normalize phone: trim
        String normalizedPhone = phone.trim();
        return schoolRepository.findByPhoneAndIdNot(normalizedPhone, id).isPresent();
    }

    public boolean existsByEmailExcludingId(String email, Integer id) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        // Use case-insensitive email search excluding current school
        return schoolRepository.findByEmailIgnoreCaseAndIdNot(email.trim(), id).isPresent();
    }

    public boolean existsByAddressExcludingId(String address, Integer id) {
        if (address == null || address.trim().isEmpty()) {
            return false;
        }
        // Normalize address: trim whitespace
        String normalizedAddress = address.trim();
        return schoolRepository.findByAddressAndIdNot(normalizedAddress, id).isPresent();
    }
}