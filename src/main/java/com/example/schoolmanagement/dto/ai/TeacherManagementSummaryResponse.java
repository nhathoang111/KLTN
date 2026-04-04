package com.example.schoolmanagement.dto.ai;

import java.util.ArrayList;
import java.util.List;

/**
 * Tổng quan quản lý học tập cho giáo viên trên dashboard (không phải phân tích một học sinh / một môn đơn lẻ).
 */
public class TeacherManagementSummaryResponse {

    /** Tóm tắt cuối cùng (Gemini + chuẩn hóa backend), giọng quản lý lớp / theo dõi học sinh. */
    private String summary;

    /** Mức độ cần chú ý trong quản lý: LOW | MEDIUM | HIGH — do backend quyết định. */
    private String managementLevel;

    private int classesAnalyzedCount;
    private int studentsAnalyzedCount;
    private int studentsNeedAttentionCount;

    /** Môn có nhiều học sinh cần theo dõi nhất (theo đếm backend). */
    private List<String> keyRiskSubjects = new ArrayList<>();

    /** Lớp có nhiều học sinh cần theo dõi nhất (chuỗi hiển thị, vd. "10/1 — 6 học sinh"). */
    private List<String> keyConcernClasses = new ArrayList<>();

    private List<String> topConcerns = new ArrayList<>();
    private List<String> recommendations = new ArrayList<>();

    private String source;
    private Boolean aiSuccess;
    private String aiError;

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getManagementLevel() {
        return managementLevel;
    }

    public void setManagementLevel(String managementLevel) {
        this.managementLevel = managementLevel;
    }

    public int getClassesAnalyzedCount() {
        return classesAnalyzedCount;
    }

    public void setClassesAnalyzedCount(int classesAnalyzedCount) {
        this.classesAnalyzedCount = classesAnalyzedCount;
    }

    public int getStudentsAnalyzedCount() {
        return studentsAnalyzedCount;
    }

    public void setStudentsAnalyzedCount(int studentsAnalyzedCount) {
        this.studentsAnalyzedCount = studentsAnalyzedCount;
    }

    public int getStudentsNeedAttentionCount() {
        return studentsNeedAttentionCount;
    }

    public void setStudentsNeedAttentionCount(int studentsNeedAttentionCount) {
        this.studentsNeedAttentionCount = studentsNeedAttentionCount;
    }

    public List<String> getKeyRiskSubjects() {
        return keyRiskSubjects;
    }

    public void setKeyRiskSubjects(List<String> keyRiskSubjects) {
        this.keyRiskSubjects = keyRiskSubjects;
    }

    public List<String> getKeyConcernClasses() {
        return keyConcernClasses;
    }

    public void setKeyConcernClasses(List<String> keyConcernClasses) {
        this.keyConcernClasses = keyConcernClasses;
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
}
