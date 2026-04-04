package com.example.schoolmanagement.dto.attendance;

import java.util.List;

public class AttendanceBulkRequest {
    private Integer classSectionId;
    private String attendanceDate; // YYYY-MM-DD
    private List<AttendanceBulkRequestItem> items;

    public Integer getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Integer classSectionId) { this.classSectionId = classSectionId; }

    public String getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(String attendanceDate) { this.attendanceDate = attendanceDate; }

    public List<AttendanceBulkRequestItem> getItems() { return items; }
    public void setItems(List<AttendanceBulkRequestItem> items) { this.items = items; }

    public static class AttendanceBulkRequestItem {
        private Integer studentId;
        private String status;
        private String note;

        public Integer getStudentId() { return studentId; }
        public void setStudentId(Integer studentId) { this.studentId = studentId; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}

