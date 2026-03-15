package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.service.SchoolService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schools")
@CrossOrigin(origins = "*")
public class SchoolController {

    @Autowired
    private SchoolService schoolService;

    @GetMapping
    public ResponseEntity<?> getSchools() {
        List<School> schools = schoolService.getAllSchools();
        return ResponseEntity.ok(Map.of("schools", schools));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSchool(@PathVariable Integer id) {
        School school = schoolService.getSchoolWithStats(id);
        return ResponseEntity.ok(school);
    }

    @GetMapping("/{id}/related-data")
    public ResponseEntity<?> getSchoolRelatedData(@PathVariable Integer id) {
        schoolService.getSchoolById(id);
        Map<String, Object> relatedData = schoolService.getSchoolRelatedData(id);
        return ResponseEntity.ok(relatedData);
    }

    @PostMapping
    public ResponseEntity<?> createSchool(@RequestBody School school) {
        School savedSchool = schoolService.createSchool(school);
        return ResponseEntity.ok(Map.of(
                "message", "School created successfully",
                "school", savedSchool
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchool(@PathVariable Integer id, @RequestBody School school) {
        School updatedSchool = schoolService.updateSchool(id, school);
        return ResponseEntity.ok(Map.of(
                "message", "School updated successfully",
                "school", updatedSchool
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchool(@PathVariable Integer id) {
        schoolService.deleteSchool(id);
        return ResponseEntity.ok(Map.of("message", "Xóa trường học thành công"));
    }

    /** Chỉ xóa toàn bộ dữ liệu liên quan (người dùng, lớp, môn, ...), không xóa bản ghi trường. */
    @DeleteMapping("/{id}/related-data")
    public ResponseEntity<?> deleteAllRelatedDataOnly(@PathVariable Integer id) {
        schoolService.deleteAllRelatedDataOnly(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa toàn bộ dữ liệu liên quan. Trường học vẫn giữ nguyên."));
    }
}
