package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ExamScore;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.ExamScoreRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.util.ClassStatusPolicy;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.repository.ClassSectionRepository;

import java.text.Normalizer;
import java.util.*;

@Service
public class ExamScoreImportService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ClassRepository classRepo;

    @Autowired
    private SubjectRepository subjectRepo;

    @Autowired
    private ExamScoreRepository examRepo;
    @Autowired
    private ClassSectionRepository classSectionRepo;

    private static final DataFormatter F = new DataFormatter();

    public ImportResult importExcel(MultipartFile file, Integer schoolId, Integer currentUserId, String currentUserRole) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File rỗng");
        }

        ImportResult result = new ImportResult();
        List<Map<String, Object>> errors = new ArrayList<>();

        // Dùng map để tránh lưu trùng khi trong cùng file có nhiều dòng trùng key
        Map<String, ExamScore> saveMap = new LinkedHashMap<>();

                boolean isTeacher = currentUserRole != null && currentUserRole.toUpperCase().contains("TEACHER");

        Map<String, ClassSection> allowedClassSectionByPair = new HashMap<>();
        Set<String> allowedPairs = new HashSet<>();

        if (isTeacher) {
            List<ClassSection> teacherSections = classSectionRepo.findByTeacherIdFetchAll(currentUserId);
            for (ClassSection cs : teacherSections) {
                if (cs == null || cs.getClassRoom() == null || cs.getSubject() == null) continue;
                String status = cs.getStatus() == null ? "ACTIVE" : cs.getStatus().trim().toUpperCase();
                if (!"ACTIVE".equals(status)) continue;
                Integer classId = cs.getClassRoom().getId();
                Integer subjectId = cs.getSubject().getId();
                Integer sectionSchoolId = cs.getClassRoom().getSchool() != null ? cs.getClassRoom().getSchool().getId() : null;
                if (sectionSchoolId != null && !Objects.equals(sectionSchoolId, schoolId)) continue;
                String pairKey = buildPairKey(classId, subjectId);
                allowedPairs.add(pairKey);
                allowedClassSectionByPair.putIfAbsent(pairKey, cs);
            }

            if (allowedPairs.isEmpty()) {
                throw new RuntimeException("Giáo viên chưa được phân công lớp/môn nào để import điểm");
            }
        }

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                throw new RuntimeException("File Excel không có sheet");
            }

            Row header = sheet.getRow(0);
            if (header == null) {
                throw new RuntimeException("Excel thiếu header");
            }

            Map<String, Integer> col = mapHeader(header);

            List<String> required = List.of("email", "class", "subject");
            for (String key : required) {
                if (!col.containsKey(key)) {
                    throw new RuntimeException("Thiếu cột: " + key);
                }
            }

            List<User> students = userRepo.findBySchoolId(schoolId);
            List<ClassEntity> classes = classRepo.findBySchoolId(schoolId);
            List<Subject> subjects = subjectRepo.findBySchoolId(schoolId);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);

                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                try {
                    String rawEmail = get(row, col.get("email"));
                    String rawClassName = get(row, col.get("class"));
                    String rawSubjectName = get(row, col.get("subject"));

                    String email = normalizeEmail(rawEmail);
                    String className = normalizeClassName(rawClassName);
                    String subjectName = normalizeText(rawSubjectName);

                    if (email == null || email.isBlank()) {
                        throw new RuntimeException("Email trống");
                    }

                    if (className == null || className.isBlank()) {
                        throw new RuntimeException("Lớp trống");
                    }

                    if (subjectName == null || subjectName.isBlank()) {
                        throw new RuntimeException("Môn học trống");
                    }

                    User student = findStudentByEmail(students, email)
                            .orElseThrow(() -> new RuntimeException("Student not found: " + rawEmail));

                    ClassEntity clazz = findClassByName(classes, className)
                            .orElseThrow(() -> new RuntimeException("Class not found: " + rawClassName));
                    ClassStatusPolicy.assertTeachActionAllowed(clazz, "import điểm");

                    Subject subject = findSubjectByName(subjects, subjectName)
                            .orElseThrow(() -> new RuntimeException("Subject not found: " + rawSubjectName));

                    ClassSection matchedClassSection = null;

                    if (isTeacher) {
                        String pairKey = buildPairKey(clazz.getId(), subject.getId());

                        if (!allowedPairs.contains(pairKey)) {
                            throw new RuntimeException("Bạn không có quyền import điểm cho lớp/môn này");
                        }

                        matchedClassSection = allowedClassSectionByPair.get(pairKey);
                    }

                    boolean hasScore = false;

                    hasScore |= processScore(row, col, "mieng", "MIENG", student, clazz, subject, matchedClassSection, saveMap);
                    hasScore |= processScore(row, col, "15p", "15P", student, clazz, subject, matchedClassSection, saveMap);
                    hasScore |= processScore(row, col, "1tiet", "1TIET", student, clazz, subject, matchedClassSection, saveMap);
                    hasScore |= processScore(row, col, "cuoiki", "CUOIKI", student, clazz, subject, matchedClassSection, saveMap);

                    if (hasScore) {
                        result.success++;
                    } else {
                        throw new RuntimeException("Dòng này không có điểm hợp lệ để import");
                    }

                } catch (Exception e) {
                    errors.add(Map.of(
                            "row", i + 1,
                            "error", e.getMessage()
                    ));
                    result.fail++;
                }
            }

            if (!saveMap.isEmpty()) {
                examRepo.saveAll(saveMap.values());
            }

        } catch (Exception e) {
            throw new RuntimeException("Import failed: " + e.getMessage());
        }

        result.errors = errors;
        return result;
    }

    private boolean processScore(
            Row row,
            Map<String, Integer> col,
            String key,
            String type,
            User student,
            ClassEntity clazz,
            Subject subject,
            ClassSection matchedClassSection,
            Map<String, ExamScore> saveMap
    ) {
        if (!col.containsKey(key)) {
            return false;
        }

        Double val = getDoubleStrict(row, col.get(key), key);
        if (val == null) {
            return false;
        }

        if (val < 0 || val > 10) {
            throw new RuntimeException(type + " phải nằm trong khoảng 0 đến 10");
        }

        String compositeKey = student.getId() + "|" + subject.getId() + "|" + clazz.getId() + "|" + type + "|1";

        ExamScore target = saveMap.get(compositeKey);
        if (target == null) {
            target = examRepo.findExact(student.getId(), subject.getId(), clazz.getId(), type, 1)
                    .orElseGet(() -> {
                        ExamScore es = new ExamScore();
                        es.setStudent(student);
                        es.setClassEntity(clazz);
                        es.setSubject(subject);
                        es.setScoreType(type);
                        es.setAttempt(1);
                        es.setSchool(student.getSchool());
                        return es;
                    });
        }

        target.setScore(val);
        if (matchedClassSection != null) {
            target.setClassSection(matchedClassSection);
        }

        saveMap.put(compositeKey, target);
        return true;
    }
    private String buildPairKey(Integer classId, Integer subjectId) {
        return classId + "-" + subjectId;
    }
    private Map<String, Integer> mapHeader(Row row) {
        Map<String, Integer> m = new HashMap<>();

        for (int i = 0; i < row.getLastCellNum(); i++) {
            String raw = F.formatCellValue(row.getCell(i));
            String key = normalizeHeader(raw);

            if (key.isBlank()) {
                continue;
            }

            // Mapping alias header
            if (key.equals("lop")) key = "class";
            if (key.equals("classname")) key = "class";

            if (key.equals("mon")) key = "subject";
            if (key.equals("monhoc")) key = "subject";
            if (key.equals("subjectname")) key = "subject";

            if (key.equals("mail")) key = "email";
            if (key.equals("studentemail")) key = "email";

            if (key.equals("mieng1")) key = "mieng";
            if (key.equals("diemmieng")) key = "mieng";

            if (key.equals("15phut")) key = "15p";
            if (key.equals("15phut1")) key = "15p";
            if (key.equals("diem15p")) key = "15p";
            if (key.equals("diem15phut")) key = "15p";

            if (key.equals("1tiet1")) key = "1tiet";
            if (key.equals("motiet")) key = "1tiet";
            if (key.equals("mottiet")) key = "1tiet";
            if (key.equals("diem1tiet")) key = "1tiet";

            if (key.equals("cuoiky")) key = "cuoiki";
            if (key.equals("cuoiki1")) key = "cuoiki";
            if (key.equals("diemcuoiky")) key = "cuoiki";

            m.put(key, i);
        }

        return m;
    }

    private Optional<User> findStudentByEmail(List<User> students, String email) {
        String normalizedInput = normalizeEmail(email);

        return students.stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getEmail() != null)
                .filter(u -> normalizeEmail(u.getEmail()).equals(normalizedInput))
                .findFirst();
    }

    private Optional<ClassEntity> findClassByName(List<ClassEntity> classes, String className) {
        String normalizedInput = normalizeClassName(className);

        return classes.stream()
                .filter(Objects::nonNull)
                .filter(c -> c.getName() != null)
                .filter(c -> normalizeClassName(c.getName()).equalsIgnoreCase(normalizedInput))
                .findFirst();
    }

    private Optional<Subject> findSubjectByName(List<Subject> subjects, String subjectName) {
        String normalizedInput = normalizeText(subjectName);

        return subjects.stream()
                .filter(Objects::nonNull)
                .filter(s -> s.getName() != null)
                .filter(s -> normalizeText(s.getName()).equals(normalizedInput))
                .findFirst();
    }

    private String get(Row r, Integer i) {
        return i == null ? null : F.formatCellValue(r.getCell(i)).trim();
    }

    private Double getDoubleStrict(Row r, Integer i, String columnName) {
        String v = get(r, i);
        if (v == null || v.isBlank()) {
            return null;
        }

        try {
            v = v.replace(",", ".");
            return Double.parseDouble(v);
        } catch (Exception e) {
            throw new RuntimeException("Cột " + columnName + " không phải số hợp lệ");
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            if (F.formatCellValue(row.getCell(i)).trim().length() > 0) {
                return false;
            }
        }
        return true;
    }

    private String normalizeEmail(String value) {
        if (value == null) return null;
        return value.trim().toLowerCase();
    }

    private String normalizeClassName(String value) {
        if (value == null) return null;

        String s = value.trim();

        // bỏ phần kiểu: 10/1 (2024-2025)
        s = s.replaceAll("\\s*\\(.*?\\)\\s*$", "");

        // chuẩn hóa khoảng trắng
        s = s.replaceAll("\\s+", " ");

        return s.trim();
    }

    private String normalizeText(String value) {
        if (value == null) return null;

        String s = value.trim().toLowerCase();
        s = removeAccent(s);
        s = s.replaceAll("\\s+", " ");
        return s.trim();
    }

    private String normalizeHeader(String value) {
        if (value == null) return "";

        String s = removeAccent(value.trim().toLowerCase());
        s = s.replaceAll("[\\s_\\-.]", "");
        return s;
    }

    private String removeAccent(String value) {
        if (value == null) return null;

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        return normalized
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D");
    }

    public static class ImportResult {
        public int success;
        public int fail;
        public List<Map<String, Object>> errors;
    }
}