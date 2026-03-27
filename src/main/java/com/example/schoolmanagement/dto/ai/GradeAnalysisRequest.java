package com.example.schoolmanagement.dto.ai;

import java.util.List;

public class GradeAnalysisRequest {
    private String target; // Lớp hoặc học sinh (tuỳ bạn gửi)
    private Integer classId; // null => global/dashboard scope
    private List<SubjectScore> subjects;

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public Integer getClassId() {
        return classId;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public List<SubjectScore> getSubjects() {
        return subjects;
    }

    public void setSubjects(List<SubjectScore> subjects) {
        this.subjects = subjects;
    }

    public static class SubjectScore {
        private String name;
        private Double score;
        private Double previousScore;
        private Double averageScore;
        private Double previousAverageScore;
        private Integer belowFiveCount;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Double getScore() {
            return score;
        }

        public void setScore(Double score) {
            this.score = score;
        }

        public Double getPreviousScore() {
            return previousScore;
        }

        public void setPreviousScore(Double previousScore) {
            this.previousScore = previousScore;
        }

        public Double getAverageScore() {
            return averageScore;
        }

        public void setAverageScore(Double averageScore) {
            this.averageScore = averageScore;
        }

        public Double getPreviousAverageScore() {
            return previousAverageScore;
        }

        public void setPreviousAverageScore(Double previousAverageScore) {
            this.previousAverageScore = previousAverageScore;
        }

        public Integer getBelowFiveCount() {
            return belowFiveCount;
        }

        public void setBelowFiveCount(Integer belowFiveCount) {
            this.belowFiveCount = belowFiveCount;
        }
    }
}

