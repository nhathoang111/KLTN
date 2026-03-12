package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Assignment;
import com.example.schoolmanagement.entity.AssignmentSubmission;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.AssignmentRepository;
import com.example.schoolmanagement.repository.AssignmentSubmissionRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class AssignmentService {

    private static final Logger log = LoggerFactory.getLogger(AssignmentService.class);
    private static final String ASSIGNMENT_UPLOAD_DIR = "uploads/assignments/";
    private static final String SUBMISSION_UPLOAD_DIR = "uploads/submissions/";

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ClassRepository classRepository;

    public List<Assignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    public Assignment getAssignmentById(Integer id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id: " + id));
    }

    public List<Assignment> getAssignmentsByClass(Integer classId) {
        return assignmentRepository.findByClassEntityId(classId);
    }

    public List<Assignment> getAssignmentsByTeacher(Integer teacherId) {
        return assignmentRepository.findByCreatedById(teacherId);
    }

    public Assignment saveAssignment(Assignment assignment) {
        return assignmentRepository.save(assignment);
    }

    public void deleteAssignment(Integer id) {
        assignmentRepository.deleteById(id);
    }

    public List<AssignmentSubmission> getSubmissionsByAssignment(Integer assignmentId) {
        return assignmentSubmissionRepository.findByAssignmentId(assignmentId);
    }

    public List<AssignmentSubmission> getSubmissionsByStudent(Integer studentId) {
        return assignmentSubmissionRepository.findByStudentId(studentId);
    }

    public AssignmentSubmission saveSubmission(AssignmentSubmission submission) {
        return assignmentSubmissionRepository.save(submission);
    }

    public AssignmentSubmission getSubmissionById(Integer id) {
        return assignmentSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment submission not found with id: " + id));
    }

    public Assignment createAssignmentWithFile(
            MultipartFile file,
            String title,
            String description,
            String instructions,
            String maxScoreStr,
            String dueDate,
            String status,
            String schoolId,
            String classId,
            String subjectId,
            String createdByIdStr) {

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new BadRequestException("Invalid filename");
        }

        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        if (!fileExtension.equals(".doc") && !fileExtension.equals(".docx")) {
            throw new BadRequestException("Only Word documents (.doc, .docx) are allowed");
        }

        try {
            Path uploadPath = Paths.get(ASSIGNMENT_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);

            Files.copy(file.getInputStream(), filePath);

            Double maxScore = Double.parseDouble(maxScoreStr);
            Integer createdById = Integer.parseInt(createdByIdStr);

            Assignment assignment = new Assignment();
            assignment.setTitle(title);
            assignment.setDescription(description);
            assignment.setInstructions(instructions);
            assignment.setMaxScore(maxScore);
            assignment.setStatus(status != null && !status.isEmpty() ? status : "ACTIVE");
            assignment.setCreatedAt(LocalDateTime.now());
            assignment.setUpdatedAt(LocalDateTime.now());

            assignment.setAttachmentPath(filePath.toString());
            assignment.setAttachmentName(originalFilename);
            assignment.setAttachmentSize(file.getSize());

            if (dueDate != null && !dueDate.trim().isEmpty()) {
                assignment.setDueDate(LocalDateTime.parse(dueDate));
            }

            if (schoolId != null && !schoolId.isEmpty()) {
                Integer parsedSchoolId = Integer.parseInt(schoolId);
                School school = schoolRepository.findById(parsedSchoolId)
                        .orElseThrow(() -> new BadRequestException("Invalid school ID"));
                assignment.setSchool(school);
            }

            if (classId != null && !classId.isEmpty()) {
                Integer parsedClassId = Integer.parseInt(classId);
                ClassEntity classEntity = classRepository.findById(parsedClassId)
                        .orElseThrow(() -> new BadRequestException("Invalid class ID"));
                assignment.setClassEntity(classEntity);
            }

            if (subjectId != null && !subjectId.isEmpty()) {
                Integer parsedSubjectId = Integer.parseInt(subjectId);
                Subject subject = subjectRepository.findById(parsedSubjectId)
                        .orElseThrow(() -> new BadRequestException("Invalid subject ID"));
                assignment.setSubject(subject);
            }

            User createdBy = userRepository.findById(createdById)
                    .orElseThrow(() -> new BadRequestException("Invalid created by ID"));
            assignment.setCreatedBy(createdBy);

            return assignmentRepository.save(assignment);
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    public Assignment createAssignment(Map<String, Object> assignmentData) {
        Assignment assignment = new Assignment();

        assignment.setTitle((String) assignmentData.get("title"));
        assignment.setDescription((String) assignmentData.get("description"));
        assignment.setInstructions((String) assignmentData.get("instructions"));
        assignment.setMaxScore(((Number) assignmentData.get("maxScore")).doubleValue());
        assignment.setStatus((String) assignmentData.getOrDefault("status", "ACTIVE"));
        assignment.setCreatedAt(LocalDateTime.now());
        assignment.setUpdatedAt(LocalDateTime.now());

        if (assignmentData.get("dueDate") != null) {
            String dueDateStr = (String) assignmentData.get("dueDate");
            if (dueDateStr != null && !dueDateStr.trim().isEmpty()) {
                assignment.setDueDate(LocalDateTime.parse(dueDateStr));
            }
        }

        Integer schoolId = (Integer) assignmentData.get("schoolId");
        if (schoolId != null) {
            School school = schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID"));
            assignment.setSchool(school);
        }

        Integer classId = (Integer) assignmentData.get("classId");
        if (classId != null) {
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID"));
            assignment.setClassEntity(classEntity);
        }

        Integer subjectId = (Integer) assignmentData.get("subjectId");
        if (subjectId != null) {
            Subject subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new BadRequestException("Invalid subject ID"));
            assignment.setSubject(subject);
        }

        Integer createdById = (Integer) assignmentData.get("createdById");
        if (createdById != null) {
            User createdBy = userRepository.findById(createdById)
                    .orElseThrow(() -> new BadRequestException("Invalid created by ID"));
            assignment.setCreatedBy(createdBy);
        }

        if (assignmentData.get("attachmentPath") != null) {
            assignment.setAttachmentPath((String) assignmentData.get("attachmentPath"));
        }
        if (assignmentData.get("attachmentName") != null) {
            assignment.setAttachmentName((String) assignmentData.get("attachmentName"));
        }
        if (assignmentData.get("attachmentSize") != null) {
            assignment.setAttachmentSize(((Number) assignmentData.get("attachmentSize")).longValue());
        }

        Assignment savedAssignment = assignmentRepository.save(assignment);
        log.info("Assignment created: " + savedAssignment.getTitle() + " (ID: " + savedAssignment.getId() + ")");
        return savedAssignment;
    }

    public AssignmentSubmission submitAssignmentWithFile(
            Integer assignmentId,
            MultipartFile file,
            String content,
            String studentIdStr) {

        Assignment assignment = getAssignmentById(assignmentId);

        if (!"ACTIVE".equals(assignment.getStatus())) {
            throw new BadRequestException(
                assignment.getStatus() != null && assignment.getStatus().equals("INACTIVE") 
                    ? "Bài tập này không còn hoạt động. Bạn không thể nộp bài." 
                    : "Bài tập này đã đóng. Bạn không thể nộp bài."
            );
        }

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new BadRequestException("Invalid filename");
        }

        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        if (!fileExtension.equals(".doc") && !fileExtension.equals(".docx")) {
            throw new BadRequestException("Only Word documents (.doc, .docx) are allowed");
        }

        try {
            Path uploadPath = Paths.get(SUBMISSION_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);

            Files.copy(file.getInputStream(), filePath);

            Integer studentId = Integer.parseInt(studentIdStr);

            AssignmentSubmission submission = new AssignmentSubmission();
            submission.setAssignment(assignment);
            submission.setContent(content);
            submission.setSubmittedAt(LocalDateTime.now());
            submission.setStatus("SUBMITTED");

            submission.setAttachmentPath(filePath.toString());
            submission.setAttachmentName(originalFilename);
            submission.setAttachmentSize(file.getSize());

            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new BadRequestException("Invalid student ID"));
            submission.setStudent(student);

            submission.setSchool(assignment.getSchool());
            submission.setSimilarityScore(Math.random() * 100);

            AssignmentSubmission savedSubmission = assignmentSubmissionRepository.save(submission);
            log.info("Assignment submitted with file: " + savedSubmission.getId() + " for assignment " + assignment.getTitle());
            return savedSubmission;
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    public AssignmentSubmission submitAssignment(Integer assignmentId, Map<String, Object> submissionData) {
        Assignment assignment = getAssignmentById(assignmentId);

        if (!"ACTIVE".equals(assignment.getStatus())) {
            throw new BadRequestException(
                assignment.getStatus() != null && assignment.getStatus().equals("INACTIVE") 
                    ? "Bài tập này không còn hoạt động. Bạn không thể nộp bài." 
                    : "Bài tập này đã đóng. Bạn không thể nộp bài."
            );
        }

        AssignmentSubmission submission = new AssignmentSubmission();
        submission.setAssignment(assignment);
        submission.setContent((String) submissionData.get("content"));
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus("SUBMITTED");

        Integer studentId = (Integer) submissionData.get("studentId");
        if (studentId != null) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new BadRequestException("Invalid student ID"));
            submission.setStudent(student);
        }

        submission.setSchool(assignment.getSchool());
        submission.setSimilarityScore(Math.random() * 100);

        AssignmentSubmission savedSubmission = assignmentSubmissionRepository.save(submission);
        log.info("Assignment submitted: " + savedSubmission.getId() + " for assignment " + assignment.getTitle());
        return savedSubmission;
    }

    public Assignment updateAssignment(Integer id, Map<String, Object> assignmentData) {
        Assignment existingAssignment = getAssignmentById(id);

        if (assignmentData.get("title") != null) {
            existingAssignment.setTitle((String) assignmentData.get("title"));
        }

        if (assignmentData.get("description") != null) {
            existingAssignment.setDescription((String) assignmentData.get("description"));
        }

        if (assignmentData.get("instructions") != null) {
            existingAssignment.setInstructions((String) assignmentData.get("instructions"));
        }

        if (assignmentData.get("maxScore") != null) {
            existingAssignment.setMaxScore(((Number) assignmentData.get("maxScore")).doubleValue());
        }

        if (assignmentData.get("status") != null) {
            existingAssignment.setStatus((String) assignmentData.get("status"));
        }

        if (assignmentData.get("dueDate") != null) {
            String dueDateStr = (String) assignmentData.get("dueDate");
            if (dueDateStr != null && !dueDateStr.trim().isEmpty()) {
                existingAssignment.setDueDate(LocalDateTime.parse(dueDateStr));
            }
        }

        if (assignmentData.get("schoolId") != null) {
            Integer schoolId = (Integer) assignmentData.get("schoolId");
            School school = schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID"));
            existingAssignment.setSchool(school);
        }

        if (assignmentData.get("classId") != null) {
            Integer classId = (Integer) assignmentData.get("classId");
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID"));
            existingAssignment.setClassEntity(classEntity);
        }

        if (assignmentData.get("subjectId") != null) {
            Integer subjectId = (Integer) assignmentData.get("subjectId");
            Subject subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new BadRequestException("Invalid subject ID"));
            existingAssignment.setSubject(subject);
        }

        if (assignmentData.get("createdById") != null) {
            Integer createdById = (Integer) assignmentData.get("createdById");
            User createdBy = userRepository.findById(createdById)
                    .orElseThrow(() -> new BadRequestException("Invalid created by ID"));
            existingAssignment.setCreatedBy(createdBy);
        }

        existingAssignment.setUpdatedAt(LocalDateTime.now());

        Assignment updatedAssignment = assignmentRepository.save(existingAssignment);
        log.info("Assignment updated: " + updatedAssignment.getTitle() + " (ID: " + updatedAssignment.getId() + ")");
        return updatedAssignment;
    }

    public AssignmentSubmission gradeSubmission(Integer submissionId, Map<String, Object> gradeData) {
        AssignmentSubmission submission = getSubmissionById(submissionId);

        if (gradeData.get("score") != null) {
            Double score = ((Number) gradeData.get("score")).doubleValue();
            submission.setScore(score);
        }

        if (gradeData.get("feedback") != null) {
            submission.setFeedback((String) gradeData.get("feedback"));
        }

        Integer gradedById = (Integer) gradeData.get("gradedById");
        if (gradedById != null) {
            User gradedBy = userRepository.findById(gradedById)
                    .orElseThrow(() -> new BadRequestException("Invalid graded by ID"));
            submission.setGradedBy(gradedBy);
        }

        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");

        AssignmentSubmission savedSubmission = assignmentSubmissionRepository.save(submission);
        log.info("Assignment submission graded: " + savedSubmission.getId() + " with score " + savedSubmission.getScore());
        return savedSubmission;
    }
}
