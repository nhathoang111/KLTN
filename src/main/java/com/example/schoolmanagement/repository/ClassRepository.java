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
    
}