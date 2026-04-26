package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.ScheduleTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleTemplateRepository extends JpaRepository<ScheduleTemplate, Integer> {

    @Query("SELECT st FROM ScheduleTemplate st " +
            "LEFT JOIN FETCH st.school " +
            "LEFT JOIN FETCH st.classEntity ce " +
            "LEFT JOIN FETCH ce.school " +
            "LEFT JOIN FETCH st.subject " +
            "LEFT JOIN FETCH st.teacher t " +
            "LEFT JOIN FETCH t.school " +
            "LEFT JOIN FETCH t.role tr " +
            "LEFT JOIN FETCH st.classSection cs " +
            "LEFT JOIN FETCH cs.subject " +
            "LEFT JOIN FETCH cs.teacher " +
            "WHERE st.classEntity.id = :classId AND st.weekStart = :weekStart " +
            "ORDER BY st.date ASC, st.period ASC")
    List<ScheduleTemplate> findByClassIdAndWeekStartWithRelations(@Param("classId") Integer classId,
                                                                  @Param("weekStart") LocalDate weekStart);

    @Query("SELECT st FROM ScheduleTemplate st " +
            "WHERE st.classEntity.id = :classId AND st.weekStart = :weekStart")
    List<ScheduleTemplate> findByClassIdAndWeekStart(@Param("classId") Integer classId,
                                                     @Param("weekStart") LocalDate weekStart);

    void deleteByClassEntityIdAndWeekStart(Integer classId, LocalDate weekStart);
}
