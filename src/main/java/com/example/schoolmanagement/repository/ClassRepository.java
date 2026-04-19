/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ClassRepository extends JpaRepository<ClassEntity, Integer> {
    @Query("SELECT c FROM ClassEntity c WHERE c.school.id = :schoolId")
    List<ClassEntity> findBySchoolId(@Param("schoolId") Integer schoolId);

    @Query("SELECT c FROM ClassEntity c WHERE c.homeroomTeacher.id = :teacherId")
    List<ClassEntity> findByHomeroomTeacherId(@Param("teacherId") Integer teacherId);
    @Query("SELECT COUNT(c) FROM ClassEntity c WHERE c.school.id = :schoolId")
    long countBySchoolId(@Param("schoolId") Integer schoolId);
    
    @Query("SELECT c FROM ClassEntity c JOIN FETCH c.school WHERE c.id = :id")
    Optional<ClassEntity> findByIdWithSchool(@Param("id") Integer id);
    
    @Query("SELECT c FROM ClassEntity c WHERE c.name = :name AND c.school.id = :schoolId")
    Optional<ClassEntity> findByNameAndSchoolId(@Param("name") String name, @Param("schoolId") Integer schoolId);

    /**
     * Trùng khối + số lớp cùng trường: niên khóa trùng hoặc một bên null (dữ liệu cũ).
     * Bỏ qua lớp ARCHIVED để năm mới có thể tạo lại cùng khối/số.
     */
    @Query("SELECT COUNT(c) FROM ClassEntity c WHERE c.school.id = :schoolId AND c.gradeLevel = :gl AND c.classNumber = :cn "
            + "AND (LOWER(TRIM(COALESCE(c.status, ''))) <> 'archived') "
            + "AND ("
            + "  ((:syId IS NULL AND c.schoolYear IS NULL) OR (c.schoolYear IS NOT NULL AND :syId IS NOT NULL AND c.schoolYear.id = :syId))"
            + "  OR (:syId IS NOT NULL AND c.schoolYear IS NULL)"
            + "  OR (:syId IS NULL AND c.schoolYear IS NOT NULL)"
            + ") "
            + "AND (:excludeId IS NULL OR c.id <> :excludeId)")
    long countDuplicateClassStructure(
            @Param("schoolId") Integer schoolId,
            @Param("syId") Integer schoolYearId,
            @Param("gl") Integer gradeLevel,
            @Param("cn") Integer classNumber,
            @Param("excludeId") Integer excludeId);

    /** Trùng tên hiển thị cùng trường (chỉ lớp chưa ARCHIVED — cho phép tái dùng tên sau khi lưu trữ). */
    @Query("SELECT COUNT(c) FROM ClassEntity c WHERE c.school.id = :schoolId AND LOWER(TRIM(c.name)) = LOWER(TRIM(:name)) "
            + "AND (LOWER(TRIM(COALESCE(c.status, ''))) <> 'archived') "
            + "AND (:excludeId IS NULL OR c.id <> :excludeId)")
    long countBySchoolAndNameNormalized(
            @Param("schoolId") Integer schoolId,
            @Param("name") String name,
            @Param("excludeId") Integer excludeId);

    /** Phòng đã dùng bởi lớp khác cùng trường (bỏ qua lớp ARCHIVED để tái sử dụng phòng). */
    @Query("SELECT COUNT(c) FROM ClassEntity c WHERE c.school.id = :schoolId AND c.room IS NOT NULL AND TRIM(c.room) <> '' "
            + "AND LOWER(TRIM(c.room)) = LOWER(TRIM(:room)) "
            + "AND (LOWER(TRIM(COALESCE(c.status, ''))) <> 'archived') "
            + "AND (:excludeId IS NULL OR c.id <> :excludeId)")
    long countBySchoolAndRoomNormalized(
            @Param("schoolId") Integer schoolId,
            @Param("room") String room,
            @Param("excludeId") Integer excludeId);

}