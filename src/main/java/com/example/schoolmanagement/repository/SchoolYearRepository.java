package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.SchoolYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SchoolYearRepository extends JpaRepository<SchoolYear, Integer> {

    List<SchoolYear> findBySchoolId(Integer schoolId);

    @Query("SELECT sy FROM SchoolYear sy WHERE sy.school.id = :schoolId AND sy.name = :name")
    Optional<SchoolYear> findBySchoolIdAndName(@Param("schoolId") Integer schoolId, @Param("name") String name);
}
