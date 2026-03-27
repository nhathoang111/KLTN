package com.example.schoolmanagement.dto.ai;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class GradeAnalysisResponse {
    // New standardized fields
    private String summary;
    private List<String> underAverageSubjects = new ArrayList<>();
    private String trend;
    private List<String> recommendations = new ArrayList<>();
    private String riskLevel; // LOW | MEDIUM | HIGH | CRITICAL
    private Metadata metadata;

    // Legacy field for backward compatibility
    private String analysis;
    private Integer promptTokens;
    private Integer responseTokens;
    private Integer totalTokens;

    public GradeAnalysisResponse() {
    }

    public GradeAnalysisResponse(String analysis, Integer promptTokens, Integer responseTokens, Integer totalTokens) {
        this.analysis = analysis;
        this.promptTokens = promptTokens;
        this.responseTokens = responseTokens;
        this.totalTokens = totalTokens;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getUnderAverageSubjects() {
        return underAverageSubjects;
    }

    public void setUnderAverageSubjects(List<String> underAverageSubjects) {
        this.underAverageSubjects = underAverageSubjects;
    }

    public String getTrend() {
        return trend;
    }

    public void setTrend(String trend) {
        this.trend = trend;
    }

    public List<String> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<String> recommendations) {
        this.recommendations = recommendations;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public Metadata getMetadata() {
        return metadata;
    }

    public void setMetadata(Metadata metadata) {
        this.metadata = metadata;
    }

    public String getAnalysis() {
        return analysis;
    }

    public void setAnalysis(String analysis) {
        this.analysis = analysis;
    }

    public Integer getPromptTokens() {
        return promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public Integer getResponseTokens() {
        return responseTokens;
    }

    public void setResponseTokens(Integer responseTokens) {
        this.responseTokens = responseTokens;
    }

    public Integer getTotalTokens() {
        return totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }

    public static class Metadata {
        private Integer totalStudents;
        private Integer weakStudentCount;
        private LocalDateTime generatedAt;

        public Integer getTotalStudents() {
            return totalStudents;
        }

        public void setTotalStudents(Integer totalStudents) {
            this.totalStudents = totalStudents;
        }

        public Integer getWeakStudentCount() {
            return weakStudentCount;
        }

        public void setWeakStudentCount(Integer weakStudentCount) {
            this.weakStudentCount = weakStudentCount;
        }

        public LocalDateTime getGeneratedAt() {
            return generatedAt;
        }

        public void setGeneratedAt(LocalDateTime generatedAt) {
            this.generatedAt = generatedAt;
        }
    }
}

