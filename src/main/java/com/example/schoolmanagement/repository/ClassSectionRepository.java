package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.ClassSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClassSectionRepository extends JpaRepository<ClassSection, Integer> {

    List<ClassSection> findByClassRoomId(Integer classRoomId);

    List<ClassSection> findBySubjectId(Integer subjectId);

    List<ClassSection> findByTeacherId(Integer teacherId);

    @Query("SELECT cs FROM ClassSection cs WHERE cs.classRoom.school.id = :schoolId")
    List<ClassSection> findBySchoolId(@Param("schoolId") Integer schoolId);

    /** Số lớp (distinct class_room_id) đang học từng môn. */
    @Query("SELECT cs.subject.id, COUNT(DISTINCT cs.classRoom.id) FROM ClassSection cs GROUP BY cs.subject.id")
    List<Object[]> countDistinctClassesBySubjectId();
}
