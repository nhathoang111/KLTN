package com.example.schoolmanagement.dto.examscore;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Safe response model for GET /api/exam-scores.
 * Avoids exposing JPA entity graph/lazy proxies directly.
 */
public class ExamScoreListItemDto {
    private Integer id;
    private Double score;
    private String scoreType;
    private Integer attempt;
    private String note;
    private String status;

    @JsonProperty("student_id")
    private Integer studentId;

    @JsonProperty("subject_id")
    private Integer subjectId;

    @JsonProperty("class_id")
    private Integer classId;

    private StudentRef student;
    private SubjectRef subject;
    private ClassRef classEntity;
    private SchoolRef school;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

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

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public Integer getSubjectId() { return subjectId; }
    public void setSubjectId(Integer subjectId) { this.subjectId = subjectId; }

    public Integer getClassId() { return classId; }
    public void setClassId(Integer classId) { this.classId = classId; }

    public StudentRef getStudent() { return student; }
    public void setStudent(StudentRef student) { this.student = student; }

    public SubjectRef getSubject() { return subject; }
    public void setSubject(SubjectRef subject) { this.subject = subject; }

    public ClassRef getClassEntity() { return classEntity; }
    public void setClassEntity(ClassRef classEntity) { this.classEntity = classEntity; }

    public SchoolRef getSchool() { return school; }
    public void setSchool(SchoolRef school) { this.school = school; }

    public static class StudentRef {
        private Integer id;
        private String fullName;
        private String email;
        private SchoolRef school;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public SchoolRef getSchool() { return school; }
        public void setSchool(SchoolRef school) { this.school = school; }
    }

    public static class SubjectRef {
        private Integer id;
        private String name;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    public static class ClassRef {
        private Integer id;
        private String name;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    public static class SchoolRef {
        private Integer id;
        private String name;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
}
