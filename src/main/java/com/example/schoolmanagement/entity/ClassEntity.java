package com.example.schoolmanagement.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "classes")
public class ClassEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "school_id")
    private School school;

    private String name;
    private Integer gradeLevel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "school_year_id")
    private SchoolYear schoolYear;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "homeroom_teacher_id")
    private User homeroomTeacher;

    private Integer capacity;
    private String status;
    private String room; // Phòng học cố định của lớp

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getGradeLevel() { return gradeLevel; }
    public void setGradeLevel(Integer gradeLevel) { this.gradeLevel = gradeLevel; }

    public SchoolYear getSchoolYear() { return schoolYear; }
    public void setSchoolYear(SchoolYear schoolYear) { this.schoolYear = schoolYear; }

    public User getHomeroomTeacher() { return homeroomTeacher; }
    public void setHomeroomTeacher(User homeroomTeacher) { this.homeroomTeacher = homeroomTeacher; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
}