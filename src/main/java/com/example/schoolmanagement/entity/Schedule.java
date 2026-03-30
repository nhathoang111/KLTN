package com.example.schoolmanagement.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "schedules",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_schedule_class_date_period",
                        columnNames = { "class_id", "date", "period" }),
                @UniqueConstraint(name = "uk_schedule_teacher_date_period",
                        columnNames = { "teacher_id", "date", "period" })
        })
public class Schedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "school_id")
    private School school;

    @ManyToOne
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    @ManyToOne
    @JoinColumn(name = "class_section_id")
    private ClassSection classSection;

    @ManyToOne
    @JoinColumn(name = "subject_id", nullable = true)
    private Subject subject;

    /**
     * Tiết cố định (không gắn bản ghi subjects): CHAOCO = Chào cờ, SHL = Sinh hoạt lớp.
     */
    @Column(name = "fixed_activity_code", length = 16)
    private String fixedActivityCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id", nullable = true)
    private User teacher;

    @Column(name = "day_of_week")
    private Integer dayOfWeek; // 1 = Monday, 2 = Tuesday, ..., 6 = Saturday

    @Column(name = "date")
    private LocalDate date; // Ngày cụ thể (ưu tiên hơn dayOfWeek)

    private Integer period; // Tiết học: 1–5 buổi sáng, 6–10 buổi chiều (theo FE)
    private String room; // Phòng học

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public ClassEntity getClassEntity() { return classEntity; }
    public void setClassEntity(ClassEntity classEntity) { this.classEntity = classEntity; }

    public ClassSection getClassSection() { return classSection; }
    public void setClassSection(ClassSection classSection) { this.classSection = classSection; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public String getFixedActivityCode() { return fixedActivityCode; }
    public void setFixedActivityCode(String fixedActivityCode) { this.fixedActivityCode = fixedActivityCode; }

    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }

    public Integer getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Integer dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Integer getPeriod() { return period; }
    public void setPeriod(Integer period) { this.period = period; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
}

