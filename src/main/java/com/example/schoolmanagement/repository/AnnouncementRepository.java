package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Integer> {
    @Query("SELECT a FROM Announcement a WHERE a.school.id = :schoolId")
    List<Announcement> findBySchoolId(@Param("schoolId") Integer schoolId);
    List<Announcement> findByClassEntityId(Integer classId);
    List<Announcement> findByCreatedById(Integer createdById);
}