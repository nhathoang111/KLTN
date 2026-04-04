package com.example.schoolmanagement.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_scores", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "student_id", "subject_id", "class_id", "score_type", "attempt" })
})
public class ExamScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    @ManyToOne
    @JoinColumn(name = "class_section_id")
    private ClassSection classSection;

    @ManyToOne
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    /** Điểm từ 0 đến 10 (theo ExamScoreConstants; validate ở service) */
    @Column(nullable = false)
    private Double score;

    /** Loại điểm: 15P, 1TIET, CUOIKI (theo ExamScoreConstants) */
    @Column(name = "score_type", length = 20)
    private String scoreType = "15P";

    /** Lần thi/lần nhập điểm (1, 2, ...) */
    @Column(name = "attempt")
    private Integer attempt = 1;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ExamScore() {
    }

    public ExamScore(Integer id, User student, Subject subject, ClassEntity classEntity, School school,
                     Double score, String scoreType, String note, String status,
                     LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.student = student;
        this.subject = subject;
        this.classEntity = classEntity;
        this.school = school;
        this.score = score;
        this.scoreType = scoreType;
        this.note = note;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public ClassEntity getClassEntity() { return classEntity; }
    public void setClassEntity(ClassEntity classEntity) { this.classEntity = classEntity; }

    public ClassSection getClassSection() { return classSection; }
    public void setClassSection(ClassSection classSection) { this.classSection = classSection; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getScoreType() { return scoreType; }
    public void setScoreType(String scoreType) { this.scoreType = scoreType; }

    public Integer getAttempt() { return attempt; }
    public void setAttempt(Integer attempt) { this.attempt = attempt; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
