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

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school.id = :schoolId AND s.code = :code AND s.id <> :excludeId")
    boolean existsOtherByCodeInSchool(@Param("schoolId") Integer schoolId, @Param("code") String code, @Param("excludeId") Integer excludeId);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school.id = :schoolId AND s.name = :name AND s.id <> :excludeId")
    boolean existsOtherByNameInSchool(@Param("schoolId") Integer schoolId, @Param("name") String name, @Param("excludeId") Integer excludeId);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school IS NULL AND s.code = :code AND s.id <> :excludeId")
    boolean existsOtherByCodeWithSchoolNull(@Param("code") String code, @Param("excludeId") Integer excludeId);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school IS NULL AND s.name = :name AND s.id <> :excludeId")
    boolean existsOtherByNameWithSchoolNull(@Param("name") String name, @Param("excludeId") Integer excludeId);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school IS NULL AND s.code = :code")
    boolean existsByCodeWithSchoolNull(@Param("code") String code);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Subject s WHERE s.school IS NULL AND s.name = :name")
    boolean existsByNameWithSchoolNull(@Param("name") String name);

    @Query("SELECT s FROM Subject s WHERE s.school.id = :schoolId ORDER BY COALESCE(s.sortIndex, 9999) ASC, s.id ASC")
    List<Subject> findBySchoolIdOrderBySortIndex(@Param("schoolId") Integer schoolId);
    @Query("SELECT s FROM Subject s WHERE s.name = :name AND s.school.id = :schoolId")
    Optional<Subject> findByNameAndSchoolId(@Param("name") String name, @Param("schoolId") Integer schoolId);
}