package com.example.schoolmanagement.dto.ai;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class GradeAnalysisResponse {
    // New standardized fields
    private String summary;
    private List<String> underAverageSubjects = new ArrayList<>();
    private String trend;
    /**
     * Management-oriented severity aligned with backend riskLevel.
     * LOW | MEDIUM | HIGH | CRITICAL
     */
    private String severity;
    /** 2-3 short key concerns for admins/teachers. */
    private List<String> topConcerns = new ArrayList<>();
    /** 1-3 priority subjects to focus on. */
    private List<String> prioritySubjects = new ArrayList<>();
    private List<String> recommendations = new ArrayList<>();
    private String riskLevel; // LOW | MEDIUM | HIGH | CRITICAL

    /**
     * Deterministic academic performance classification (backend-owned).
     * YEU | TRUNG_BINH | KHA | GIOI
     */
    private String performanceLevel;

    /**
     * Execution source for this response:
     * - GEMINI: Gemini call + parse succeeded
     * - LOCAL_FALLBACK: local fallback generated due to Gemini/runtime/parse issues
     */
    private String source;

    /** true when Gemini executed successfully and response was accepted. */
    private Boolean aiSuccess;

    /** Short failure reason when aiSuccess=false. */
    private String aiError;

    private Metadata metadata;

    // Legacy field for backward compatibility.
    // NOTE: This is a derived display text field, not raw Gemini output.
    // The primary AI contract is the structured JSON fields: summary/trend/recommendations.
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

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public List<String> getTopConcerns() {
        return topConcerns;
    }

    public void setTopConcerns(List<String> topConcerns) {
        this.topConcerns = topConcerns;
    }

    public List<String> getPrioritySubjects() {
        return prioritySubjects;
    }

    public void setPrioritySubjects(List<String> prioritySubjects) {
        this.prioritySubjects = prioritySubjects;
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

    public String getPerformanceLevel() {
        return performanceLevel;
    }

    public void setPerformanceLevel(String performanceLevel) {
        this.performanceLevel = performanceLevel;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Boolean getAiSuccess() {
        return aiSuccess;
    }

    public void setAiSuccess(Boolean aiSuccess) {
        this.aiSuccess = aiSuccess;
    }

    public String getAiError() {
        return aiError;
    }

    public void setAiError(String aiError) {
        this.aiError = aiError;
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

