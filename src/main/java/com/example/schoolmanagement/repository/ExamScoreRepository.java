package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.ExamScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamScoreRepository extends JpaRepository<ExamScore, Integer> {
    
    @Query("SELECT e FROM ExamScore e WHERE e.school.id = :schoolId")
    List<ExamScore> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    List<ExamScore> findByStudentId(Integer studentId);
    
    List<ExamScore> findBySubjectId(Integer subjectId);
    
    List<ExamScore> findByClassEntityId(Integer classId);

    List<ExamScore> findByStudentIdAndSubjectIdAndClassEntityId(Integer studentId, Integer subjectId, Integer classId);
    
    @Query("SELECT e FROM ExamScore e WHERE e.school.id = :schoolId AND e.student.id = :studentId")
    List<ExamScore> findBySchoolIdAndStudentId(@Param("schoolId") Integer schoolId, @Param("studentId") Integer studentId);
    @Query("""
    SELECT e FROM ExamScore e
    WHERE e.student.id = :studentId
    AND e.subject.id = :subjectId
    AND e.classEntity.id = :classId
    AND e.scoreType = :scoreType
    AND e.attempt = :attempt
    """)
    Optional<ExamScore> findExact(
            @Param("studentId") Integer studentId,
            @Param("subjectId") Integer subjectId,
            @Param("classId") Integer classId,
            @Param("scoreType") String scoreType,
            @Param("attempt") Integer attempt
    );
}

