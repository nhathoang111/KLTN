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
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            try (FileOutputStream fos = new FileOutputStream(outPath)) {
                wb.write(fos);
            }
            System.out.println("Đã tạo file: " + outPath);
        }
    }
}
