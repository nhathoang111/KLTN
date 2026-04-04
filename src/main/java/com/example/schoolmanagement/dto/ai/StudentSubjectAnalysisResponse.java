package com.example.schoolmanagement.dto.ai;

import java.util.ArrayList;
import java.util.List;

public class StudentSubjectAnalysisResponse {
    private String studentName;
    private String className;
    private String subjectName;

    private Double subjectAverage;
    private Double minScore;
    private Double maxScore;
    private Integer scoreCount;
    private Integer belowFiveCount;

    private String subjectPerformanceLevel; // YEU | TRUNG_BINH | KHA | GIOI (backend-owned)
    private String trend; // Tăng | Giảm | Ổn định | Không đủ dữ liệu để xác định xu hướng (backend-owned)

    private String summary; // Gemini-generated (validated) or fallback
    private List<String> topConcerns = new ArrayList<>(); // Gemini-generated or fallback
    private List<String> recommendations = new ArrayList<>(); // Gemini-generated or fallback

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public Double getSubjectAverage() {
        return subjectAverage;
    }

    public void setSubjectAverage(Double subjectAverage) {
        this.subjectAverage = subjectAverage;
    }

    public Double getMinScore() {
        return minScore;
    }

    public void setMinScore(Double minScore) {
        this.minScore = minScore;
    }

    public Double getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore;
    }

    public Integer getScoreCount() {
        return scoreCount;
    }

    public void setScoreCount(Integer scoreCount) {
        this.scoreCount = scoreCount;
    }

    public Integer getBelowFiveCount() {
        return belowFiveCount;
    }

    public void setBelowFiveCount(Integer belowFiveCount) {
        this.belowFiveCount = belowFiveCount;
    }

    public String getSubjectPerformanceLevel() {
        return subjectPerformanceLevel;
    }

    public void setSubjectPerformanceLevel(String subjectPerformanceLevel) {
        this.subjectPerformanceLevel = subjectPerformanceLevel;
    }

    public String getTrend() {
        return trend;
    }

    public void setTrend(String trend) {
        this.trend = trend;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getTopConcerns() {
        return topConcerns;
    }

    public void setTopConcerns(List<String> topConcerns) {
        this.topConcerns = topConcerns;
    }

    public List<String> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<String> recommendations) {
        this.recommendations = recommendations;
    }
}

