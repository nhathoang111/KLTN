package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.RoleRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
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

    public List<School> getAllSchools() {
        return schoolRepository.findAll();
    }

    public School getSchoolById(Integer id) {
        return schoolRepository.findById(id)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("School not found with id: " + id));
    }
    
    public School getSchoolByCode(String code) {
        return schoolRepository.findByCode(code)
                .orElseThrow(() -> new com.example.schoolmanagement.exception.ResourceNotFoundException("School not found with code: " + code));
    }

    public School saveSchool(School school) {
        return schoolRepository.save(school);
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
            String normalizedAddress = school.getAddress().trim();
            school.setAddress(normalizedAddress);
            if (existsByAddress(normalizedAddress)) {
                throw new BadRequestException("Địa chỉ đã tồn tại");
            }
        }
        if (school.getStatus() == null || school.getStatus().isEmpty()) {
            school.setStatus("ACTIVE");
        }
        return saveSchool(school);
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
        if (school.getAddress() != null && !school.getAddress().trim().isEmpty()) {
            String normalizedAddress = school.getAddress().trim();
            if (existsByAddressExcludingId(normalizedAddress, id)) {
                throw new BadRequestException("Địa chỉ đã tồn tại");
            }
        }
        if (school.getName() != null) existing.setName(school.getName());
        if (school.getCode() != null) existing.setCode(school.getCode());
        if (school.getAddress() != null) existing.setAddress(school.getAddress());
        if (school.getPhone() != null) existing.setPhone(school.getPhone());
        if (school.getEmail() != null) existing.setEmail(school.getEmail());
        if (school.getStatus() != null) existing.setStatus(school.getStatus());
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
            // Bước 0: Xóa tất cả dữ liệu trực tiếp liên quan đến school (trước khi xóa classes, users, roles)
            
            // 0.1: Xóa assignment_submissions theo school_id
            try {
                List<com.example.schoolmanagement.entity.AssignmentSubmission> submissions = 
                    assignmentSubmissionRepository.findBySchoolId(id);
                if (!submissions.isEmpty()) {
                    log.debug("  - Found " + submissions.size() + " assignment submission(s) to delete");
                    assignmentSubmissionRepository.deleteAll(submissions);
                }
            } catch (Exception e) {
                log.error("    - Error deleting assignment submissions: " + e.getMessage());
            }
            
            // 0.2: Xóa assignments theo school_id
            try {
                List<com.example.schoolmanagement.entity.Assignment> assignments = 
                    assignmentRepository.findBySchoolId(id);
                if (!assignments.isEmpty()) {
                    log.debug("  - Found " + assignments.size() + " assignment(s) to delete");
                    assignmentRepository.deleteAll(assignments);
                }
            } catch (Exception e) {
                log.error("    - Error deleting assignments: " + e.getMessage());
            }
            
            // 0.3: Xóa announcements theo school_id
            try {
                List<com.example.schoolmanagement.entity.Announcement> announcements = 
                    announcementRepository.findBySchoolId(id);
                if (!announcements.isEmpty()) {
                    log.debug("  - Found " + announcements.size() + " announcement(s) to delete");
                    announcementRepository.deleteAll(announcements);
                }
            } catch (Exception e) {
                log.error("    - Error deleting announcements: " + e.getMessage());
            }
            
            // 0.4: Xóa attendance theo school_id
            try {
                List<com.example.schoolmanagement.entity.Attendance> attendances = 
                    attendanceRepository.findBySchoolId(id);
                if (!attendances.isEmpty()) {
                    log.debug("  - Found " + attendances.size() + " attendance record(s) to delete");
                    attendanceRepository.deleteAll(attendances);
                }
            } catch (Exception e) {
                log.error("    - Error deleting attendance: " + e.getMessage());
            }
            
            // 0.5: Xóa documents theo school_id
            try {
                List<com.example.schoolmanagement.entity.Document> documents = 
                    documentRepository.findBySchoolId(id);
                if (!documents.isEmpty()) {
                    log.debug("  - Found " + documents.size() + " document(s) to delete");
                    documentRepository.deleteAll(documents);
                }
            } catch (Exception e) {
                log.error("    - Error deleting documents: " + e.getMessage());
            }
            
            // 0.6: Xóa enrollments theo school_id
            try {
                List<com.example.schoolmanagement.entity.Enrollment> enrollments = 
                    enrollmentRepository.findBySchoolId(id);
                if (!enrollments.isEmpty()) {
                    log.debug("  - Found " + enrollments.size() + " enrollment(s) to delete");
                    enrollmentRepository.deleteAll(enrollments);
                }
            } catch (Exception e) {
                log.error("    - Error deleting enrollments: " + e.getMessage());
            }
            
            // 0.7: Xóa exam_scores theo school_id
            try {
                List<com.example.schoolmanagement.entity.ExamScore> examScores = 
                    examScoreRepository.findBySchoolId(id);
                if (!examScores.isEmpty()) {
                    log.debug("  - Found " + examScores.size() + " exam score(s) to delete");
                    examScoreRepository.deleteAll(examScores);
                }
            } catch (Exception e) {
                log.error("    - Error deleting exam scores: " + e.getMessage());
            }
            
            // 0.8: Xóa records theo school_id
            try {
                List<com.example.schoolmanagement.entity.Record> records = 
                    recordRepository.findBySchoolId(id);
                if (!records.isEmpty()) {
                    log.debug("  - Found " + records.size() + " record(s) to delete");
                    recordRepository.deleteAll(records);
                }
            } catch (Exception e) {
                log.error("    - Error deleting records: " + e.getMessage());
            }
            
            // 0.9: Xóa schedules theo school_id (đã xóa chức năng schedule)
            // Schedule functionality has been removed
            
            // 0.10: Xóa subjects theo school_id
            try {
                List<com.example.schoolmanagement.entity.Subject> subjects = 
                    subjectRepository.findBySchoolId(id);
                if (!subjects.isEmpty()) {
                    log.debug("  - Found " + subjects.size() + " subject(s) to delete");
                    subjectRepository.deleteAll(subjects);
                }
            } catch (Exception e) {
                log.error("    - Error deleting subjects: " + e.getMessage());
            }
            
            // Bước 1: Xóa tất cả classes của trường
            List<com.example.schoolmanagement.entity.ClassEntity> classes = classRepository.findBySchoolId(id);
            if (!classes.isEmpty()) {
                log.debug("  - Found " + classes.size() + " class(es) to delete");
                for (com.example.schoolmanagement.entity.ClassEntity cls : classes) {
                    try {
                        classService.deleteClass(cls.getId());
                        log.debug("    - Deleted class: " + cls.getName() + " (ID: " + cls.getId() + ")");
                    } catch (Exception e) {
                        log.error("    - Error deleting class " + cls.getId() + ": " + e.getMessage());
                        // Tiếp tục xóa các class khác
                    }
                }
            } else {
                log.debug("  - No classes to delete");
            }
            
            // Bước 2: Xóa tất cả users của trường (sử dụng UserService để xóa tất cả dữ liệu liên quan)
            List<User> users = userRepository.findBySchoolId(id);
            if (!users.isEmpty()) {
                log.debug("  - Found " + users.size() + " user(s) to delete");
                // Lưu danh sách user IDs trước khi xóa để tránh concurrent modification
                List<Integer> userIds = users.stream()
                    .map(User::getId)
                    .collect(java.util.stream.Collectors.toList());
                
                for (Integer userId : userIds) {
                    try {
                        userService.deleteUser(userId);
                        log.debug("    - Deleted user ID: " + userId);
                    } catch (Exception e) {
                        log.error("    - Error deleting user " + userId + ": " + e.getMessage());
                        e.printStackTrace();
                        // Tiếp tục xóa các user khác
                    }
                }
            } else {
                log.debug("  - No users to delete");
            }
            
            // Bước 3: Xóa tất cả roles của trường
            List<Role> roles = roleRepository.findBySchoolId(id);
            if (!roles.isEmpty()) {
                log.debug("  - Found " + roles.size() + " role(s) to delete");
                for (Role role : roles) {
                    try {
                        roleRepository.deleteById(role.getId());
                        log.debug("    - Deleted role: " + role.getName() + " (ID: " + role.getId() + ")");
                    } catch (Exception e) {
                        log.error("    - Error deleting role " + role.getId() + ": " + e.getMessage());
                        // Tiếp tục xóa các role khác
                    }
                }
            } else {
                log.debug("  - No roles to delete");
            }
            
            // Bước 4: Cuối cùng, xóa trường
            log.debug("  - Deleting school ID: " + id);
            schoolRepository.deleteById(id);
            log.debug("✅ School deletion completed for ID: " + id);
            
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Wrap exception với message tiếng Việt
            log.error("=== DataIntegrityViolationException caught in service ===");
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            String fullErrorMsg = errorMsg != null ? errorMsg : "";
            
            // Lấy message từ cause
            while (cause != null) {
                if (cause.getMessage() != null) {
                    fullErrorMsg += " | " + cause.getMessage();
                }
                cause = cause.getCause();
            }
            
            log.error("Full error message in service: " + fullErrorMsg);
            String lowerErrorMsg = fullErrorMsg.toLowerCase();
            
            // Tạo exception mới với message tiếng Việt
            if (lowerErrorMsg.contains("users") && (lowerErrorMsg.contains("school_id") || lowerErrorMsg.contains("fk3gj5j7vnsoxf1wp9n5hsqdiq3"))) {
                log.error("Service throwing Vietnamese exception for users");
                throw new BadRequestException("Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.");
            }
            
            if (lowerErrorMsg.contains("roles") && lowerErrorMsg.contains("school_id")) {
                log.error("Service throwing Vietnamese exception for roles");
                throw new BadRequestException("Không thể xóa trường này vì có phân quyền đang thuộc trường này. Vui lòng xóa tất cả phân quyền trước.");
            }
            
            if (lowerErrorMsg.contains("classes") && lowerErrorMsg.contains("school_id")) {
                log.error("Service throwing Vietnamese exception for classes");
                throw new BadRequestException("Không thể xóa trường này vì có lớp học đang thuộc trường này. Vui lòng xóa tất cả lớp học trước.");
            }
            
            if (lowerErrorMsg.contains("foreign key") || lowerErrorMsg.contains("cannot delete")) {
                log.error("Service throwing Vietnamese exception for foreign key");
                throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan (người dùng, phân quyền, lớp học, v.v.). Vui lòng xóa tất cả dữ liệu liên quan trước.");
            }
            
            log.error("Service throwing fallback Vietnamese exception");
            throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan. Vui lòng xóa tất cả dữ liệu liên quan trước.");
        } catch (jakarta.persistence.PersistenceException e) {
            // Xử lý tương tự cho PersistenceException
            log.error("=== PersistenceException caught in service ===");
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            String fullErrorMsg = errorMsg != null ? errorMsg : "";
            
            while (cause != null) {
                if (cause.getMessage() != null) {
                    fullErrorMsg += " | " + cause.getMessage();
                }
                cause = cause.getCause();
            }
            
            log.error("Full error message in service: " + fullErrorMsg);
            String lowerErrorMsg = fullErrorMsg.toLowerCase();
            
            if (lowerErrorMsg.contains("users") && (lowerErrorMsg.contains("school_id") || lowerErrorMsg.contains("fk3gj5j7vnsoxf1wp9n5hsqdiq3"))) {
                log.error("Service throwing Vietnamese exception for users (PersistenceException)");
                throw new BadRequestException("Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.");
            }
            
            if (lowerErrorMsg.contains("foreign key") || lowerErrorMsg.contains("cannot delete")) {
                log.error("Service throwing Vietnamese exception for foreign key (PersistenceException)");
                throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan (người dùng, phân quyền, lớp học, v.v.). Vui lòng xóa tất cả dữ liệu liên quan trước.");
            }
            
            log.error("Service throwing fallback Vietnamese exception (PersistenceException)");
            throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan. Vui lòng xóa tất cả dữ liệu liên quan trước.");
        } catch (Exception e) {
            // Catch-all để đảm bảo tất cả exception đều được xử lý
            log.error("=== General Exception caught in service ===");
            log.error("Exception type: " + e.getClass().getName());
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            String fullErrorMsg = errorMsg != null ? errorMsg : "";
            
            while (cause != null) {
                if (cause.getMessage() != null) {
                    fullErrorMsg += " | " + cause.getMessage();
                }
                cause = cause.getCause();
            }
            
            log.error("Full error message in service: " + fullErrorMsg);
            String lowerErrorMsg = fullErrorMsg.toLowerCase();
            
            // Kiểm tra nếu đã là message tiếng Việt từ catch block trước
            if (errorMsg != null && errorMsg.contains("Không thể xóa")) {
                throw e; // Re-throw exception với message tiếng Việt
            }
            
            // Xử lý các exception khác
            if (lowerErrorMsg.contains("users") && (lowerErrorMsg.contains("school_id") || lowerErrorMsg.contains("fk3gj5j7vnsoxf1wp9n5hsqdiq3"))) {
                log.error("Service throwing Vietnamese exception for users (catch-all)");
                throw new BadRequestException("Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.");
            }
            
            if (lowerErrorMsg.contains("foreign key") || lowerErrorMsg.contains("cannot delete")) {
                log.error("Service throwing Vietnamese exception for foreign key (catch-all)");
                throw new BadRequestException("Không thể xóa trường này vì có dữ liệu liên quan (người dùng, phân quyền, lớp học, v.v.). Vui lòng xóa tất cả dữ liệu liên quan trước.");
            }
            
            // Re-throw exception gốc nếu không match pattern nào
            throw e;
        }
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