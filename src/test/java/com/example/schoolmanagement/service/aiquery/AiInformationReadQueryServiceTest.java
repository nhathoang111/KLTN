package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.ParentStudentRepository;
import com.example.schoolmanagement.repository.ScheduleRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiInformationReadQueryServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private ExamScoreRepository examScoreRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private ParentStudentRepository parentStudentRepository;
    @Mock private StudentInfoQueryService studentInfoQueryService;

    private AiInformationReadQueryService service;

    @BeforeEach
    void setUp() {
        service = new AiInformationReadQueryService();
        ReflectionTestUtils.setField(service, "userRepository", userRepository);
        ReflectionTestUtils.setField(service, "enrollmentRepository", enrollmentRepository);
        ReflectionTestUtils.setField(service, "examScoreRepository", examScoreRepository);
        ReflectionTestUtils.setField(service, "attendanceRepository", attendanceRepository);
        ReflectionTestUtils.setField(service, "scheduleRepository", scheduleRepository);
        ReflectionTestUtils.setField(service, "parentStudentRepository", parentStudentRepository);
        ReflectionTestUtils.setField(service, "studentInfoQueryService", studentInfoQueryService);
    }

    @Test
    void studentProfile_shouldReturnClassAndBaseInfo() {
        User student = new User();
        student.setId(10);
        student.setFullName("Nguyễn Văn A");
        student.setStatus("ACTIVE");

        ClassEntity cls = new ClassEntity();
        cls.setId(20);
        cls.setName("10A1");
        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setClassEntity(cls);
        enrollment.setStatus("ACTIVE");

        when(enrollmentRepository.findByStudentId(10)).thenReturn(List.of(enrollment));

        EntityExtractionService.NormalizedEntities ne = new EntityExtractionService.NormalizedEntities();
        ReflectionTestUtils.setField(ne, "student", student);
        AuthorizationService.AuthContext ctx = new AuthorizationService.AuthContext(1, "ADMIN", 1);

        var payload = service.studentProfile(ctx, ne, Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.data();
        assertEquals(10, data.get("studentId"));
        assertEquals("10A1", data.get("className"));
        assertNotNull(payload.answer());
    }

    @Test
    void studentSubjectScore_shouldComputeAverage() {
        User student = new User();
        student.setId(11);
        student.setFullName("Nguyễn Văn B");
        Subject subject = new Subject();
        subject.setId(5);
        subject.setName("Toán");

        ExamScore s1 = new ExamScore();
        s1.setStudent(student);
        s1.setSubject(subject);
        s1.setScore(8.0);
        s1.setStatus("ACTIVE");

        ExamScore s2 = new ExamScore();
        s2.setStudent(student);
        s2.setSubject(subject);
        s2.setScore(6.0);
        s2.setStatus("ACTIVE");

        when(examScoreRepository.findBySchoolIdAndStudentId(1, 11)).thenReturn(List.of(s1, s2));

        EntityExtractionService.NormalizedEntities ne = new EntityExtractionService.NormalizedEntities();
        ReflectionTestUtils.setField(ne, "student", student);
        ReflectionTestUtils.setField(ne, "subject", subject);
        AuthorizationService.AuthContext ctx = new AuthorizationService.AuthContext(1, "ADMIN", 1);

        var payload = service.studentSubjectScore(ctx, ne, Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.data();
        assertEquals(7.0, data.get("averageScore"));
        assertEquals("Toán", data.get("subjectName"));
    }
}
