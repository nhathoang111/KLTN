package com.example.schoolmanagement.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "class_sections", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "class_room_id", "subject_id", "semester", "school_year" })
})
public class ClassSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_room_id", nullable = false)
    private ClassEntity classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(length = 50)
    private String semester;

    @Column(name = "school_year", length = 50)
    private String schoolYear;

    @Column(length = 50)
    private String status;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public ClassEntity getClassRoom() { return classRoom; }
    public void setClassRoom(ClassEntity classRoom) { this.classRoom = classRoom; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getSchoolYear() { return schoolYear; }
    public void setSchoolYear(String schoolYear) { this.schoolYear = schoolYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
