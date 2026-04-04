package com.example.schoolmanagement.dto.ai;

public class ClassAiInsightRequest {
    private Integer classId;
    /** số ngày gần đây để phân tích hiện tại (default 30) */
    private Integer currentWindowDays;
    /** số ngày liền trước để so sánh (default 30) */
    private Integer previousWindowDays;

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
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

