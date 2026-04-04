package com.example.schoolmanagement.entity;

import jakarta.persistence.*;

/**
 * Liên kết giáo viên – môn học (n-n).
 * Một giáo viên có thể dạy nhiều môn.
 */
@Entity
@Table(name = "teacher_subjects", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "user_id", "subject_id" })
})
public class TeacherSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }
}
