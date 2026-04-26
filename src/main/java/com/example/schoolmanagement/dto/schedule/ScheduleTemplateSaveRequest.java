package com.example.schoolmanagement.dto.schedule;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ScheduleTemplateSaveRequest {
    private Integer classId;
    private LocalDate weekStart;
    private List<ScheduleTemplateSlotRequest> slots = new ArrayList<>();

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(LocalDate weekStart) {
        this.weekStart = weekStart;
    }

    public List<ScheduleTemplateSlotRequest> getSlots() {
        return slots;
    }

    public void setSlots(List<ScheduleTemplateSlotRequest> slots) {
        this.slots = slots != null ? slots : new ArrayList<>();
    }
}
