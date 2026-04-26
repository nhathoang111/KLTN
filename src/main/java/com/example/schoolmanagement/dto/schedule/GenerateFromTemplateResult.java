package com.example.schoolmanagement.dto.schedule;

public class GenerateFromTemplateResult {
    private boolean success;
    private String message;
    private int deletedCount;
    private int createdCount;
    private int skippedPastDateCount;

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getDeletedCount() {
        return deletedCount;
    }

    public void setDeletedCount(int deletedCount) {
        this.deletedCount = deletedCount;
    }

    public int getCreatedCount() {
        return createdCount;
    }

    public void setCreatedCount(int createdCount) {
        this.createdCount = createdCount;
    }

    public int getSkippedPastDateCount() {
        return skippedPastDateCount;
    }

    public void setSkippedPastDateCount(int skippedPastDateCount) {
        this.skippedPastDateCount = skippedPastDateCount;
    }
}
