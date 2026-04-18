package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Integer> {
    Optional<School> findByCode(String code);

    long countByStatus(String status);
    
    // Query methods that handle non-null values only
    @Query("SELECT s FROM School s WHERE s.phone = :phone")
    Optional<School> findByPhone(@Param("phone") String phone);
    
    // Alternative: Use native query to ensure exact match
    @Query(value = "SELECT * FROM schools WHERE phone = :phone", nativeQuery = true)
    Optional<School> findByPhoneNative(@Param("phone") String phone);
    
    @Query("SELECT s FROM School s WHERE s.email = :email AND s.email IS NOT NULL")
    Optional<School> findByEmail(@Param("email") String email);
    
    @Query("SELECT s FROM School s WHERE s.address = :address AND s.address IS NOT NULL")
    Optional<School> findByAddress(@Param("address") String address);
    
    @Query("SELECT s FROM School s WHERE s.phone = :phone AND s.id != :id")
    Optional<School> findByPhoneAndIdNot(@Param("phone") String phone, @Param("id") Integer id);
    
    @Query("SELECT s FROM School s WHERE s.address = :address AND s.address IS NOT NULL AND s.id != :id")
    Optional<School> findByAddressAndIdNot(@Param("address") String address, @Param("id") Integer id);
    
    // Case-insensitive email search (only if email is not null)
    @Query("SELECT s FROM School s WHERE s.email IS NOT NULL AND LOWER(s.email) = LOWER(:email)")
    Optional<School> findByEmailIgnoreCase(@Param("email") String email);
    
    @Query("SELECT s FROM School s WHERE s.email IS NOT NULL AND LOWER(s.email) = LOWER(:email) AND s.id != :id")
    Optional<School> findByEmailIgnoreCaseAndIdNot(@Param("email") String email, @Param("id") Integer id);
}