package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.id = :id")
    Optional<User> findByIdWithSchoolAndRole(@Param("id") Integer id);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.school.id = :schoolId")
    List<User> findBySchoolId(@Param("schoolId") Integer schoolId);
    List<User> findByRoleId(Integer roleId);
    long countByRoleId(Integer roleId);
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.school.id = :schoolId AND u.role.name LIKE :roleNamePattern")
    List<User> findBySchoolIdAndRoleName(@Param("schoolId") Integer schoolId, @Param("roleNamePattern") String roleNamePattern);
    
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.role.name LIKE :roleNamePattern")
    List<User> findByRoleName(@Param("roleNamePattern") String roleNamePattern);
}