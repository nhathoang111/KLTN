package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Assignment;
import com.example.schoolmanagement.entity.AssignmentSubmission;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.service.AssignmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = "*")
public class AssignmentController {

    private static final Logger log = LoggerFactory.getLogger(AssignmentController.class);

    @Autowired
    private AssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<?> getAssignments() {
        List<Assignment> assignments = assignmentService.getAllAssignments();
        return ResponseEntity.ok(Map.of("assignments", assignments));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getAssignmentsByClass(@PathVariable Integer classId) {
        List<Assignment> assignments = assignmentService.getAssignmentsByClass(classId);
        return ResponseEntity.ok(Map.of("assignments", assignments));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<?> getAssignmentsByTeacher(@PathVariable Integer teacherId) {
        List<Assignment> assignments = assignmentService.getAssignmentsByTeacher(teacherId);
        return ResponseEntity.ok(Map.of("assignments", assignments));
    }

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadAssignmentWithFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String instructions,
            @RequestParam("maxScore") String maxScoreStr,
            @RequestParam(required = false) String dueDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String schoolId,
            @RequestParam(required = false) String classId,
            @RequestParam(required = false) String subjectId,
            @RequestParam("createdById") String createdByIdStr) {
        Assignment savedAssignment = assignmentService.createAssignmentWithFile(
                file,
                title,
                description,
                instructions,
                maxScoreStr,
                dueDate,
                status,
                schoolId,
                classId,
                subjectId,
                createdByIdStr
        );

        return ResponseEntity.ok(Map.of(
            "message", "Assignment created successfully with file",
            "assignment", savedAssignment
        ));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadAssignmentFile(@PathVariable Integer id) {
        Assignment assignment = assignmentService.getAssignmentById(id);

        if (assignment.getAttachmentPath() == null || assignment.getAttachmentName() == null) {
            throw new BadRequestException("Assignment has no attached file");
        }

        Path filePath = Paths.get(assignment.getAttachmentPath());
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found for assignment id: " + id);
        }

        try {
            byte[] fileContent = Files.readAllBytes(filePath);

            return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + assignment.getAttachmentName() + "\"")
                .header("Content-Type", "application/octet-stream")
                .body(fileContent);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file: " + e.getMessage(), e);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAssignment(@PathVariable Integer id) {
        Assignment assignment = assignmentService.getAssignmentById(id);
        return ResponseEntity.ok(assignment);
    }

    @PostMapping
    public ResponseEntity<?> createAssignment(@RequestBody Map<String, Object> assignmentData) {
        Assignment savedAssignment = assignmentService.createAssignment(assignmentData);

        return ResponseEntity.ok(Map.of(
            "message", "Assignment created successfully",
            "assignment", savedAssignment
        ));
    }

    @PostMapping(value = "/{id}/submit-with-file", consumes = {"multipart/form-data"})
    public ResponseEntity<?> submitAssignmentWithFile(
            @PathVariable Integer id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String content,
            @RequestParam("studentId") String studentIdStr) {
        AssignmentSubmission savedSubmission = assignmentService.submitAssignmentWithFile(id, file, content, studentIdStr);

        return ResponseEntity.ok(Map.of(
            "message", "Assignment submitted successfully with file",
            "submission", savedSubmission
        ));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submitAssignment(@PathVariable Integer id, @RequestBody Map<String, Object> submissionData) {
        AssignmentSubmission savedSubmission = assignmentService.submitAssignment(id, submissionData);

        return ResponseEntity.ok(Map.of(
            "message", "Assignment submitted successfully",
            "submission", savedSubmission
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAssignment(@PathVariable Integer id, @RequestBody Map<String, Object> assignmentData) {
        Assignment updatedAssignment = assignmentService.updateAssignment(id, assignmentData);

        return ResponseEntity.ok(Map.of(
            "message", "Assignment updated successfully",
            "assignment", updatedAssignment
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Integer id) {
        Assignment assignment = assignmentService.getAssignmentById(id);
        assignmentService.deleteAssignment(id);

        log.info("Assignment deleted: {} (ID: {})", assignment.getTitle(), assignment.getId());

        return ResponseEntity.ok(Map.of("message", "Assignment deleted successfully"));
    }

    @GetMapping("/{id}/submissions")
    public ResponseEntity<?> getAssignmentSubmissions(@PathVariable Integer id) {
        List<AssignmentSubmission> submissions = assignmentService.getSubmissionsByAssignment(id);
        return ResponseEntity.ok(Map.of("submissions", submissions));
    }

    @GetMapping("/submissions/{submissionId}/download")
    public ResponseEntity<?> downloadSubmissionFile(@PathVariable Integer submissionId) {
        AssignmentSubmission submission = assignmentService.getSubmissionById(submissionId);

        if (submission.getAttachmentPath() == null || submission.getAttachmentName() == null) {
            throw new BadRequestException("Submission has no attached file");
        }

        Path filePath = Paths.get(submission.getAttachmentPath());
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found for submission id: " + submissionId);
        }

        try {
            byte[] fileContent = Files.readAllBytes(filePath);

            return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + submission.getAttachmentName() + "\"")
                .header("Content-Type", "application/octet-stream")
                .body(fileContent);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file: " + e.getMessage(), e);
        }
    }

    @PutMapping("/submissions/{submissionId}/grade")
    public ResponseEntity<?> gradeSubmission(@PathVariable Integer submissionId, @RequestBody Map<String, Object> gradeData) {
        AssignmentSubmission savedSubmission = assignmentService.gradeSubmission(submissionId, gradeData);

        return ResponseEntity.ok(Map.of(
            "message", "Assignment submission graded successfully",
            "submission", savedSubmission
        ));
    }
}
