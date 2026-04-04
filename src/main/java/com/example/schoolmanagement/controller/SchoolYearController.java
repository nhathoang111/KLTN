package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.SchoolYear;
import com.example.schoolmanagement.repository.SchoolYearRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school-years")
@CrossOrigin(origins = "*")
public class SchoolYearController {

    @Autowired
    private SchoolYearRepository schoolYearRepository;

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getBySchool(@PathVariable Integer schoolId) {
        List<SchoolYear> list = schoolYearRepository.findBySchoolId(schoolId);
        return ResponseEntity.ok(Map.of("schoolYears", list));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(Map.of("schoolYears", schoolYearRepository.findAll()));
    }
}
