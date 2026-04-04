package com.example.schoolmanagement.util;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;

import java.io.FileOutputStream;
import java.nio.file.Paths;

/**
 * Chạy để tạo/cập nhật file mẫu .xls (đúng định dạng import):
 * mvn exec:java -Dexec.mainClass="com.example.schoolmanagement.util.GenerateUserImportTemplate"
 */
public class GenerateUserImportTemplate {
    public static void main(String[] args) throws Exception {
        String outPath = Paths.get("mau_nhap_nguoi_dung.xls").toAbsolutePath().toString();
        try (Workbook wb = new HSSFWorkbook()) {
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
            ex1.createCell(0).setCellValue("hocsinh.mau1@school.edu.vn");
            ex1.createCell(1).setCellValue("Nguyễn Văn A");
            ex1.createCell(2).setCellValue("Password@123");
            ex1.createCell(3).setCellValue("STUDENT");
            ex1.createCell(4).setCellValue(1);
            ex1.createCell(5).setCellValue(1);
            ex1.createCell(6).setCellValue("2010-05-15");
            ex1.createCell(7).setCellValue("Nam");
            ex1.createCell(8).setCellValue("");
            ex1.createCell(9).setCellValue("");
            ex1.createCell(10).setCellValue("");
            ex1.createCell(11).setCellValue("");
            ex1.createCell(12).setCellValue("");
            // Dòng 2: Giáo viên
            Row ex2 = sheet.createRow(2);
            ex2.createCell(0).setCellValue("giaovien.mau1@school.edu.vn");
            ex2.createCell(1).setCellValue("Trần Thị B");
            ex2.createCell(2).setCellValue("Password@123");
            ex2.createCell(3).setCellValue("TEACHER");
            ex2.createCell(4).setCellValue(1);
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
            ex3.createCell(0).setCellValue("phuhuynh.mau1@school.edu.vn");
            ex3.createCell(1).setCellValue("Lê Văn C");
            ex3.createCell(2).setCellValue("Password@123");
            ex3.createCell(3).setCellValue("PARENT");
            ex3.createCell(4).setCellValue(1);
            ex3.createCell(5).setCellValue("");
            ex3.createCell(6).setCellValue("");
            ex3.createCell(7).setCellValue("");
            ex3.createCell(8).setCellValue("0987654321");
            ex3.createCell(9).setCellValue("");
            ex3.createCell(10).setCellValue("Cha");
            ex3.createCell(11).setCellValue("");
            ex3.createCell(12).setCellValue("hocsinh.mau1@school.edu.vn");
            // Dòng 4: Phụ huynh mẫu 2
            fillRow(sheet.createRow(4), new String[]{ "phuhuynh.mau2@school.edu.vn", "Nguyễn Thị D", "Password@123", "PARENT", "1", "", "", "", "0911222333", "", "Mẹ", "", "hocsinh.mau1@school.edu.vn" });
            // Dòng 5: Phụ huynh mẫu 3
            fillRow(sheet.createRow(5), new String[]{ "phuhuynh.mau3@school.edu.vn", "Trần Văn E", "Password@123", "PARENT", "1", "", "", "", "0922333444", "", "Người giám hộ", "", "hs1@school.edu.vn" });

            // 5 giáo viên (dòng 6-10)
            String[][] teachers = {
                { "gv1@school.edu.vn", "Nguyễn Văn An", "Password@123", "TEACHER", "1", "", "", "Nam", "0901111111", "Tổ Toán", "", "Toán", "" },
                { "gv2@school.edu.vn", "Trần Thị Bình", "Password@123", "TEACHER", "1", "", "", "Nữ", "0902222222", "Tổ Văn", "", "Văn", "" },
                { "gv3@school.edu.vn", "Lê Văn Cường", "Password@123", "TEACHER", "1", "", "", "Nam", "0903333333", "Tổ Lý", "", "Lý", "" },
                { "gv4@school.edu.vn", "Phạm Thị Dung", "Password@123", "TEACHER", "1", "", "", "Nữ", "0904444444", "Tổ Hóa", "", "Hóa", "" },
                { "gv5@school.edu.vn", "Hoàng Văn Em", "Password@123", "TEACHER", "1", "", "", "Nam", "0905555555", "Tổ Anh", "", "Tiếng Anh", "" }
            };
            for (int t = 0; t < teachers.length; t++) {
                fillRow(sheet.createRow(6 + t), teachers[t]);
            }
            // 10 học sinh (dòng 11-20)
            String[][] students = {
                { "hs1@school.edu.vn", "Võ Thị Phương", "Password@123", "STUDENT", "1", "1", "2010-01-15", "Nữ", "", "", "", "", "" },
                { "hs2@school.edu.vn", "Đặng Văn Hùng", "Password@123", "STUDENT", "1", "1", "2010-02-20", "Nam", "", "", "", "", "" },
                { "hs3@school.edu.vn", "Bùi Thị Lan", "Password@123", "STUDENT", "1", "1", "2010-03-10", "Nữ", "", "", "", "", "" },
                { "hs4@school.edu.vn", "Phan Văn Minh", "Password@123", "STUDENT", "1", "1", "2010-04-05", "Nam", "", "", "", "", "" },
                { "hs5@school.edu.vn", "Vũ Thị Nga", "Password@123", "STUDENT", "1", "1", "2010-05-22", "Nữ", "", "", "", "", "" },
                { "hs6@school.edu.vn", "Tô Văn Quân", "Password@123", "STUDENT", "1", "1", "2010-06-18", "Nam", "", "", "", "", "" },
                { "hs7@school.edu.vn", "Chu Thị Hương", "Password@123", "STUDENT", "1", "1", "2010-07-30", "Nữ", "", "", "", "", "" },
                { "hs8@school.edu.vn", "Đinh Văn Tuấn", "Password@123", "STUDENT", "1", "1", "2010-08-12", "Nam", "", "", "", "", "" },
                { "hs9@school.edu.vn", "Lý Thị Mai", "Password@123", "STUDENT", "1", "1", "2010-09-25", "Nữ", "", "", "", "", "" },
                { "hs10@school.edu.vn", "Kim Văn Đức", "Password@123", "STUDENT", "1", "1", "2010-10-08", "Nam", "", "", "", "", "" }
            };
            for (int s = 0; s < students.length; s++) {
                Row r = sheet.createRow(11 + s);
                fillRow(r, students[s]);
            }

            // 2 học sinh mẫu thêm (lớp 2)
            fillRow(sheet.createRow(21), new String[]{ "hs11@school.edu.vn", "Trương Thị Hà", "Password@123", "STUDENT", "1", "2", "2010-11-01", "Nữ", "", "", "", "", "" });
            fillRow(sheet.createRow(22), new String[]{ "hs12@school.edu.vn", "Lâm Văn Khoa", "Password@123", "STUDENT", "1", "2", "2010-12-15", "Nam", "", "", "", "", "" });

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            try (FileOutputStream fos = new FileOutputStream(outPath)) {
                wb.write(fos);
            }
            System.out.println("Đã tạo file: " + outPath + " (3 PH mẫu, 1 GV mẫu, 1 HS mẫu, 5 GV, 12 HS)");
        }
    }

    private static void fillRow(Row r, String[] values) {
        for (int i = 0; i < values.length; i++) {
            Cell cell = r.createCell(i);
            String v = values[i];
            if ((i == 4 || i == 5) && v != null && !v.isEmpty()) {
                try {
                    cell.setCellValue(Integer.parseInt(v));
                } catch (NumberFormatException e) {
                    cell.setCellValue(v);
                }
            } else {
                cell.setCellValue(v != null ? v : "");
            }
        }
    }
}
