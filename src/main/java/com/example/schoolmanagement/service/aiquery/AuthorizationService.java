package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.ParentStudentRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class AuthorizationService {

    @Autowired private UserRepository userRepository;
    @Autowired private ClassRepository classRepository;
    @Autowired private ClassSectionRepository classSectionRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private ParentStudentRepository parentStudentRepository;

    public AuthContext buildContext(Integer userIdHeader, String roleHeader) {
        if (userIdHeader == null) throw new BadRequestException("Thiếu X-User-Id.");
        User u = userRepository.findByIdWithSchoolAndRole(userIdHeader)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng."));
        String role = normalizeRole(roleHeader, u);
        Integer schoolId = u.getSchool() != null ? u.getSchool().getId() : null;
        if (schoolId == null) throw new BadRequestException("Người dùng chưa gắn trường.");
        return new AuthContext(u.getId(), role, schoolId);
    }

    public void requireAdmin(AuthContext ctx) {
        if (ctx == null) throw new ForbiddenException("Thiếu thông tin đăng nhập.");
        if (!isAdminRole(ctx.role)) throw new ForbiddenException("Chức năng này chỉ dành cho Admin.");
    }

    public boolean isHomeroomTeacherOfClass(AuthContext ctx, Integer classId) {
        if (ctx == null || classId == null) return false;
        ClassEntity c = classRepository.findById(classId).orElse(null);
        if (c == null || c.getHomeroomTeacher() == null) return false;
        return Objects.equals(c.getHomeroomTeacher().getId(), ctx.userId);
    }

    public boolean teachesClass(AuthContext ctx, Integer classId) {
        if (ctx == null || classId == null) return false;
        if (!"TEACHER".equals(ctx.role)) return false;
        List<ClassSection> sections = classSectionRepository.findByTeacherIdFetchAll(ctx.userId);
        return sections.stream().anyMatch(cs -> cs != null && cs.getClassRoom() != null
                && Objects.equals(cs.getClassRoom().getId(), classId));
    }

    public boolean teachesClassSubject(AuthContext ctx, Integer classId, Integer subjectId) {
        if (ctx == null || classId == null || subjectId == null) return false;
        if (!"TEACHER".equals(ctx.role)) return false;
        List<ClassSection> sections = classSectionRepository.findByTeacherIdFetchAll(ctx.userId);
        return sections.stream().anyMatch(cs -> cs != null
                && cs.getClassRoom() != null && Objects.equals(cs.getClassRoom().getId(), classId)
                && cs.getSubject() != null && Objects.equals(cs.getSubject().getId(), subjectId));
    }

    public Set<String> taughtPairs(AuthContext ctx) {
        Set<String> out = new HashSet<>();
        if (ctx == null || !"TEACHER".equals(ctx.role)) return out;
        for (ClassSection cs : classSectionRepository.findByTeacherIdFetchAll(ctx.userId)) {
            if (cs == null || cs.getClassRoom() == null || cs.getSubject() == null) continue;
            Integer cid = cs.getClassRoom().getId();
            Integer sid = cs.getSubject().getId();
            if (cid != null && sid != null) out.add(cid + "-" + sid);
        }
        return out;
    }

    public boolean canParentAccessStudent(AuthContext ctx, Integer studentId) {
        if (ctx == null || studentId == null) return false;
        if (!isParentRole(ctx.role)) return false;
        return parentStudentRepository.existsByParentIdAndStudentId(ctx.userId, studentId);
    }

    public boolean canStudentAccessSelf(AuthContext ctx, Integer studentId) {
        if (ctx == null || studentId == null) return false;
        if (!isStudentRole(ctx.role)) return false;
        return Objects.equals(ctx.userId, studentId);
    }

    public boolean studentInClass(Integer studentId, Integer classId) {
        if (studentId == null || classId == null) return false;
        List<Enrollment> enr = enrollmentRepository.findByStudentId(studentId);
        return enr.stream().anyMatch(e -> e != null
                && e.getClassEntity() != null && Objects.equals(e.getClassEntity().getId(), classId)
                && (e.getStatus() == null || "ACTIVE".equalsIgnoreCase(e.getStatus())));
    }

    public void requireCanAccessClassFull(AuthContext ctx, Integer classId) {
        if (ctx == null) throw new ForbiddenException("Thiếu thông tin đăng nhập.");
        if (isAdminRole(ctx.role)) return;
        if ("TEACHER".equals(ctx.role) && isHomeroomTeacherOfClass(ctx, classId)) return;
        throw new ForbiddenException("Bạn không có quyền xem toàn bộ thông tin của lớp này.");
    }

    public void requireCanAccessClassSubject(AuthContext ctx, Integer classId, Integer subjectId) {
        if (ctx == null) throw new ForbiddenException("Thiếu thông tin đăng nhập.");
        if (isAdminRole(ctx.role)) return;
        if ("TEACHER".equals(ctx.role) && isHomeroomTeacherOfClass(ctx, classId)) return;
        if ("TEACHER".equals(ctx.role) && teachesClassSubject(ctx, classId, subjectId)) return;
        throw new ForbiddenException("Bạn không có quyền xem môn này của lớp này.");
    }

    public void requireCanLookupHomeroom(AuthContext ctx, Integer classId, Integer studentIdForParentStudent) {
        if (ctx == null) throw new ForbiddenException("Thiếu thông tin đăng nhập.");
        if (isAdminRole(ctx.role)) return;

        if ("TEACHER".equals(ctx.role)) {
            if (isHomeroomTeacherOfClass(ctx, classId) || teachesClass(ctx, classId)) return;
        }
        if (isStudentRole(ctx.role)) {
            if (studentInClass(ctx.userId, classId)) return;
        }
        if (isParentRole(ctx.role)) {
            if (studentIdForParentStudent != null && canParentAccessStudent(ctx, studentIdForParentStudent)
                    && studentInClass(studentIdForParentStudent, classId)) {
                return;
            }
        }
        throw new ForbiddenException("Bạn không có quyền tra cứu GVCN của lớp này.");
    }

    private static boolean isAdminRole(String role) {
        if (role == null) return false;
        String r = role.toUpperCase(Locale.ROOT);
        return r.contains("ADMIN");
    }

    private static boolean isParentRole(String role) {
        if (role == null) return false;
        String r = role.toUpperCase(Locale.ROOT);
        return r.contains("PARENT") || r.contains("PHU_HUYNH") || r.contains("PHỤ HUYNH");
    }

    private static boolean isStudentRole(String role) {
        if (role == null) return false;
        String r = role.toUpperCase(Locale.ROOT);
        return r.contains("STUDENT") || r.contains("HỌC SINH") || r.contains("HOC SINH");
    }

    private static String normalizeRole(String roleHeader, User u) {
        if (roleHeader != null && !roleHeader.isBlank()) {
            String r = roleHeader.trim().toUpperCase(Locale.ROOT);
            if (r.startsWith("TEACHER")) return "TEACHER";
            if (r.contains("GIÁO VIÊN") || r.contains("GIAO VIEN")) return "TEACHER";
            if (r.contains("SUPER_ADMIN")) return "SUPER_ADMIN";
            if (r.contains("ADMIN")) return "ADMIN";
            if (r.contains("STUDENT")) return "STUDENT";
            if (r.contains("HỌC SINH") || r.contains("HOC SINH")) return "STUDENT";
            if (r.contains("PARENT")) return "PARENT";
            if (r.contains("PHỤ HUYNH") || r.contains("PHU HUYNH")) return "PARENT";
            return r;
        }
        String role = (u != null && u.getRole() != null) ? u.getRole().getName() : null;
        if (role == null) return "";
        String r = role.trim().toUpperCase(Locale.ROOT);
        if (r.startsWith("TEACHER")) return "TEACHER";
        if (r.contains("GIÁO VIÊN") || r.contains("GIAO VIEN")) return "TEACHER";
        if (r.contains("SUPER_ADMIN")) return "SUPER_ADMIN";
        if (r.contains("ADMIN")) return "ADMIN";
        if (r.contains("STUDENT")) return "STUDENT";
        if (r.contains("HỌC SINH") || r.contains("HOC SINH")) return "STUDENT";
        if (r.contains("PARENT")) return "PARENT";
        if (r.contains("PHỤ HUYNH") || r.contains("PHU HUYNH")) return "PARENT";
        return r;
    }

    public static class AuthContext {
        private final Integer userId;
        private final String role;
        private final Integer schoolId;

        public AuthContext(Integer userId, String role, Integer schoolId) {
            this.userId = userId;
            this.role = role;
            this.schoolId = schoolId;
        }

        public Integer getUserId() { return userId; }
        public String getRole() { return role; }
        public Integer getSchoolId() { return schoolId; }
    }
}

