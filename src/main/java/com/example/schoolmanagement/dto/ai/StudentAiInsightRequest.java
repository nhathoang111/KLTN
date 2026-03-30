package com.example.schoolmanagement.dto.ai;

public class StudentAiInsightRequest {
    private Integer studentId;
    /** Optional: lọc theo lớp của dòng đang bấm AI (để TEACHER phân tích đúng môn/lớp). */
    private Integer classId;
    /** Optional: lọc theo môn của dòng đang bấm AI. */
    private Integer subjectId;
    /** số ngày gần đây để phân tích hiện tại (default 30) */
    private Integer currentWindowDays;
    /** số ngày liền trước để so sánh (default 30) */
    private Integer previousWindowDays;

    public Integer getStudentId() {
        return studentId;
    }

    public void setStudentId(Integer studentId) {
        this.studentId = studentId;
    }

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public Integer getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(Integer subjectId) {
        this.subjectId = subjectId;
    }

    public Integer getCurrentWindowDays() {
        return currentWindowDays;
    }

    public void setCurrentWindowDays(Integer currentWindowDays) {
        this.currentWindowDays = currentWindowDays;
    }

    public Integer getPreviousWindowDays() {
        return previousWindowDays;
    }

    public void setPreviousWindowDays(Integer previousWindowDays) {
        this.previousWindowDays = previousWindowDays;
    }
}

