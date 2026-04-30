package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.EnrollmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentHistoryRepository extends JpaRepository<EnrollmentHistory, Integer> {
    long countByEnrollmentId(Integer enrollmentId);

    @Query("SELECT COUNT(DISTINCT h.student.id) FROM EnrollmentHistory h WHERE h.classEntity.id = :classId")
    long countDistinctStudentsByClassId(@Param("classId") Integer classId);

    @Query(value = "SELECT COUNT(DISTINCT student_id) FROM enrollment_history WHERE class_id = :classId", nativeQuery = true)
    long countDistinctStudentsByClassIdNative(@Param("classId") Integer classId);

    @Query("SELECT h FROM EnrollmentHistory h " +
            "WHERE h.enrollment.id = :enrollmentId AND h.endedAt IS NULL " +
            "ORDER BY h.startedAt DESC")
    List<EnrollmentHistory> findOpenByEnrollmentId(@Param("enrollmentId") Integer enrollmentId);

    @Query("SELECT h FROM EnrollmentHistory h " +
            "WHERE h.student.id = :studentId AND h.classEntity.id = :classId AND h.endedAt IS NULL " +
            "ORDER BY h.startedAt DESC")
    List<EnrollmentHistory> findOpenByStudentIdAndClassId(
            @Param("studentId") Integer studentId,
            @Param("classId") Integer classId
    );

    @Query("SELECT h FROM EnrollmentHistory h " +
            "JOIN FETCH h.student s " +
            "WHERE h.classEntity.id = :classId " +
            "ORDER BY h.startedAt DESC, h.id DESC")
    List<EnrollmentHistory> findByClassIdWithStudentDesc(@Param("classId") Integer classId);

    @Query("SELECT h FROM EnrollmentHistory h " +
            "WHERE h.student.id = :studentId AND h.classEntity.id = :classId " +
            "ORDER BY h.startedAt DESC, h.id DESC")
    List<EnrollmentHistory> findByStudentIdAndClassIdDesc(
            @Param("studentId") Integer studentId,
            @Param("classId") Integer classId
    );

    @Query("SELECT h FROM EnrollmentHistory h " +
            "WHERE h.student.id = :studentId AND h.classEntity.id = :classId AND h.endedAt IS NULL " +
            "ORDER BY h.startedAt DESC, h.id DESC")
    Optional<EnrollmentHistory> findLatestOpenByStudentAndClass(
            @Param("studentId") Integer studentId,
            @Param("classId") Integer classId
    );

    void deleteByClassEntityId(Integer classId);
}
