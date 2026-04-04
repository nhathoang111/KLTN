package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByName(String name);
    @Query("SELECT r FROM Role r WHERE r.school.id = :schoolId")
    List<Role> findBySchoolId(@Param("schoolId") Integer schoolId);
    Role findByNameAndSchoolId(String name, Integer schoolId);
    List<Role> findBySchoolIdAndName(Integer schoolId, String name);
    
    @Query("SELECT r FROM Role r WHERE r.name LIKE :roleNamePattern")
    List<Role> findAllByName(@Param("roleNamePattern") String roleNamePattern);
    
    @Query("SELECT r FROM Role r WHERE r.school.id = :schoolId AND r.name LIKE :roleNamePattern")
    List<Role> findBySchoolIdAndNamePattern(@Param("schoolId") Integer schoolId, @Param("roleNamePattern") String roleNamePattern);
}