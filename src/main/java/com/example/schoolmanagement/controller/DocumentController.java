package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Document;
import com.example.schoolmanagement.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @GetMapping
    public ResponseEntity<?> getDocuments(@RequestParam(required = false) Integer schoolId,
                                         @RequestParam(required = false) Integer classId) {
        List<Document> documents = documentService.getDocuments(schoolId, classId);
        return ResponseEntity.ok(Map.of("documents", documents));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getDocumentsBySchool(@PathVariable Integer schoolId) {
        List<Document> documents = documentService.getDocumentsBySchool(schoolId);
        return ResponseEntity.ok(Map.of("documents", documents));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getDocumentsByClass(@PathVariable Integer classId) {
        List<Document> documents = documentService.getDocumentsByClass(classId);
        return ResponseEntity.ok(Map.of("documents", documents));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDocument(@PathVariable Integer id) {
        Document document = documentService.getDocument(id);
        return ResponseEntity.ok(document);
    }

    @PostMapping(consumes = "application/json;charset=UTF-8")
    public ResponseEntity<?> createDocument(@RequestBody Map<String, Object> documentData) {
        Document savedDocument = documentService.createDocument(documentData);
        return ResponseEntity.ok(Map.of(
                "message", "Document created successfully",
                "document", savedDocument
        ));
    }

    

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Integer id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }
}
