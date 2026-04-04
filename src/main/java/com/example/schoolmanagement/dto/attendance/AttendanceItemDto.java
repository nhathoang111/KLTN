package com.example.schoolmanagement.dto.attendance;

public class AttendanceItemDto {
    private Integer attendanceId;
    private Integer classSectionId;
    private Integer studentId;
    private String fullName;
    private String email;
    private String status;
    private String note;

    public AttendanceItemDto() {}

    public AttendanceItemDto(Integer attendanceId, Integer classSectionId, Integer studentId, String fullName, String email, String status, String note) {
        this.attendanceId = attendanceId;
        this.classSectionId = classSectionId;
        this.studentId = studentId;
        this.fullName = fullName;
        this.email = email;
        this.status = status;
        this.note = note;
    }

    public Integer getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Integer attendanceId) { this.attendanceId = attendanceId; }

    public Integer getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Integer classSectionId) { this.classSectionId = classSectionId; }

    public Integer getStudentId() { return studentId; }
    public void setStudentId(Integer studentId) { this.studentId = studentId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
