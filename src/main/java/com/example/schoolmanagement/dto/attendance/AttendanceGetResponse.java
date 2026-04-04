package com.example.schoolmanagement.dto.attendance;

import java.util.List;

public class AttendanceGetResponse {
    private Integer classSectionId;
    private Integer classId;
    private String attendanceDate; // YYYY-MM-DD
    private List<AttendanceItemDto> items;

    public AttendanceGetResponse() {}

    public AttendanceGetResponse(Integer classSectionId, Integer classId, String attendanceDate, List<AttendanceItemDto> items) {
        this.classSectionId = classSectionId;
        this.classId = classId;
        this.attendanceDate = attendanceDate;
        this.items = items;
    }

    public Integer getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Integer classSectionId) { this.classSectionId = classSectionId; }

    public Integer getClassId() { return classId; }
    public void setClassId(Integer classId) { this.classId = classId; }

    public String getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(String attendanceDate) { this.attendanceDate = attendanceDate; }

    public List<AttendanceItemDto> getItems() { return items; }
    public void setItems(List<AttendanceItemDto> items) { this.items = items; }
}

