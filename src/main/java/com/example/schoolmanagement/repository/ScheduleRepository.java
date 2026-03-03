package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Integer> {
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school")
    List<Schedule> findAllWithRelations();
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school WHERE s.school.id = :schoolId")
    List<Schedule> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school WHERE s.classEntity.id = :classId")
    List<Schedule> findByClassEntityId(@Param("classId") Integer classId);
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school WHERE s.teacher.id = :teacherId")
    List<Schedule> findByTeacherId(@Param("teacherId") Integer teacherId);
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school WHERE s.date = :date AND s.period = :period AND (s.teacher.id = :teacherId OR s.classEntity.id = :classId)")
    List<Schedule> findConflictsByDate(@Param("date") java.time.LocalDate date, 
                                      @Param("period") Integer period, 
                                      @Param("teacherId") Integer teacherId, 
                                      @Param("classId") Integer classId);
}

