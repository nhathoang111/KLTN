package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.repository.RoleRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

@Service
public class UserImportService {

    private static final String DEFAULT_PASSWORD = "Password@123";
    private static final int MAX_IMPORT = 500;
    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    @Autowired
    private UserService userService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    public static class ImportResult {
        private int successCount;
        private int failCount;
        private List<Map<String, Object>> errors = new ArrayList<>();

        public int getSuccessCount() { return successCount; }
        public void setSuccessCount(int successCount) { this.successCount = successCount; }
        public int getFailCount() { return failCount; }
        public void setFailCount(int failCount) { this.failCount = failCount; }
        public List<Map<String, Object>> getErrors() { return errors; }
        public void setErrors(List<Map<String, Object>> errors) { this.errors = errors; }
    }

    public ImportResult importFromExcel(MultipartFile file, String currentUserRole, Integer currentUserSchoolId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn file Excel");
        }
        String normalizedRole = normalizeUserRole(currentUserRole);
        if (!"SUPER_ADMIN".equals(normalizedRole) && !"ADMIN".equals(normalizedRole)) {
            throw new com.example.schoolmanagement.exception.ForbiddenException("Chỉ Admin hoặc Super Admin mới được nhập người dùng từ Excel");
        }
        String name = file.getOriginalFilename();
        if (name == null || (!name.endsWith(".xlsx") && !name.endsWith(".xls"))) {
            throw new BadRequestException("Chỉ chấp nhận file Excel (.xlsx hoặc .xls)");
        }

        ImportResult result = new ImportResult();
        List<Map<String, Object>> errors = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("File Excel không có sheet nào");
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new BadRequestException("Dòng đầu tiên phải là tiêu đề cột");
            }

            Map<String, Integer> colIndex = mapHeaderToIndex(headerRow);
            if (!colIndex.containsKey("email")) {
                throw new BadRequestException("File Excel phải có cột 'Email' (hoặc 'email')");
            }

            int rowCount = 0;
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                if (rowCount >= MAX_IMPORT) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("row", i + 1);
                    err.put("email", "");
                    err.put("message", "Chỉ xử lý tối đa " + MAX_IMPORT + " dòng. Các dòng sau đã bỏ qua.");
                    errors.add(err);
                    result.setFailCount(result.getFailCount() + 1);
                    break;
                }
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String email = getCellString(row, colIndex.get("email"));
                boolean anyDataInRow = hasAnyData(row);

                if (email == null || email.trim().isEmpty()) {
                    // Nếu dòng có dữ liệu mà thiếu Email, báo lỗi rõ ràng thay vì skip im lặng
                    if (anyDataInRow) {
                        Map<String, Object> err = new HashMap<>();
                        err.put("row", i + 1);
                        err.put("email", "");
                        err.put("message", "Thiếu Email");
                        errors.add(err);
                        result.setFailCount(result.getFailCount() + 1);
                        rowCount++;
                    }
                    continue;
                }

                Map<String, Object> userData = new HashMap<>();
                userData.put("email", email.trim());
                userData.put("fullName", trimOrNull(getCellString(row, colIndex.getOrDefault("fullName", -1))) != null
                        ? trimOrNull(getCellString(row, colIndex.get("fullName")))
                        : trimOrNull(getCellString(row, colIndex.getOrDefault("hoTen", -1))));
                String password = trimOrNull(getCellString(row, colIndex.getOrDefault("password", -1)));
                if (password == null) password = trimOrNull(getCellString(row, colIndex.getOrDefault("matKhau", -1)));
                userData.put("password", password != null && !password.isEmpty() ? password : DEFAULT_PASSWORD);
                userData.put("status", "ACTIVE");

                Integer schoolId = getCellInt(row, colIndex.getOrDefault("schoolId", -1));
                if (schoolId == null) schoolId = getCellInt(row, colIndex.getOrDefault("maTruong", -1));
                if (schoolId != null) userData.put("schoolId", schoolId);

                String roleStr = trimOrNull(getCellString(row, colIndex.getOrDefault("role", -1)));
                if (roleStr == null) roleStr = trimOrNull(getCellString(row, colIndex.getOrDefault("vaiTro", -1)));
                Integer roleId = resolveRoleId(roleStr, schoolId != null ? schoolId : currentUserSchoolId);
                if (roleId != null) userData.put("roleId", roleId);

                Integer classId = getCellInt(row, colIndex.getOrDefault("classId", -1));
                if (classId == null) classId = getCellInt(row, colIndex.getOrDefault("maLop", -1));
                if (classId != null) userData.put("classId", classId);

                String dateOfBirthStr = trimOrNull(getCellString(row, colIndex.getOrDefault("dateOfBirth", -1)));
                if (dateOfBirthStr != null && !dateOfBirthStr.isEmpty()) userData.put("dateOfBirth", dateOfBirthStr);
                String genderStr = trimOrNull(getCellString(row, colIndex.getOrDefault("gender", -1)));
                if (genderStr != null && !genderStr.isEmpty()) userData.put("gender", genderStr.trim());
                String phoneStr = trimOrNull(getCellString(row, colIndex.getOrDefault("phone", -1)));
                if (phoneStr != null && !phoneStr.isEmpty()) userData.put("phone", phoneStr.trim());
                String deptStr = trimOrNull(getCellString(row, colIndex.getOrDefault("department", -1)));
                if (deptStr != null && !deptStr.isEmpty()) userData.put("department", deptStr.trim());
                String relStr = trimOrNull(getCellString(row, colIndex.getOrDefault("relationship", -1)));
                if (relStr != null && !relStr.isEmpty()) userData.put("relationship", relStr.trim());

                Integer effSchoolId = schoolId != null ? schoolId : currentUserSchoolId;
                String subjectNamesStr = trimOrNull(getCellString(row, colIndex.getOrDefault("subjectNames", -1)));
                if (subjectNamesStr != null && effSchoolId != null) {
                    List<Integer> subjectIds = resolveSubjectIdsFromNames(subjectNamesStr, effSchoolId);
                    if (!subjectIds.isEmpty()) userData.put("subjectIds", subjectIds);
                }
                String studentEmailsStr = trimOrNull(getCellString(row, colIndex.getOrDefault("studentEmails", -1)));
                if (studentEmailsStr != null && effSchoolId != null) {
                    List<Integer> studentIds = resolveStudentIdsFromEmails(studentEmailsStr, effSchoolId);
                    if (!studentIds.isEmpty()) userData.put("studentIds", studentIds);
                }

                if (userData.get("fullName") == null || ((String) userData.get("fullName")).trim().isEmpty()) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("row", i + 1);
                    err.put("email", email);
                    err.put("message", "Thiếu Họ tên");
                    errors.add(err);
                    result.setFailCount(result.getFailCount() + 1);
                    continue;
                }
                if (schoolId == null && currentUserSchoolId != null) {
                    userData.put("schoolId", currentUserSchoolId);
                }
                if (schoolId == null && currentUserSchoolId == null && "ADMIN".equals(normalizedRole)) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("row", i + 1);
                    err.put("email", email);
                    err.put("message", "Thiếu Mã trường");
                    errors.add(err);
                    result.setFailCount(result.getFailCount() + 1);
                    continue;
                }
                if (userData.get("roleId") == null) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("row", i + 1);
                    err.put("email", email);
                    err.put("message", "Không xác định được Vai trò (STUDENT/TEACHER/PARENT). Kiểm tra cột Vai trò và Mã trường.");
                    errors.add(err);
                    result.setFailCount(result.getFailCount() + 1);
                    continue;
                }

                try {
                    // Dùng schoolId hiệu lực theo từng dòng để tránh lỗi "own school" khi file có cột Mã trường
                    userService.createUser(userData, normalizedRole, effSchoolId != null ? effSchoolId : currentUserSchoolId);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                    rowCount++;
                } catch (Exception e) {
                    String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                    Map<String, Object> err = new HashMap<>();
                    err.put("row", i + 1);
                    err.put("email", email);
                    err.put("message", msg);
                    errors.add(err);
                    result.setFailCount(result.getFailCount() + 1);
                }
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Lỗi đọc file Excel: " + (e.getMessage() != null ? e.getMessage() : "không xác định"));
        }

        result.setErrors(errors);
        return result;
    }

    private String normalizeUserRole(String currentUserRole) {
        if (currentUserRole == null) return "";
        String r = currentUserRole.trim().toUpperCase();
        // chấp nhận các format phổ biến: "ADMIN", "ROLE_ADMIN", "SCHOOL_ADMIN", ...
        if (r.contains("SUPER_ADMIN")) return "SUPER_ADMIN";
        if (r.equals("ADMIN") || r.contains("ADMIN")) return "ADMIN";
        return r;
    }

    private Map<String, Integer> mapHeaderToIndex(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            String v = getCellString(headerRow, i);
            if (v == null || v.trim().isEmpty()) continue;
            String key = v.trim().toLowerCase().replace(" ", "").replace("_", "");
            String raw = v.trim();
            // Cột "Email con" chỉ dùng cho studentEmails; cột "Email" (user) dùng cho mọi vai trò
            // Chỉ gán "email" lần đầu (cột trái nhất) để luôn lấy đúng email đăng nhập, không bị cột "Email con" ghi đè
            if (key.contains("emailcon") || key.contains("studentemail") || (key.contains("email") && key.contains("con"))) {
                map.put("studentEmails", i);
            } else if (!map.containsKey("email") && key.contains("email")) {
                map.put("email", i);
            }
            if (key.contains("hoten") || key.equals("fullname") || (key.contains("ho") && key.contains("ten"))
                    || raw.contains("ọ") && raw.contains("tên") || raw.contains("Họ tên")) map.put("fullName", i);
            if (key.contains("hoten")) map.put("hoTen", i);
            if (key.contains("password") || key.contains("matkhau") || (raw.contains("Mật") && raw.contains("khẩu"))) map.put("password", i);
            if (key.contains("matkhau")) map.put("matKhau", i);
            if (key.contains("vaitro") || key.equals("role") || raw.contains("Vai trò")) { map.put("role", i); map.put("vaiTro", i); }
            if (key.contains("matruong") || key.equals("schoolid") || raw.contains("Mã trường")) { map.put("schoolId", i); map.put("maTruong", i); }
            if (key.contains("malop") || key.equals("classid") || raw.contains("Mã lớp")) { map.put("classId", i); map.put("maLop", i); }
            if (key.contains("ngaysinh") || key.contains("dateofbirth") || (raw.contains("Ngày") && raw.contains("sinh"))) map.put("dateOfBirth", i);
            if (key.contains("gioitinh") || key.equals("gender") || (raw.contains("Giới") && raw.contains("tính"))) map.put("gender", i);
            if (key.contains("sdt") || key.contains("phone") || key.contains("dienthoai") || (raw.contains("điện") && raw.contains("thoại"))) map.put("phone", i);
            if (key.contains("phongban") || key.contains("department") || (raw.contains("Phòng") && raw.contains("ban"))) map.put("department", i);
            if (key.contains("quanhe") || key.contains("relationship") || (raw.contains("Quan") && raw.contains("hệ"))) map.put("relationship", i);
            if (key.contains("bomon") || key.contains("subject") || (raw.contains("Bộ") && raw.contains("môn"))) map.put("subjectNames", i);
            // studentEmails đã được map ở trên (cột Email con)
        }
        if (!map.containsKey("fullName") && map.containsKey("hoTen")) map.put("fullName", map.get("hoTen"));
        return map;
    }

    private String getCellString(Row row, int cellIndex) {
        if (cellIndex < 0) return null;
        Cell cell = row.getCell(cellIndex);
        if (cell == null) return null;
        try {
            // DataFormatter đọc được STRING/NUMERIC/DATE/FORMULA và trả ra đúng text người dùng thấy trong Excel
            String s = DATA_FORMATTER.formatCellValue(cell);
            if (s == null) return null;
            String t = s.trim();
            return t.isEmpty() ? null : t;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer getCellInt(Row row, int cellIndex) {
        if (cellIndex < 0) return null;
        Cell cell = row.getCell(cellIndex);
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            }
            String s = DATA_FORMATTER.formatCellValue(cell);
            if (s == null || s.trim().isEmpty()) return null;
            return Integer.parseInt(s.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean hasAnyData(Row row) {
        if (row == null) return false;
        short last = row.getLastCellNum();
        if (last <= 0) return false;
        for (int i = 0; i < last; i++) {
            Cell c = row.getCell(i);
            if (c == null) continue;
            String s = null;
            try {
                s = DATA_FORMATTER.formatCellValue(c);
            } catch (Exception ignored) {}
            if (s != null && !s.trim().isEmpty()) return true;
        }
        return false;
    }

    private String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private Integer resolveRoleId(String roleName, Integer schoolId) {
        if (roleName == null || roleName.trim().isEmpty() || schoolId == null) return null;
        String r = roleName.trim().toUpperCase();
        String pattern;
        if (r.contains("STUDENT") || r.contains("HỌC SINH") || r.contains("HOC SINH")) pattern = "%STUDENT%";
        else if (r.contains("TEACHER") || r.contains("GIÁO VIÊN") || r.contains("GIAO VIEN") || r.contains("GV")) pattern = "%TEACHER%";
        else if (r.contains("PARENT") || r.contains("PHỤ HUYNH") || r.contains("PHU HUYNH")) pattern = "%PARENT%";
        else pattern = "%STUDENT%";
        var list = roleRepository.findBySchoolIdAndNamePattern(schoolId, pattern);
        return list.isEmpty() ? null : list.get(0).getId();
    }


    private List<Integer> resolveSubjectIdsFromNames(String namesCell, Integer schoolId) {
        if (namesCell == null || namesCell.trim().isEmpty() || schoolId == null) return Collections.emptyList();
        List<Subject> subjects = subjectRepository.findBySchoolId(schoolId);
        List<Integer> result = new ArrayList<>();
        for (String part : namesCell.split("[,;]")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) continue;
            Integer id = findSubjectIdByNameOrCode(subjects, trimmed);
            if (id != null && !result.contains(id)) result.add(id);
        }
        return result;
    }

    private Integer findSubjectIdByNameOrCode(List<Subject> subjects, String part) {
        for (Subject sub : subjects) {
            if (part.equalsIgnoreCase(sub.getName()) || (sub.getCode() != null && part.equalsIgnoreCase(sub.getCode())))
                return sub.getId();
        }
        return null;
    }

    private List<Integer> resolveStudentIdsFromEmails(String emailsCell, Integer schoolId) {
        if (emailsCell == null || emailsCell.trim().isEmpty() || schoolId == null) return Collections.emptyList();
        List<Integer> ids = new ArrayList<>();
        for (String email : emailsCell.split("[,;]")) {
            String e = email.trim();
            if (e.isEmpty()) continue;
            var opt = userRepository.findByEmailAndSchoolId(e, schoolId);
            if (opt.isEmpty()) continue;
            var u = opt.get();
            if (u.getSchool() != null && u.getSchool().getId().equals(schoolId)
                    && u.getRole() != null && u.getRole().getName() != null
                    && u.getRole().getName().toUpperCase().contains("STUDENT")) {
                if (!ids.contains(u.getId())) ids.add(u.getId());
            }
        }
        return ids;
    }

    public byte[] generateTemplate() {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Người dùng");
            Row header = sheet.createRow(0);
            String[] headers = {
                "Email", "Họ tên", "Mật khẩu", "Vai trò", "Mã trường", "Mã lớp",
                "Ngày sinh", "Giới tính", "SĐT", "Phòng ban", "Quan hệ",
                "Bộ môn (nhiều)", "Email con (nhiều)"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(headers[i]);
            }
            // Dòng 1: Học sinh
            Row ex1 = sheet.createRow(1);
            ex1.createCell(0).setCellValue("hocsinh1@school.edu.vn");
            ex1.createCell(1).setCellValue("Nguyễn Văn A");
            ex1.createCell(2).setCellValue("Password@123");
            ex1.createCell(3).setCellValue("STUDENT");
            ex1.createCell(4).setCellValue("1");
            ex1.createCell(5).setCellValue("1");
            ex1.createCell(6).setCellValue("2010-05-15");
            ex1.createCell(7).setCellValue("Nam");
            ex1.createCell(8).setCellValue("");
            ex1.createCell(9).setCellValue("");
            ex1.createCell(10).setCellValue("");
            ex1.createCell(11).setCellValue("");
            ex1.createCell(12).setCellValue("");
            // Dòng 2: Giáo viên
            Row ex2 = sheet.createRow(2);
            ex2.createCell(0).setCellValue("giaovien1@school.edu.vn");
            ex2.createCell(1).setCellValue("Trần Thị B");
            ex2.createCell(2).setCellValue("Password@123");
            ex2.createCell(3).setCellValue("TEACHER");
            ex2.createCell(4).setCellValue("1");
            ex2.createCell(5).setCellValue("");
            ex2.createCell(6).setCellValue("");
            ex2.createCell(7).setCellValue("Nữ");
            ex2.createCell(8).setCellValue("0912345678");
            ex2.createCell(9).setCellValue("Tổ Toán");
            ex2.createCell(10).setCellValue("");
            ex2.createCell(11).setCellValue("Toán, Lý");
            ex2.createCell(12).setCellValue("");
            // Dòng 3: Phụ huynh
            Row ex3 = sheet.createRow(3);
            ex3.createCell(0).setCellValue("phuhuynh1@school.edu.vn");
            ex3.createCell(1).setCellValue("Lê Văn C");
            ex3.createCell(2).setCellValue("Password@123");
            ex3.createCell(3).setCellValue("PARENT");
            ex3.createCell(4).setCellValue("1");
            ex3.createCell(5).setCellValue("");
            ex3.createCell(6).setCellValue("");
            ex3.createCell(7).setCellValue("");
            ex3.createCell(8).setCellValue("0987654321");
            ex3.createCell(9).setCellValue("");
            ex3.createCell(10).setCellValue("Cha");
            ex3.createCell(11).setCellValue("");
            ex3.createCell(12).setCellValue("hocsinh1@school.edu.vn");
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new BadRequestException("Không tạo được file mẫu: " + e.getMessage());
        }
    }
}
