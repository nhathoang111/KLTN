package com.example.schoolmanagement.entity;

import jakarta.persistence.*;

/**
 * Liên kết phụ huynh – học sinh (n-n).
 * Một phụ huynh có thể có nhiều con; một học sinh có thể có nhiều phụ huynh.
 */
@Entity
@Table(name = "parent_student", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "parent_id", "student_id" })
})
public class ParentStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", nullable = false)
    private User parent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public User getParent() { return parent; }
    public void setParent(User parent) { this.parent = parent; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }
}
