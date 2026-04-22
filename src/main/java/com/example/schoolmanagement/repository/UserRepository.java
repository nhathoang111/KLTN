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
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.email = :email")
    List<User> findAllByEmail(@Param("email") String email);
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.school.id = :schoolId")
    List<User> findBySchoolId(@Param("schoolId") Integer schoolId);
    List<User> findByRoleId(Integer roleId);
    long countByRoleId(Integer roleId);
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.school.id = :schoolId AND u.role.name LIKE :roleNamePattern")
    List<User> findBySchoolIdAndRoleName(@Param("schoolId") Integer schoolId, @Param("roleNamePattern") String roleNamePattern);
    
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.school LEFT JOIN FETCH u.role WHERE u.role.name LIKE :roleNamePattern")
    List<User> findByRoleName(@Param("roleNamePattern") String roleNamePattern);
    
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.school.id = :schoolId")
    Optional<User> findByEmailAndSchoolId(@Param("email") String email, @Param("schoolId") Integer schoolId);
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.school.id = :schoolId")
    boolean existsByEmailAndSchoolId(@Param("email") String email, @Param("schoolId") Integer schoolId);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.school.id = :schoolId AND u.id <> :excludeId")
    boolean existsByEmailAndSchoolIdAndIdNot(@Param("email") String email,
                                             @Param("schoolId") Integer schoolId,
                                             @Param("excludeId") Integer excludeId);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.school IS NULL")
    boolean existsByEmailWithSchoolNull(@Param("email") String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.school IS NULL AND u.id <> :excludeId")
    boolean existsByEmailWithSchoolNullAndIdNot(@Param("email") String email, @Param("excludeId") Integer excludeId);

    /** Admin trường (không tính Super Admin). */
    @Query("SELECT COUNT(u) FROM User u JOIN u.role r WHERE UPPER(r.name) LIKE 'ADMIN%' AND UPPER(r.name) NOT LIKE '%SUPER%'")
    long countSchoolAdminUsers();

    @Query("SELECT COUNT(u) FROM User u JOIN u.role r WHERE UPPER(r.name) LIKE 'STUDENT%'")
    long countStudentUsers();

    @Query("SELECT COUNT(u) FROM User u JOIN u.role r WHERE UPPER(r.name) LIKE 'TEACHER%'")
    long countTeacherUsers();

    @Query("SELECT COUNT(u) FROM User u JOIN u.role r WHERE UPPER(r.name) LIKE 'PARENT%'")
    long countParentUsers();
}