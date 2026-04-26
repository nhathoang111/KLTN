package com.example.schoolmanagement.dto.schedule;

import java.time.LocalDate;

public class GenerateFromTemplateRequest {
    private Integer classId;
    private LocalDate weekStartTemplate;
    private LocalDate semesterStart;
    private LocalDate semesterEnd;

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public LocalDate getWeekStartTemplate() {
        return weekStartTemplate;
    }

    public void setWeekStartTemplate(LocalDate weekStartTemplate) {
        this.weekStartTemplate = weekStartTemplate;
    }

    public LocalDate getSemesterStart() {
        return semesterStart;
    }

    public void setSemesterStart(LocalDate semesterStart) {
        this.semesterStart = semesterStart;
    }

    public LocalDate getSemesterEnd() {
        return semesterEnd;
    }

    public void setSemesterEnd(LocalDate semesterEnd) {
        this.semesterEnd = semesterEnd;
    }
}
