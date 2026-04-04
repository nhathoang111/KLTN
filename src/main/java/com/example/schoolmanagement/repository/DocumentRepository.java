package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    @Query("SELECT d FROM Document d WHERE d.school.id = :schoolId")
    List<Document> findBySchoolId(@Param("schoolId") Integer schoolId);
    List<Document> findByClassEntityId(Integer classId);
    List<Document> findByUploadedById(Integer uploadedById);
    List<Document> findByFileType(String fileType);
}
