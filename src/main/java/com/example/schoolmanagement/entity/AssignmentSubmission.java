package com.example.schoolmanagement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_submissions")
public class AssignmentSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    @ManyToOne
    @JoinColumn(name = "school_id")
    private School school;

    private String content;
    private String attachmentPath;
    private String attachmentName;
    private Long attachmentSize;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "score")
    private Double score;

    @Column(name = "feedback")
    private String feedback;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @ManyToOne
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    @Column(name = "similarity_score")
    private Double similarityScore;

    private String status;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAttachmentPath() { return attachmentPath; }
    public void setAttachmentPath(String attachmentPath) { this.attachmentPath = attachmentPath; }

    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }

    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public LocalDateTime getGradedAt() { return gradedAt; }
    public void setGradedAt(LocalDateTime gradedAt) { this.gradedAt = gradedAt; }

    public User getGradedBy() { return gradedBy; }
    public void setGradedBy(User gradedBy) { this.gradedBy = gradedBy; }

    public Double getSimilarityScore() { return similarityScore; }
    public void setSimilarityScore(Double similarityScore) { this.similarityScore = similarityScore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
