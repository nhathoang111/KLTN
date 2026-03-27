package com.example.schoolmanagement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
public class Announcement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "school_id")
    private School school;

    @ManyToOne
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /**
     * Người nhận (optional). Nếu null: thông báo chung theo trường/lớp.
     * Nếu có: chỉ user này (ví dụ giáo viên/phụ huynh) nên nhận thông báo AI.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recipient_user_id")
    private User recipientUser;

    private String title;
    private String content;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public ClassEntity getClassEntity() { return classEntity; }
    public void setClassEntity(ClassEntity classEntity) { this.classEntity = classEntity; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public User getRecipientUser() { return recipientUser; }
    public void setRecipientUser(User recipientUser) { this.recipientUser = recipientUser; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}