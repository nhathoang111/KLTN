package com.example.schoolmanagement.util;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.exception.BadRequestException;

/** Rule nghiệp vụ cho phép thao tác dạy học theo trạng thái lớp. */
public final class ClassStatusPolicy {

    private ClassStatusPolicy() {
    }

    public static boolean isTeachingLockedStatus(String status) {
        if (status == null) return false;
        String s = status.trim().toUpperCase();
        return "INACTIVE".equals(s) || "ARCHIVED".equals(s);
    }

    public static void assertTeachActionAllowed(ClassEntity classEntity, String actionName) {
        if (classEntity == null) {
            throw new BadRequestException("Lớp không tồn tại.");
        }
        if (!isTeachingLockedStatus(classEntity.getStatus())) {
            return;
        }
        String status = classEntity.getStatus() == null ? "UNKNOWN" : classEntity.getStatus().trim().toUpperCase();
        String classLabel = classEntity.getName() == null || classEntity.getName().isBlank()
                ? ("id=" + classEntity.getId())
                : classEntity.getName();
        throw new BadRequestException(
                "Không thể " + actionName + " vì lớp \"" + classLabel + "\" đang ở trạng thái " + status + ".");
    }
}
