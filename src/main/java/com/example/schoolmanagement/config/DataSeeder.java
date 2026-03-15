package com.example.schoolmanagement.config;

import com.example.schoolmanagement.entity.*;
import com.example.schoolmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private SchoolYearRepository schoolYearRepository;

    @Autowired
    private ParentStudentRepository parentStudentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Luôn đảm bảo tài khoản Super Admin tồn tại (tạo lại nếu bị xóa)
        ensureSuperAdminExists();

        // Check if data already exists
        if (schoolRepository.count() > 0) {
            System.out.println("Data already exists, skipping seeding...");
            return;
        }
        
        System.out.println("Starting data seeding...");

        System.out.println("🌱 Starting comprehensive data seeding...");

        // 1. Create Schools
        School school1 = createSchool("Trường THPT Nguyễn Du", "THPTND", "123 Đường ABC, Quận 1, TP.HCM", "info@thptnguyendu.edu.vn", "028-1234567");
        School school2 = createSchool("Trường THPT Lê Hồng Phong", "THPTLHP", "456 Đường XYZ, Quận 3, TP.HCM", "info@thptlehongphong.edu.vn", "028-2345678");
        School school3 = createSchool("Trường THPT Trần Đại Nghĩa", "THPTTDN", "789 Đường DEF, Quận 5, TP.HCM", "info@thpttrandainghia.edu.vn", "028-3456789");

        // 2. Create Roles
        Role superAdminRole = createRole("SUPER_ADMIN", "Super Administrator - Full system access", null);
        Role adminRole1 = createRole("ADMIN_THPTND", "School Administrator - THPT Nguyễn Du", school1);
        Role adminRole2 = createRole("ADMIN_THPTLHP", "School Administrator - THPT Lê Hồng Phong", school2);
        Role adminRole3 = createRole("ADMIN_THPTTDN", "School Administrator - THPT Trần Đại Nghĩa", school3);
        Role teacherRole1 = createRole("TEACHER_THPTND", "Teacher - THPT Nguyễn Du", school1);
        Role teacherRole2 = createRole("TEACHER_THPTLHP", "Teacher - THPT Lê Hồng Phong", school2);
        Role teacherRole3 = createRole("TEACHER_THPTTDN", "Teacher - THPT Trần Đại Nghĩa", school3);
        Role studentRole1 = createRole("STUDENT_THPTND", "Student - THPT Nguyễn Du", school1);
        Role studentRole2 = createRole("STUDENT_THPTLHP", "Student - THPT Lê Hồng Phong", school2);
        Role studentRole3 = createRole("STUDENT_THPTTDN", "Student - THPT Trần Đại Nghĩa", school3);
        Role parentRole1 = createRole("PARENT_THPTND", "Parent - THPT Nguyễn Du", school1);
        Role parentRole2 = createRole("PARENT_THPTLHP", "Parent - THPT Lê Hồng Phong", school2);
        Role parentRole3 = createRole("PARENT_THPTTDN", "Parent - THPT Trần Đại Nghĩa", school3);

        // 3. Create Users
        User superAdmin = createUser("superadmin@example.com", "Super Administrator", "123456", superAdminRole, school1);
        
        // School 1 Users
        User admin1 = createUser("admin1@example.com", "Nguyễn Văn Admin", "123456", adminRole1, school1);
        User teacher1 = createUser("teacher1@example.com", "Trần Thị Giáo", "123456", teacherRole1, school1);
        User teacher2 = createUser("teacher2@example.com", "Lê Văn Sư", "123456", teacherRole1, school1);
        User teacher3 = createUser("teacher3@example.com", "Phạm Thị Dạy", "123456", teacherRole1, school1);
        User student1 = createUser("student1@example.com", "Nguyễn Văn An", "123456", studentRole1, school1);
        User student2 = createUser("student2@example.com", "Trần Thị Bình", "123456", studentRole1, school1);
        User student3 = createUser("student3@example.com", "Lê Văn Cường", "123456", studentRole1, school1);
        User student4 = createUser("student4@example.com", "Phạm Thị Dung", "123456", studentRole1, school1);
        User student5 = createUser("student5@example.com", "Hoàng Văn Em", "123456", studentRole1, school1);
        User parent1 = createUser("parent1@example.com", "Phụ huynh Nguyễn Văn An", "123456", parentRole1, school1);
        User parent2 = createUser("parent2@example.com", "Phụ huynh Trần Thị Bình", "123456", parentRole1, school1);

        // School 2 Users
        User admin2 = createUser("admin2@example.com", "Võ Văn Quản", "123456", adminRole2, school2);
        User teacher4 = createUser("teacher4@example.com", "Đặng Thị Học", "123456", teacherRole2, school2);
        User teacher5 = createUser("teacher5@example.com", "Bùi Văn Khoa", "123456", teacherRole2, school2);
        User student6 = createUser("student6@example.com", "Vũ Thị Lan", "123456", studentRole2, school2);
        User student7 = createUser("student7@example.com", "Đinh Văn Minh", "123456", studentRole2, school2);
        User parent3 = createUser("parent3@example.com", "Phụ huynh Vũ Thị Lan", "123456", parentRole2, school2);

        // School 3 Users
        User admin3 = createUser("admin3@example.com", "Ngô Văn Trị", "123456", adminRole3, school3);
        User teacher6 = createUser("teacher6@example.com", "Lý Thị Nghi", "123456", teacherRole3, school3);
        User student8 = createUser("student8@example.com", "Cao Văn Oanh", "123456", studentRole3, school3);
        User parent4 = createUser("parent4@example.com", "Phụ huynh Cao Văn Oanh", "123456", parentRole3, school3);

        // 4. Create Classes
        ClassEntity class1 = createClass("10A1", 10, "2024-2025", teacher1, 35, school1);
        ClassEntity class2 = createClass("10A2", 10, "2024-2025", teacher2, 32, school1);
        ClassEntity class3 = createClass("11A1", 11, "2024-2025", teacher3, 30, school1);
        ClassEntity class4 = createClass("12A1", 12, "2024-2025", teacher1, 28, school1);
        ClassEntity class5 = createClass("10B1", 10, "2024-2025", teacher4, 33, school2);
        ClassEntity class6 = createClass("11B1", 11, "2024-2025", teacher5, 31, school2);

        // 5. Create Subjects
        Subject math = createSubject("MATH", "Toán học", school1);
        Subject physics = createSubject("PHYS", "Vật lý", school1);
        Subject chemistry = createSubject("CHEM", "Hóa học", school1);
        Subject literature = createSubject("LIT", "Ngữ văn", school1);
        Subject english = createSubject("ENG", "Tiếng Anh", school1);
        Subject history = createSubject("HIST", "Lịch sử", school1);
        Subject geography = createSubject("GEO", "Địa lý", school1);
        Subject biology = createSubject("BIO", "Sinh học", school1);
        Subject informatics = createSubject("INFO", "Tin học", school1);
        Subject physical = createSubject("PE", "Thể dục", school1);

        // 6. Create Schedules
        createSchedule(class1, math, teacher1, 1, 2, "Phòng A101", school1);
        createSchedule(class1, physics, teacher2, 2, 2, "Phòng A102", school1);
        createSchedule(class1, chemistry, teacher3, 3, 2, "Phòng A103", school1);
        createSchedule(class1, literature, teacher1, 1, 3, "Phòng A101", school1);
        createSchedule(class1, english, teacher2, 2, 3, "Phòng A102", school1);
        createSchedule(class2, math, teacher2, 1, 2, "Phòng B101", school1);
        createSchedule(class2, physics, teacher3, 2, 2, "Phòng B102", school1);
        createSchedule(class3, chemistry, teacher1, 1, 4, "Phòng C101", school1);
        createSchedule(class4, literature, teacher2, 1, 5, "Phòng D101", school1);

        // 7. Create Enrollments
        createEnrollment(student1, class1, 1, school1);
        createEnrollment(student2, class1, 2, school1);
        createEnrollment(student3, class1, 3, school1);
        createEnrollment(student4, class2, 1, school1);
        createEnrollment(student5, class2, 2, school1);
        createEnrollment(student6, class5, 1, school2);
        createEnrollment(student7, class5, 2, school2);
        createEnrollment(student8, class6, 1, school3);

        // 7b. Parent–Student (1 phụ huynh nhiều con, 1 học sinh nhiều phụ huynh)
        createParentStudent(parent1, student1, school1);
        createParentStudent(parent1, student2, school1);
        createParentStudent(parent2, student1, school1);
        createParentStudent(parent3, student6, school2);
        createParentStudent(parent3, student7, school2);
        createParentStudent(parent4, student8, school3);

        // 8. Create Records (Exam Scores)
        createRecord("EXAM_SCORE", student1, math, class1, teacher1, 8.5, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student1, physics, class1, teacher2, 7.8, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student1, chemistry, class1, teacher3, 9.2, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student2, math, class1, teacher1, 7.5, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student2, physics, class1, teacher2, 8.0, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student3, math, class1, teacher1, 9.0, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student4, math, class2, teacher2, 8.2, "Kiểm tra giữa kỳ", school1);
        createRecord("EXAM_SCORE", student5, physics, class2, teacher3, 7.9, "Kiểm tra giữa kỳ", school1);

        // 9. Create Records (Attendance)
        createRecord("ATTENDANCE", student1, math, class1, teacher1, 1.0, "Có mặt", school1);
        createRecord("ATTENDANCE", student2, math, class1, teacher1, 1.0, "Có mặt", school1);
        createRecord("ATTENDANCE", student3, math, class1, teacher1, 0.0, "Vắng mặt", school1);
        createRecord("ATTENDANCE", student1, physics, class1, teacher2, 1.0, "Có mặt", school1);
        createRecord("ATTENDANCE", student2, physics, class1, teacher2, 1.0, "Có mặt", school1);
        createRecord("ATTENDANCE", student3, physics, class1, teacher2, 1.0, "Có mặt", school1);

        // 10. Create Records (Behavior)
        createRecord("BEHAVIOR", student1, null, class1, teacher1, 1.0, "Tích cực tham gia", school1);
        createRecord("BEHAVIOR", student2, null, class1, teacher1, 1.0, "Học tập chăm chỉ", school1);
        createRecord("BEHAVIOR", student3, null, class1, teacher1, -1.0, "Nói chuyện trong giờ", school1);

        // 11. Create Announcements
        createAnnouncement("Thông báo nghỉ lễ", "Nhà trường thông báo nghỉ lễ Quốc khánh từ 2/9 đến 4/9", admin1, class1, school1);
        createAnnouncement("Lịch thi học kỳ", "Lịch thi học kỳ I sẽ được thông báo vào tuần tới", admin1, class2, school1);
        createAnnouncement("Họp phụ huynh", "Mời phụ huynh học sinh lớp 10A1 đến họp vào thứ 7 tuần này", teacher1, class1, school1);
        createAnnouncement("Thông báo chung", "Nhà trường tổ chức hoạt động ngoại khóa vào cuối tháng", admin1, null, school1);

        // 12. Create Documents
        createDocument("Đề thi Toán học kỳ I", "math_exam.pdf", "/uploads/math_exam.pdf", "EXAM", teacher1, class1, school1);
        createDocument("Tài liệu Vật lý", "physics_material.pdf", "/uploads/physics_material.pdf", "MATERIAL", teacher2, class1, school1);
        createDocument("Hướng dẫn làm bài tập", "homework_guide.docx", "/uploads/homework_guide.docx", "GUIDE", teacher3, class2, school1);
        createDocument("Thông báo chung", "general_announcement.pdf", "/uploads/general_announcement.pdf", "ANNOUNCEMENT", admin1, null, school1);

        System.out.println("✅ Comprehensive data seeding completed!");
        System.out.println("\n📊 Data Summary:");
        System.out.println("🏫 Schools: " + schoolRepository.count());
        System.out.println("👥 Users: " + userRepository.count());
        System.out.println("🎭 Roles: " + roleRepository.count());
        System.out.println("📚 Classes: " + classRepository.count());
        System.out.println("📖 Subjects: " + subjectRepository.count());
        System.out.println("📅 Schedules: " + scheduleRepository.count());
        System.out.println("📝 Records: " + recordRepository.count());
        System.out.println("📢 Announcements: " + announcementRepository.count());
        System.out.println("📄 Documents: " + documentRepository.count());
        System.out.println("🎓 Enrollments: " + enrollmentRepository.count());

        System.out.println("\n🔑 Test Accounts:");
        System.out.println("Super Admin: superadmin@example.com / 123456");
        System.out.println("Admin 1: admin1@example.com / 123456");
        System.out.println("Admin 2: admin2@example.com / 123456");
        System.out.println("Admin 3: admin3@example.com / 123456");
        System.out.println("Teacher 1: teacher1@example.com / 123456");
        System.out.println("Teacher 2: teacher2@example.com / 123456");
        System.out.println("Student 1: student1@example.com / 123456");
        System.out.println("Student 2: student2@example.com / 123456");
        System.out.println("Student 3: student3@example.com / 123456");
    }

    /** Tạo lại tài khoản Super Admin nếu chưa có (email: superadmin@example.com / 123456). */
    private void ensureSuperAdminExists() {
        if (userRepository.findByEmail("superadmin@example.com").isPresent()) {
            return;
        }
        School anySchool = schoolRepository.findAll().stream().findFirst().orElse(null);
        Role superAdminRole = roleRepository.findByName("SUPER_ADMIN")
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setName("SUPER_ADMIN");
                    r.setDescription("Super Administrator - Full system access");
                    r.setSchool(null);
                    r.setCreatedAt(LocalDateTime.now());
                    return roleRepository.save(r);
                });
        User superAdmin = new User();
        superAdmin.setEmail("superadmin@example.com");
        superAdmin.setFullName("Super Administrator");
        superAdmin.setPasswordHash(passwordEncoder.encode("123456"));
        superAdmin.setRole(superAdminRole);
        superAdmin.setSchool(anySchool);
        superAdmin.setStatus("ACTIVE");
        userRepository.save(superAdmin);
        System.out.println("✅ Super Admin đã được tạo lại: superadmin@example.com / 123456");
    }

    // Helper methods
    private School createSchool(String name, String code, String address, String email, String phone) {
        // Check if school already exists
        Optional<School> existingSchool = schoolRepository.findByCode(code);
        if (existingSchool.isPresent()) {
            System.out.println("School with code " + code + " already exists, skipping creation");
            return existingSchool.get();
        }
        
        School school = new School();
        school.setName(name);
        school.setCode(code);
        school.setAddress(address);
        school.setEmail(email);
        school.setPhone(phone);
        school.setStatus("ACTIVE");
        school.setCreatedAt(LocalDateTime.now());
        school.setUpdatedAt(LocalDateTime.now());
        return schoolRepository.save(school);
    }

    private Role createRole(String name, String description, School school) {
        // Check if role already exists
        Optional<Role> existingRole = roleRepository.findByName(name);
        if (existingRole.isPresent()) {
            System.out.println("Role with name " + name + " already exists, skipping creation");
            return existingRole.get();
        }
        
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        role.setSchool(school);
        role.setCreatedAt(LocalDateTime.now());
        return roleRepository.save(role);
    }

    private User createUser(String email, String fullName, String password, Role role, School school) {
        // Check if user already exists
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            System.out.println("User with email " + email + " already exists, skipping creation");
            return existingUser.get();
        }
        
        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setSchool(school);
        user.setStatus("ACTIVE");
        return userRepository.save(user);
    }

    private ClassEntity createClass(String name, Integer gradeLevel, String schoolYearName, User homeroomTeacher, Integer capacity, School school) {
        ClassEntity classEntity = new ClassEntity();
        classEntity.setName(name);
        classEntity.setGradeLevel(gradeLevel);
        SchoolYear sy = getOrCreateSchoolYear(school, schoolYearName);
        classEntity.setSchoolYear(sy);
        classEntity.setHomeroomTeacher(homeroomTeacher);
        classEntity.setCapacity(capacity);
        classEntity.setStatus("ACTIVE");
        classEntity.setSchool(school);
        return classRepository.save(classEntity);
    }

    private SchoolYear getOrCreateSchoolYear(School school, String name) {
        if (school == null || name == null || name.trim().isEmpty()) return null;
        return schoolYearRepository.findBySchoolIdAndName(school.getId(), name)
                .orElseGet(() -> {
                    SchoolYear sy = new SchoolYear();
                    sy.setSchool(school);
                    sy.setName(name);
                    sy.setStatus("ACTIVE");
                    return schoolYearRepository.save(sy);
                });
    }

    private Subject createSubject(String code, String name, School school) {
        Subject subject = new Subject();
        subject.setCode(code);
        subject.setName(name);
        subject.setSchool(school);
        return subjectRepository.save(subject);
    }

    private Schedule createSchedule(ClassEntity classEntity, Subject subject, User teacher, Integer period, Integer dayOfWeek, String room, School school) {
        Schedule schedule = new Schedule();
        schedule.setClassEntity(classEntity);
        schedule.setSubject(subject);
        schedule.setTeacher(teacher);
        schedule.setPeriod(period);
        schedule.setDayOfWeek(dayOfWeek);
        schedule.setRoom(room);
        schedule.setSchool(school);
        return scheduleRepository.save(schedule);
    }

    private com.example.schoolmanagement.entity.Record createRecord(String type, User student, Subject subject, ClassEntity classEntity, User actor, Double value, String note, School school) {
        com.example.schoolmanagement.entity.Record record = new com.example.schoolmanagement.entity.Record();
        record.setType(type);
        record.setStudent(student);
        record.setSubject(subject);
        record.setClassEntity(classEntity);
        record.setActor(actor);
        record.setValue(value);
        record.setNote(note);
        record.setStatus("ACTIVE");
        record.setDate(LocalDateTime.now());
        record.setSchool(school);
        return recordRepository.save(record);
    }

    private Announcement createAnnouncement(String title, String content, User createdBy, ClassEntity classEntity, School school) {
        Announcement announcement = new Announcement();
        announcement.setTitle(title);
        announcement.setContent(content);
        announcement.setCreatedBy(createdBy);
        announcement.setClassEntity(classEntity);
        announcement.setSchool(school);
        announcement.setCreatedAt(LocalDateTime.now());
        return announcementRepository.save(announcement);
    }

    private Document createDocument(String title, String fileName, String filePath, String fileType, User uploadedBy, ClassEntity classEntity, School school) {
        Document document = new Document();
        document.setTitle(title);
        document.setFileName(fileName);
        document.setFilePath(filePath);
        document.setFileType(fileType);
        document.setFileSize(1024L); // Mock file size
        document.setUploadedBy(uploadedBy);
        document.setClassEntity(classEntity);
        document.setSchool(school);
        document.setUploadedAt(LocalDateTime.now());
        return documentRepository.save(document);
    }

    private Enrollment createEnrollment(User student, ClassEntity classEntity, Integer rollno, School school) {
        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setClassEntity(classEntity);
        enrollment.setRollno(rollno);
        enrollment.setStatus("ACTIVE");
        enrollment.setSchool(school);
        return enrollmentRepository.save(enrollment);
    }

    private ParentStudent createParentStudent(User parent, User student, School school) {
        if (parentStudentRepository.existsByParentIdAndStudentId(parent.getId(), student.getId())) {
            return parentStudentRepository.findByParentIdAndStudentId(parent.getId(), student.getId()).orElse(null);
        }
        ParentStudent ps = new ParentStudent();
        ps.setParent(parent);
        ps.setStudent(student);
        ps.setSchool(school);
        return parentStudentRepository.save(ps);
    }
}
