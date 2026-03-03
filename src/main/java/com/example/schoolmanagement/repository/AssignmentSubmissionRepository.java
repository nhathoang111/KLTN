package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Integer> {
    
    List<AssignmentSubmission> findByAssignmentId(Integer assignmentId);
    
    List<AssignmentSubmission> findByStudentId(Integer studentId);
    
    @Query("SELECT a FROM AssignmentSubmission a WHERE a.school.id = :schoolId")
    List<AssignmentSubmission> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<AssignmentSubmission> findByAssignmentIdAndStudentId(Integer assignmentId, Integer studentId);
}
