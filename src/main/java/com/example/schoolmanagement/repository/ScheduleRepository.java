package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Integer> {

    /**
     * Nạp đủ quan hệ dùng cho JSON (tránh LazyInitializationException khi open-in-view=false).
     * Gồm class_section (lớp/môn/GV phụ) và teacher.school, teacher.role.
     */
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.school " +
            "LEFT JOIN FETCH s.classEntity ce " +
            "LEFT JOIN FETCH ce.school " +
            "LEFT JOIN FETCH s.subject " +
            "LEFT JOIN FETCH s.teacher t " +
            "LEFT JOIN FETCH t.school " +
            "LEFT JOIN FETCH t.role tr " +
            "LEFT JOIN FETCH tr.school " +
            "LEFT JOIN FETCH s.classSection cs " +
            "LEFT JOIN FETCH cs.classRoom " +
            "LEFT JOIN FETCH cs.subject " +
            "LEFT JOIN FETCH cs.teacher cst " +
            "LEFT JOIN FETCH cst.school " +
            "WHERE s.id = :id")
    Optional<Schedule> findByIdWithRelations(@Param("id") Integer id);
    
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.classEntity " +
            "LEFT JOIN FETCH s.teacher " +
            "LEFT JOIN FETCH s.subject " +
            "LEFT JOIN FETCH s.school " +
            "LEFT JOIN FETCH s.classSection")
    List<Schedule> findAllWithRelations();
    
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.classEntity " +
            "LEFT JOIN FETCH s.teacher " +
            "LEFT JOIN FETCH s.subject " +
            "LEFT JOIN FETCH s.school " +
            "LEFT JOIN FETCH s.classSection cs " +
            "WHERE s.school.id = :schoolId")
    List<Schedule> findBySchoolId(@Param("schoolId") Integer schoolId);
    
    /** Nạp classSection để lọc theo học kỳ / năm học (Admin Xem điểm). */
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.classEntity " +
            "LEFT JOIN FETCH s.teacher " +
            "LEFT JOIN FETCH s.subject " +
            "LEFT JOIN FETCH s.school " +
            "LEFT JOIN FETCH s.classSection cs " +
            "WHERE s.classEntity.id = :classId")
    List<Schedule> findByClassEntityId(@Param("classId") Integer classId);
    
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.classEntity " +
            "LEFT JOIN FETCH s.teacher " +
            "LEFT JOIN FETCH s.subject " +
            "LEFT JOIN FETCH s.school " +
            "LEFT JOIN FETCH s.classSection cs " +
            "LEFT JOIN FETCH cs.subject " +
            "WHERE s.teacher.id = :teacherId")
    List<Schedule> findByTeacherId(@Param("teacherId") Integer teacherId);
    
    @Query("SELECT DISTINCT s FROM Schedule s LEFT JOIN FETCH s.classEntity LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.subject LEFT JOIN FETCH s.school WHERE s.date = :date AND s.period = :period AND (s.teacher.id = :teacherId OR s.classEntity.id = :classId)")
    List<Schedule> findConflictsByDate(@Param("date") java.time.LocalDate date,
                                      @Param("period") Integer period,
                                      @Param("teacherId") Integer teacherId,
                                      @Param("classId") Integer classId);

    /** Số lớp (distinct class_id) có ít nhất một tiết trong TKB cho từng môn. */
    @Query("SELECT s.subject.id, COUNT(DISTINCT s.classEntity.id) FROM Schedule s WHERE s.subject.id IS NOT NULL GROUP BY s.subject.id")
    List<Object[]> countDistinctClassesBySubjectIdFromSchedules();

    /** Danh sách lớp (distinct) đang học môn: [classId, className]. */
    @Query("SELECT DISTINCT s.classEntity.id, s.classEntity.name FROM Schedule s WHERE s.subject.id = :subjectId AND s.classEntity.id IS NOT NULL")
    List<Object[]> findDistinctClassIdAndNameBySubjectId(@Param("subjectId") Integer subjectId);
}

