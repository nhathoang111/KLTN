package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Integer> {
    
    @Query("SELECT a FROM Assignment a WHERE a.school.id = :schoolId")
    List<Assignment> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<Assignment> findByClassEntityId(Integer classId);
    
    List<Assignment> findByCreatedById(Integer createdById);
    
    List<Assignment> findBySubjectId(Integer subjectId);
}
