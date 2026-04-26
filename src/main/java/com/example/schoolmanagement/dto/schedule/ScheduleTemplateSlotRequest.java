package com.example.schoolmanagement.dto.schedule;

import java.time.LocalDate;

public class ScheduleTemplateSlotRequest {
    private LocalDate date;
    private Integer dayOfWeek;
    private Integer period;
    private Integer subjectId;
    private Integer teacherId;
    private Integer classSectionId;
    private String room;
    private String fixedActivityCode;

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Integer getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(Integer dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public Integer getPeriod() {
        return period;
    }

    public void setPeriod(Integer period) {
        this.period = period;
    }

    public Integer getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(Integer subjectId) {
        this.subjectId = subjectId;
    }

    public Integer getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Integer teacherId) {
        this.teacherId = teacherId;
    }

    public Integer getClassSectionId() {
        return classSectionId;
    }

    public void setClassSectionId(Integer classSectionId) {
        this.classSectionId = classSectionId;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getFixedActivityCode() {
        return fixedActivityCode;
    }

    public void setFixedActivityCode(String fixedActivityCode) {
        this.fixedActivityCode = fixedActivityCode;
    }
}
