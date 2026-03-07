package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Integer> {
    @Query("SELECT e FROM Enrollment e WHERE e.school.id = :schoolId")
    List<Enrollment> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<Enrollment> findByClassEntityId(Integer classId);
    
    @Query("SELECT DISTINCT e FROM Enrollment e " +
           "LEFT JOIN FETCH e.classEntity c " +
           "LEFT JOIN FETCH e.student s " +
           "LEFT JOIN FETCH e.school " +
           "WHERE e.student.id = :studentId " +
           "ORDER BY CASE WHEN e.status = 'ACTIVE' THEN 0 ELSE 1 END, e.id")
    List<Enrollment> findByStudentId(@Param("studentId") Integer studentId);
    
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.student WHERE e.classEntity.id = :classId AND e.status = 'ACTIVE'")
    List<Enrollment> findActiveEnrollmentsByClassId(@Param("classId") Integer classId);
    
    @Query("SELECT DISTINCT e FROM Enrollment e JOIN FETCH e.student s JOIN FETCH s.role JOIN FETCH e.classEntity WHERE e.classEntity.id = :classId AND e.status = 'ACTIVE'")
    List<Enrollment> findByClassEntityIdWithStudents(@Param("classId") Integer classId);

    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.classEntity.id = :classId AND (e.status = 'ACTIVE' OR e.status IS NULL)")
    long countActiveByClassEntityId(@Param("classId") Integer classId);

    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.classEntity.id = :classId")
    long countByClassEntityId(@Param("classId") Integer classId);

    @Query(value = "SELECT COUNT(*) FROM enrollments WHERE class_id = :classId", nativeQuery = true)
    long countByClassIdNative(@Param("classId") Integer classId);
}