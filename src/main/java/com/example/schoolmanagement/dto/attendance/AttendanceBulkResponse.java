package com.example.schoolmanagement.dto.attendance;

import java.util.List;

public class AttendanceBulkResponse {
    private String message;
    private Integer savedCount;
    private List<AttendanceItemDto> items;

    public AttendanceBulkResponse() {}

    public AttendanceBulkResponse(String message, Integer savedCount, List<AttendanceItemDto> items) {
        this.message = message;
        this.savedCount = savedCount;
        this.items = items;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getSavedCount() { return savedCount; }
    public void setSavedCount(Integer savedCount) { this.savedCount = savedCount; }

    public List<AttendanceItemDto> getItems() { return items; }
    public void setItems(List<AttendanceItemDto> items) { this.items = items; }
}

