/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Integer> {
    @Query("SELECT s FROM Subject s WHERE s.school.id = :schoolId")
    List<Subject> findBySchoolId(@Param("schoolId") Integer schoolId);

    Optional<Subject> findBySchoolIdAndCode(Integer schoolId, String code);

    @Query("SELECT s FROM Subject s WHERE s.school.id = :schoolId ORDER BY COALESCE(s.sortIndex, 9999) ASC, s.id ASC")
    List<Subject> findBySchoolIdOrderBySortIndex(@Param("schoolId") Integer schoolId);
    @Query("SELECT s FROM Subject s WHERE s.name = :name AND s.school.id = :schoolId")
    Optional<Subject> findByNameAndSchoolId(@Param("name") String name, @Param("schoolId") Integer schoolId);
}