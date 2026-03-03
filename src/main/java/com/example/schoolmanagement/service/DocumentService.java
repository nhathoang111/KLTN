package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Document;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.DocumentRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {

    private static final String UPLOAD_DIR = "uploads/documents/";

    @Autowired
    private DocumentRepository documentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClassRepository classRepository;
    @Autowired
    private SchoolRepository schoolRepository;

    public List<Document> getDocuments(Integer schoolId, Integer classId) {
        if (classId != null) {
            return documentRepository.findByClassEntityId(classId);
        }
        if (schoolId != null) {
            return documentRepository.findBySchoolId(schoolId);
        }
        return documentRepository.findAll();
    }

    public List<Document> getDocumentsBySchool(Integer schoolId) {
        return documentRepository.findBySchoolId(schoolId);
    }

    public List<Document> getDocumentsByClass(Integer classId) {
        return documentRepository.findByClassEntityId(classId);
    }

    public Document getDocument(Integer id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
    }

    public Document createDocument(Map<String, Object> documentData) {
        Document document = new Document();
        document.setTitle((String) documentData.get("title"));
        document.setDescription((String) documentData.get("description"));
        document.setFileName((String) documentData.get("fileName"));
        document.setFilePath((String) documentData.get("filePath"));
        document.setFileType((String) documentData.get("fileType"));
        document.setUploadedAt(LocalDateTime.now());
        if (documentData.get("fileSize") != null) {
            document.setFileSize(((Number) documentData.get("fileSize")).longValue());
        }
        Integer schoolId = (Integer) documentData.get("schoolId");
        if (schoolId != null) {
            document.setSchool(schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }
        Integer classId = (Integer) documentData.get("classId");
        if (classId != null) {
            document.setClassEntity(classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID")));
        }
        Integer uploadedById = (Integer) documentData.get("uploadedById");
        if (uploadedById != null) {
            document.setUploadedBy(userRepository.findById(uploadedById)
                    .orElseThrow(() -> new BadRequestException("Invalid uploader ID")));
        }
        if (document.getTitle() == null || document.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Title is required");
        }
        return documentRepository.save(document);
    }

    public Document uploadDocument(MultipartFile file, String title, String description,
                                   Integer schoolId, Integer classId, Integer uploadedById) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                throw new BadRequestException("Invalid filename");
            }
            String fileExtension = originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath);

            Document document = new Document();
            document.setTitle(title);
            document.setDescription(description);
            document.setFileName(originalFilename);
            document.setFilePath(filePath.toString());
            document.setFileType(file.getContentType());
            document.setFileSize(file.getSize());
            document.setUploadedAt(LocalDateTime.now());
            if (schoolId != null) {
                document.setSchool(schoolRepository.findById(schoolId)
                        .orElseThrow(() -> new BadRequestException("Invalid school ID")));
            }
            if (classId != null) {
                document.setClassEntity(classRepository.findById(classId)
                        .orElseThrow(() -> new BadRequestException("Invalid class ID")));
            }
            document.setUploadedBy(userRepository.findById(uploadedById)
                    .orElseThrow(() -> new BadRequestException("Invalid uploader ID")));
            return documentRepository.save(document);
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    public Document updateDocument(Integer id, Map<String, Object> documentData) {
        Document document = getDocument(id);
        if (documentData.containsKey("title")) {
            document.setTitle((String) documentData.get("title"));
        }
        if (documentData.containsKey("description")) {
            document.setDescription((String) documentData.get("description"));
        }
        return documentRepository.save(document);
    }

    public void deleteDocument(Integer id) {
        Document document = getDocument(id);
        if (document.getFilePath() != null) {
            try {
                Files.deleteIfExists(Paths.get(document.getFilePath()));
            } catch (IOException e) {
                // Log but continue with DB deletion
            }
        }
        documentRepository.deleteById(id);
    }
}
