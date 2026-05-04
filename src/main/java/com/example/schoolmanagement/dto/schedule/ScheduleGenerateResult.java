package com.example.schoolmanagement.dto.schedule;

import java.util.ArrayList;
import java.util.List;

/**
 * Kết quả tạo TKB tự động ({@code POST /api/schedules/generate}).
 */
public class ScheduleGenerateResult {

    private boolean success;
    private String message;
    /** Tổng tiết/tuần yêu cầu (sum of periodsPerWeek). */
    private int requestedPeriods;
    /** Tổng số tiết đã lưu trong lần gọi này (khi success). */
    private int assignedPeriods;
    /** Số ô trống tối đa trong tuần đầu (theo buổi), sau khi trừ lịch lớp đã có. */
    private int weeklyCapacity;
    private List<UnmetAssignment> unmetAssignments = new ArrayList<>();
    /** Danh sách slot mẫu sinh tự động để FE đổ vào thời khóa biểu mẫu. */
    private List<TemplateSlot> templateSlots = new ArrayList<>();

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

    public int getRequestedPeriods() {
        return requestedPeriods;
    }

    public void setRequestedPeriods(int requestedPeriods) {
        this.requestedPeriods = requestedPeriods;
    }

    public int getAssignedPeriods() {
        return assignedPeriods;
    }

    public void setAssignedPeriods(int assignedPeriods) {
        this.assignedPeriods = assignedPeriods;
    }

    public int getWeeklyCapacity() {
        return weeklyCapacity;
    }

    public void setWeeklyCapacity(int weeklyCapacity) {
        this.weeklyCapacity = weeklyCapacity;
    }

    public List<UnmetAssignment> getUnmetAssignments() {
        return unmetAssignments;
    }

    public void setUnmetAssignments(List<UnmetAssignment> unmetAssignments) {
        this.unmetAssignments = unmetAssignments != null ? unmetAssignments : new ArrayList<>();
    }

    public List<TemplateSlot> getTemplateSlots() {
        return templateSlots;
    }

    public void setTemplateSlots(List<TemplateSlot> templateSlots) {
        this.templateSlots = templateSlots != null ? templateSlots : new ArrayList<>();
    }

    public static class UnmetAssignment {
        private int lineIndex;
        private Integer subjectId;
        private String subjectName;
        private Integer teacherId;
        private String teacherName;
        private int requiredPeriods;
        private int assignedPeriods;

        public int getLineIndex() {
            return lineIndex;
        }

        public void setLineIndex(int lineIndex) {
            this.lineIndex = lineIndex;
        }

        public Integer getSubjectId() {
            return subjectId;
        }

        public void setSubjectId(Integer subjectId) {
            this.subjectId = subjectId;
        }

        public String getSubjectName() {
            return subjectName;
        }

        public void setSubjectName(String subjectName) {
            this.subjectName = subjectName;
        }

        public Integer getTeacherId() {
            return teacherId;
        }

        public void setTeacherId(Integer teacherId) {
            this.teacherId = teacherId;
        }

        public String getTeacherName() {
            return teacherName;
        }

        public void setTeacherName(String teacherName) {
            this.teacherName = teacherName;
        }

        public int getRequiredPeriods() {
            return requiredPeriods;
        }

        public void setRequiredPeriods(int requiredPeriods) {
            this.requiredPeriods = requiredPeriods;
        }

        public int getAssignedPeriods() {
            return assignedPeriods;
        }

        public void setAssignedPeriods(int assignedPeriods) {
            this.assignedPeriods = assignedPeriods;
        }
    }

    public static class TemplateSlot {
        private Integer dayOfWeek;
        private Integer period;
        private String date;
        private Integer subjectId;
        private String subjectName;
        private Integer teacherId;
        private String teacherName;
        private String room;
        private String fixedActivityCode;

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

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public Integer getSubjectId() {
            return subjectId;
        }

        public void setSubjectId(Integer subjectId) {
            this.subjectId = subjectId;
        }

        public String getSubjectName() {
            return subjectName;
        }

        public void setSubjectName(String subjectName) {
            this.subjectName = subjectName;
        }

        public Integer getTeacherId() {
            return teacherId;
        }

        public void setTeacherId(Integer teacherId) {
            this.teacherId = teacherId;
        }

        public String getTeacherName() {
            return teacherName;
        }

        public void setTeacherName(String teacherName) {
            this.teacherName = teacherName;
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
}
