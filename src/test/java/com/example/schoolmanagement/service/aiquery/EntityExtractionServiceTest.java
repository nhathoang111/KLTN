package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntityExtractionServiceTest {

    @Mock private ClassRepository classRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private UserRepository userRepository;

    private EntityExtractionService service;

    @BeforeEach
    void setUp() {
        service = new EntityExtractionService();
        ReflectionTestUtils.setField(service, "classRepository", classRepository);
        ReflectionTestUtils.setField(service, "subjectRepository", subjectRepository);
        ReflectionTestUtils.setField(service, "userRepository", userRepository);
    }

    @Test
    void normalizeEntities_shouldResolveClassSubjectStudentTeacher() {
        ClassEntity cls = new ClassEntity();
        cls.setId(10);
        cls.setName("10A1");
        when(classRepository.findBySchoolId(1)).thenReturn(List.of(cls));

        Subject subj = new Subject();
        subj.setId(20);
        subj.setName("Toán");
        when(subjectRepository.findBySchoolIdOrderBySortIndex(1)).thenReturn(List.of(subj));

        User student = new User();
        student.setId(30);
        student.setFullName("Nguyễn Văn A");
        when(userRepository.findBySchoolIdAndRoleName(1, "%STUDENT%")).thenReturn(List.of(student));

        User teacher = new User();
        teacher.setId(40);
        teacher.setFullName("Nguyễn Văn B");
        when(userRepository.findBySchoolIdAndRoleName(1, "%TEACHER%")).thenReturn(List.of(teacher));

        var out = service.normalizeEntities(1, Map.of(
                "className", "10A1",
                "subjectName", "Toán",
                "studentName", "Nguyễn Văn A",
                "teacherName", "Nguyễn Văn B"
        ));

        assertNotNull(out.getClassEntity());
        assertNotNull(out.getSubject());
        assertNotNull(out.getStudent());
        assertNotNull(out.getTeacher());
        assertEquals(10, out.getClassEntity().getId());
        assertEquals(20, out.getSubject().getId());
        assertEquals(30, out.getStudent().getId());
        assertEquals(40, out.getTeacher().getId());
    }

    @Test
    void normalizeEntities_shouldSkipTeacherForHomeroomLookupWithClass() {
        ClassEntity cls = new ClassEntity();
        cls.setId(10);
        cls.setName("10/5");
        when(classRepository.findBySchoolId(1)).thenReturn(List.of(cls));
        when(userRepository.findBySchoolIdAndRoleName(1, "%TEACHER%")).thenReturn(List.of());

        var out = service.normalizeEntities(1, Map.of(
                "_intent", "HOMEROOM_LOOKUP",
                "className", "10/5",
                "teacherName", "Nguyễn Văn B"
        ));
        assertNotNull(out.getClassEntity());
        assertNull(out.getTeacher());
    }

    @Test
    void normalizeEntities_shouldIgnoreUnmatchedTeacherWithoutError() {
        when(userRepository.findBySchoolIdAndRoleName(1, "%TEACHER%")).thenReturn(List.of());
        var out = service.normalizeEntities(1, Map.of("teacherName", "Nguyễn Văn Z"));
        assertNull(out.getTeacher());
    }
}
