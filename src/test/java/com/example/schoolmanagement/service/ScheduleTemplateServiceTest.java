package com.example.schoolmanagement.service;

import com.example.schoolmanagement.dto.schedule.GenerateFromTemplateRequest;
import com.example.schoolmanagement.dto.schedule.GenerateFromTemplateResult;
import com.example.schoolmanagement.dto.schedule.ScheduleTemplateSaveRequest;
import com.example.schoolmanagement.dto.schedule.ScheduleTemplateSlotRequest;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Schedule;
import com.example.schoolmanagement.entity.ScheduleTemplate;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleTemplateServiceTest {

    @Mock
    private ScheduleTemplateRepository scheduleTemplateRepository;
    @Mock
    private ScheduleRepository scheduleRepository;
    @Mock
    private ClassRepository classRepository;
    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private ScheduleTemplateService scheduleTemplateService;

    @Test
    void saveTemplate_shouldThrowWhenDuplicateClassSlot() {
        ClassEntity cls = new ClassEntity();
        cls.setId(10);
        School school = new School();
        school.setId(1);
        cls.setSchool(school);

        when(classRepository.findById(10)).thenReturn(Optional.of(cls));

        ScheduleTemplateSaveRequest req = new ScheduleTemplateSaveRequest();
        req.setClassId(10);
        req.setWeekStart(LocalDate.of(2026, 4, 20));

        ScheduleTemplateSlotRequest s1 = new ScheduleTemplateSlotRequest();
        s1.setDate(LocalDate.of(2026, 4, 21));
        s1.setPeriod(1);
        ScheduleTemplateSlotRequest s2 = new ScheduleTemplateSlotRequest();
        s2.setDate(LocalDate.of(2026, 4, 21));
        s2.setPeriod(1);
        req.setSlots(List.of(s1, s2));

        assertThrows(BadRequestException.class, () -> scheduleTemplateService.saveTemplate(req));
        verify(scheduleTemplateRepository, never()).saveAll(any());
    }

    @Test
    void generateFromTemplate_shouldReplaceSchedulesInSemesterRange() {
        ClassEntity cls = new ClassEntity();
        cls.setId(99);
        School school = new School();
        school.setId(5);
        cls.setSchool(school);

        when(classRepository.findById(99)).thenReturn(Optional.of(cls));

        ScheduleTemplate t1 = new ScheduleTemplate();
        t1.setDayOfWeek(1);
        t1.setPeriod(1);
        t1.setRoom("A101");
        t1.setClassEntity(cls);
        t1.setSchool(school);
        ScheduleTemplate t2 = new ScheduleTemplate();
        t2.setDayOfWeek(2);
        t2.setPeriod(2);
        t2.setRoom("A101");
        t2.setClassEntity(cls);
        t2.setSchool(school);
        when(scheduleTemplateRepository.findByClassIdAndWeekStartWithRelations(eq(99), eq(LocalDate.of(2026, 9, 7))))
                .thenReturn(List.of(t1, t2));

        Schedule old1 = new Schedule();
        old1.setDate(LocalDate.of(2026, 9, 14));
        old1.setPeriod(1);
        Schedule old2 = new Schedule();
        old2.setDate(LocalDate.of(2026, 8, 1)); // ngoài kỳ
        old2.setPeriod(2);
        when(scheduleRepository.findByClassEntityId(99)).thenReturn(List.of(old1, old2));

        GenerateFromTemplateRequest req = new GenerateFromTemplateRequest();
        req.setClassId(99);
        req.setWeekStartTemplate(LocalDate.of(2026, 9, 7));
        req.setSemesterStart(LocalDate.of(2026, 9, 14));
        req.setSemesterEnd(LocalDate.of(2026, 9, 26));

        GenerateFromTemplateResult result = scheduleTemplateService.generateFromTemplate(req);

        assertTrue(result.isSuccess());
        assertEquals(1, result.getDeletedCount());
        assertEquals(4, result.getCreatedCount());

        verify(scheduleRepository).deleteAll(argThat(list -> {
            List<Schedule> copy = new ArrayList<>();
            for (Schedule s : list) {
                copy.add(s);
            }
            return copy.size() == 1;
        }));
        ArgumentCaptor<Iterable<Schedule>> createdCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(scheduleRepository).saveAll(createdCaptor.capture());
        int createdSize = 0;
        for (Schedule ignored : createdCaptor.getValue()) {
            createdSize++;
        }
        assertEquals(4, createdSize);
    }
}
