package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.ParentStudent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParentStudentRepository extends JpaRepository<ParentStudent, Integer> {

    List<ParentStudent> findByParentId(Integer parentId);

    List<ParentStudent> findByStudentId(Integer studentId);

    @Query("SELECT ps FROM ParentStudent ps WHERE ps.parent.id = :parentId")
    List<ParentStudent> findByParentIdWithRelations(@Param("parentId") Integer parentId);

    @Query("SELECT ps FROM ParentStudent ps JOIN FETCH ps.student WHERE ps.parent.id = :parentId")
    List<ParentStudent> findByParentIdFetchStudent(@Param("parentId") Integer parentId);

    @Query("SELECT ps FROM ParentStudent ps WHERE ps.student.id = :studentId")
    List<ParentStudent> findByStudentIdWithRelations(@Param("studentId") Integer studentId);

    Optional<ParentStudent> findByParentIdAndStudentId(Integer parentId, Integer studentId);

    boolean existsByParentIdAndStudentId(Integer parentId, Integer studentId);

    List<ParentStudent> findBySchoolId(Integer schoolId);
}
