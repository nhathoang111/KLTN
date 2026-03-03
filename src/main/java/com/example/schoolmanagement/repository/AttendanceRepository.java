package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {
    
    @Query("SELECT a FROM Attendance a WHERE a.school.id = :schoolId")
    List<Attendance> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<Attendance> findByStudentId(Integer studentId);
    
    List<Attendance> findByClassEntityId(Integer classId);
    
    @Query("SELECT a FROM Attendance a WHERE a.school.id = :schoolId AND a.student.id = :studentId")
    List<Attendance> findBySchoolIdAndStudentId(@Param("schoolId") Integer schoolId, @Param("studentId") Integer studentId);
    
    @Query("SELECT a FROM Attendance a WHERE a.school.id = :schoolId AND a.classEntity.id = :classId")
    List<Attendance> findBySchoolIdAndClassEntityId(@Param("schoolId") Integer schoolId, @Param("classId") Integer classId);
    
    List<Attendance> findByAttendanceDateBetween(LocalDateTime startDate, LocalDateTime endDate);
}

