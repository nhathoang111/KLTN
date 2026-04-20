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

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE e.school.id = :schoolId
    """)
    List<ExamScore> findBySchoolId(@Param("schoolId") Integer schoolId);

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE s.id = :studentId
    """)
    List<ExamScore> findByStudentId(@Param("studentId") Integer studentId);

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject sub
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE sub.id = :subjectId
    """)
    List<ExamScore> findBySubjectId(@Param("subjectId") Integer subjectId);

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE ce.id = :classId
    """)
    List<ExamScore> findByClassEntityId(@Param("classId") Integer classId);

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject sub
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE s.id = :studentId AND sub.id = :subjectId AND ce.id = :classId
    """)
    List<ExamScore> findByStudentIdAndSubjectIdAndClassEntityId(
            @Param("studentId") Integer studentId,
            @Param("subjectId") Integer subjectId,
            @Param("classId") Integer classId
    );

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE e.school.id = :schoolId AND s.id = :studentId
    """)
    List<ExamScore> findBySchoolIdAndStudentId(@Param("schoolId") Integer schoolId, @Param("studentId") Integer studentId);

    @Query("""
        SELECT e FROM ExamScore e
        LEFT JOIN FETCH e.student s
        LEFT JOIN FETCH s.school
        LEFT JOIN FETCH s.role
        LEFT JOIN FETCH e.subject sub
        LEFT JOIN FETCH e.classEntity ce
        LEFT JOIN FETCH ce.school
        LEFT JOIN FETCH e.school
        WHERE s.id = :studentId
        AND sub.id = :subjectId
        AND ce.id = :classId
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
