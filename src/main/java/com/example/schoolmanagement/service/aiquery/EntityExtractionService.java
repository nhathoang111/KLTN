package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class EntityExtractionService {

    @Autowired private ClassRepository classRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private UserRepository userRepository;

    public NormalizedEntities normalizeEntities(Integer schoolId, Map<String, String> rawEntities) {
        NormalizedEntities out = new NormalizedEntities();
        if (rawEntities == null) rawEntities = Map.of();

        String classNameRaw = rawEntities.get("className");
        if (classNameRaw != null && !classNameRaw.isBlank() && schoolId != null) {
            out.classEntity = resolveClassByName(schoolId, classNameRaw);
        }

        String subjectNameRaw = rawEntities.get("subjectName");
        if (subjectNameRaw != null && !subjectNameRaw.isBlank() && schoolId != null) {
            out.subject = resolveSubjectByName(schoolId, subjectNameRaw);
        }

        String studentNameRaw = rawEntities.get("studentName");
        if (studentNameRaw != null && !studentNameRaw.isBlank() && schoolId != null) {
            out.student = resolveStudentByName(schoolId, studentNameRaw);
        }

        String teacherNameRaw = rawEntities.get("teacherName");
        if (teacherNameRaw != null && !teacherNameRaw.isBlank() && schoolId != null) {
            out.teacher = resolveTeacherCandidate(schoolId, teacherNameRaw, rawEntities);
        }

        out.raw = new HashMap<>(rawEntities);
        return out;
    }

    private ClassEntity resolveClassByName(Integer schoolId, String classNameRaw) {
        List<ClassEntity> classes = classRepository.findBySchoolId(schoolId);
        if (classes == null || classes.isEmpty()) throw new BadRequestException("Trường chưa có dữ liệu lớp học.");
        String want = norm(classNameRaw);
        // Also try keep slash form if raw is "10 2" etc.
        String wantNoSpace = want.replace(" ", "");
        String wantSlash = want.replace(" ", "/");
        ClassEntity best = classes.stream()
                .filter(Objects::nonNull)
                .filter(c -> c.getName() != null)
                .filter(c -> {
                    String cn = norm(c.getName());
                    if (cn.equals(want)) return true;
                    if (!wantNoSpace.isEmpty() && cn.replace(" ", "").equals(wantNoSpace)) return true;
                    if (!wantSlash.isEmpty() && cn.equals(wantSlash)) return true;
                    return false;
                })
                .findFirst().orElse(null);
        if (best != null) return best;
        // try contains (e.g. "10a1" in "Lớp 10A1")
        best = classes.stream()
                .filter(Objects::nonNull)
                .filter(c -> c.getName() != null)
                .filter(c -> {
                    String cn = norm(c.getName());
                    if (cn.contains(want) || want.contains(cn)) return true;
                    if (!wantNoSpace.isEmpty() && (cn.replace(" ", "").contains(wantNoSpace) || wantNoSpace.contains(cn.replace(" ", "")))) return true;
                    if (!wantSlash.isEmpty() && (cn.contains(wantSlash) || wantSlash.contains(cn))) return true;
                    return false;
                })
                .findFirst().orElse(null);
        if (best != null) return best;
        throw new BadRequestException("Không tìm thấy lớp \"" + classNameRaw + "\" trong trường.");
    }

    private Subject resolveSubjectByName(Integer schoolId, String subjectNameRaw) {
        List<Subject> subjects = subjectRepository.findBySchoolIdOrderBySortIndex(schoolId);
        if (subjects == null || subjects.isEmpty()) throw new BadRequestException("Trường chưa có dữ liệu môn học.");
        String want = norm(subjectNameRaw);
        Subject best = subjects.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getName() != null)
                .filter(s -> norm(s.getName()).equals(want))
                .findFirst().orElse(null);
        if (best != null) return best;
        best = subjects.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getName() != null)
                .filter(s -> norm(s.getName()).contains(want) || want.contains(norm(s.getName())))
                .findFirst().orElse(null);
        if (best != null) return best;
        throw new BadRequestException("Không tìm thấy môn \"" + subjectNameRaw + "\" trong trường.");
    }

    private User resolveStudentByName(Integer schoolId, String studentNameRaw) {
        // Best-effort: load only STUDENT role users.
        List<User> students = userRepository.findBySchoolIdAndRoleName(schoolId, "%STUDENT%");
        if (students == null || students.isEmpty()) {
            throw new BadRequestException("Trường chưa có dữ liệu học sinh.");
        }
        String want = norm(studentNameRaw);
        List<User> exact = students.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getFullName() != null)
                .filter(u -> norm(u.getFullName()).equals(want))
                .toList();
        if (exact.size() == 1) return exact.get(0);
        if (exact.size() > 1) {
            throw new BadRequestException("Tên học sinh \"" + studentNameRaw + "\" bị trùng. Vui lòng hỏi kèm lớp.");
        }

        List<User> contains = students.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getFullName() != null)
                .filter(u -> norm(u.getFullName()).contains(want))
                .toList();
        if (contains.size() == 1) return contains.get(0);
        if (contains.size() > 1) {
            throw new BadRequestException("Không đủ thông tin để xác định học sinh \"" + studentNameRaw + "\" (nhiều kết quả). Vui lòng hỏi kèm lớp.");
        }
        throw new BadRequestException("Không tìm thấy học sinh \"" + studentNameRaw + "\" trong trường.");
    }

    private User resolveTeacherCandidate(Integer schoolId, String teacherNameRaw, Map<String, String> rawEntities) {
        // If intent is homeroom lookup and class was extracted, teacher should NOT be pre-filled.
        String intent = rawEntities != null ? rawEntities.get("_intent") : null;
        String className = rawEntities != null ? rawEntities.get("className") : null;
        if ((equalsAny(intent, "HOMEROOM_LOOKUP", "ASK_HOMEROOM_TEACHER")) && className != null && !className.isBlank()) {
            return null;
        }

        String candidate = teacherNameRaw == null ? "" : teacherNameRaw.trim();
        if (candidate.isBlank()) return null;
        if (isQuestionPhrase(candidate)) return null;
        if (!looksLikePersonName(candidate)) return null;

        List<User> teachers = userRepository.findBySchoolIdAndRoleName(schoolId, "%TEACHER%");
        if (teachers == null || teachers.isEmpty()) return null;
        String want = norm(teacherNameRaw);
        List<User> exact = teachers.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getFullName() != null)
                .filter(u -> norm(u.getFullName()).equals(want))
                .toList();
        if (exact.size() == 1) return exact.get(0);
        if (exact.size() > 1) return null;
        List<User> contains = teachers.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getFullName() != null)
                .filter(u -> norm(u.getFullName()).contains(want))
                .toList();
        if (contains.size() == 1) return contains.get(0);
        return null;
    }

    private boolean isQuestionPhrase(String text) {
        String n = norm(text);
        if (n.isBlank()) return true;
        if (n.equals("ai") || n.equals("nao") || n.equals("giao vien nao")) return true;
        return n.contains(" ai ") || n.endsWith(" ai") || n.contains(" nao ") || n.endsWith(" nao")
                || n.contains("do giao vien nao") || n.contains("ai la giao vien");
    }

    private boolean looksLikePersonName(String text) {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.isBlank()) return false;
        String n = norm(trimmed);
        if (isQuestionPhrase(n)) return false;
        if (n.matches(".*\\d.*")) return false;
        String[] parts = trimmed.split("\\s+");
        if (parts.length < 2 || parts.length > 6) return false;
        for (String p : parts) {
            if (p.length() < 2) return false;
            String pn = norm(p);
            if (pn.isBlank()) return false;
            if (equalsAny(pn, "giao", "vien", "co", "thay", "thay", "ai", "nao", "chu", "nhiem")) return false;
        }
        return true;
    }

    private boolean equalsAny(String value, String... options) {
        if (value == null) return false;
        String v = value.trim();
        for (String o : options) {
            if (o != null && v.equalsIgnoreCase(o.trim())) return true;
        }
        return false;
    }

    private static String norm(String s) {
        String x = s == null ? "" : s;
        x = x.trim().toLowerCase(Locale.ROOT);
        x = Normalizer.normalize(x, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        x = x.replace('đ', 'd');
        x = x.replaceAll("[^a-z0-9\\s]", " ");
        x = x.replaceAll("\\s+", " ").trim();
        return x;
    }

    public static class NormalizedEntities {
        private Map<String, String> raw;
        private ClassEntity classEntity;
        private Subject subject;
        private User student;
        private User teacher;

        public Map<String, String> getRaw() { return raw; }
        public ClassEntity getClassEntity() { return classEntity; }
        public Subject getSubject() { return subject; }
        public User getStudent() { return student; }
        public User getTeacher() { return teacher; }
    }
}

