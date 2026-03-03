package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Record;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Integer> {
    
    @Query("SELECT r FROM Record r WHERE r.school.id = :schoolId")
    List<Record> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<Record> findByClassEntityId(Integer classId);
    
    List<Record> findByStudentId(Integer studentId);
    
    List<Record> findBySubjectId(Integer subjectId);
    
    List<Record> findByActorId(Integer actorId);
    
    List<Record> findByType(String type);
    
    List<Record> findByStatus(String status);
    
    // Count methods for ReportController
    long countByType(String type);
    
    long countByDateAfter(LocalDateTime date);
    
    @Query("SELECT COUNT(r) FROM Record r WHERE r.school.id = :schoolId AND r.type = :type")
    long countBySchoolIdAndType(@Param("schoolId") Integer schoolId, @Param("type") String type);
    
    long countByClassEntityIdAndType(Integer classId, String type);
    
    List<Record> findByClassEntityIdAndType(Integer classId, String type);
}