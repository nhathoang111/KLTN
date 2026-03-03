package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.TeacherSubject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeacherSubjectRepository extends JpaRepository<TeacherSubject, Integer> {

    List<TeacherSubject> findByUserId(Integer userId);

    @Query("SELECT ts.subject.id FROM TeacherSubject ts WHERE ts.user.id = :teacherId")
    List<Integer> findSubjectIdsByUserId(@Param("teacherId") Integer teacherId);

    @Modifying
    @Query("DELETE FROM TeacherSubject ts WHERE ts.user.id = :userId")
    void deleteByUserId(@Param("userId") Integer userId);
}
