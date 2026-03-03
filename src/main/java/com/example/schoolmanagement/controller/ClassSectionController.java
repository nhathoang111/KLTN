package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.service.ClassSectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/class-sections")
@CrossOrigin(origins = "*")
public class ClassSectionController {

    @Autowired
    private ClassSectionService classSectionService;

    @GetMapping
    public ResponseEntity<?> getAll() {
        List<ClassSection> list = classSectionService.getAll();
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Integer id) {
        ClassSection cs = classSectionService.getById(id);
        return ResponseEntity.ok(cs);
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getBySchool(@PathVariable Integer schoolId) {
        List<ClassSection> list = classSectionService.getBySchoolId(schoolId);
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @GetMapping("/class/{classRoomId}")
    public ResponseEntity<?> getByClassRoom(@PathVariable Integer classRoomId) {
        List<ClassSection> list = classSectionService.getByClassRoomId(classRoomId);
        return ResponseEntity.ok(Map.of("classSections", list));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<?> getByTeacher(@PathVariable Integer teacherId) {
        List<ClassSection> list = classSectionService.getByTeacherId(teacherId);
        return ResponseEntity.ok(Map.of("classSections", list));
    }
}
