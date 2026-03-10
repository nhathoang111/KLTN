package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.service.SubjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = "*")
public class SubjectController {

    @Autowired
    private SubjectService subjectService;

    @GetMapping
    public ResponseEntity<?> getSubjects() {
        List<Subject> subjects = subjectService.getAllSubjects();
        return ResponseEntity.ok(Map.of("subjects", subjects));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getSubjectsBySchool(@PathVariable Integer schoolId) {
        List<Subject> subjects = subjectService.getSubjectsBySchool(schoolId);
        return ResponseEntity.ok(Map.of("subjects", subjects));
    }

    @GetMapping("/counts/classes")
    public ResponseEntity<?> getSubjectClassCounts() {
        return ResponseEntity.ok(subjectService.getSubjectClassCounts());
    }

    @GetMapping("/{id}/classes")
    public ResponseEntity<?> getClassesBySubject(@PathVariable Integer id) {
        return ResponseEntity.ok(Map.of("classes", subjectService.getClassesBySubjectId(id)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSubject(@PathVariable Integer id) {
        Subject subject = subjectService.getSubjectById(id);
        return ResponseEntity.ok(subject);
    }

    @PostMapping
    public ResponseEntity<?> createSubject(@RequestBody Map<String, Object> subjectData) {
        Subject savedSubject = subjectService.createSubject(subjectData);
        return ResponseEntity.ok(Map.of(
                "message", "Subject created successfully",
                "subject", savedSubject
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSubject(@PathVariable Integer id, @RequestBody Subject subject) {
        Subject updatedSubject = subjectService.updateSubject(id, subject);
        return ResponseEntity.ok(Map.of(
                "message", "Subject updated successfully",
                "subject", updatedSubject
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable Integer id) {
        subjectService.deleteSubject(id);
        return ResponseEntity.ok(Map.of("message", "Subject deleted successfully"));
    }
}
