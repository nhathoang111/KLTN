package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Record;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.Subject;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.repository.RecordRepository;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SubjectRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/records")
@CrossOrigin(origins = "*")
public class RecordController {

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @GetMapping
    public ResponseEntity<?> getRecords(@RequestParam(required = false) Integer schoolId,
                                       @RequestParam(required = false) Integer classId,
                                       @RequestParam(required = false) Integer studentId) {
        try {
            List<Record> records;
            if (studentId != null) {
                records = recordRepository.findByStudentId(studentId);
            } else if (classId != null) {
                records = recordRepository.findByClassEntityId(classId);
            } else if (schoolId != null) {
                records = recordRepository.findBySchoolId(schoolId);
            } else {
                records = recordRepository.findAll();
            }
            return ResponseEntity.ok(Map.of("records", records));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch records"));
        }
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getRecordsBySchool(@PathVariable Integer schoolId) {
        try {
            List<Record> records = recordRepository.findBySchoolId(schoolId);
            return ResponseEntity.ok(Map.of("records", records));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch records by school"));
        }
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getRecordsByClass(@PathVariable Integer classId) {
        try {
            List<Record> records = recordRepository.findByClassEntityId(classId);
            return ResponseEntity.ok(Map.of("records", records));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch records by class"));
        }
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getRecordsByStudent(@PathVariable Integer studentId) {
        try {
            List<Record> records = recordRepository.findByStudentId(studentId);
            return ResponseEntity.ok(Map.of("records", records));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch records by student"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRecord(@PathVariable Integer id) {
        try {
            Optional<Record> record = recordRepository.findById(id);
            if (record.isPresent()) {
                return ResponseEntity.ok(record.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch record"));
        }
    }

    @PostMapping
    public ResponseEntity<?> createRecord(@RequestBody Map<String, Object> recordData) {
        try {
            Record record = new Record();
            
            // Set basic fields
            record.setType((String) recordData.get("type"));
            record.setNote((String) recordData.get("note"));
            record.setStatus((String) recordData.get("status"));
            record.setDate(LocalDateTime.now());
            
            // Set value if provided
            if (recordData.get("value") != null) {
                record.setValue(((Number) recordData.get("value")).doubleValue());
            }
            
            // Set school
            Integer schoolId = (Integer) recordData.get("schoolId");
            if (schoolId != null) {
                Optional<School> school = schoolRepository.findById(schoolId);
                if (school.isPresent()) {
                    record.setSchool(school.get());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid school ID"));
                }
            }
            
            // Set class
            Integer classId = (Integer) recordData.get("classId");
            if (classId != null) {
                Optional<ClassEntity> classEntity = classRepository.findById(classId);
                if (classEntity.isPresent()) {
                    record.setClassEntity(classEntity.get());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid class ID"));
                }
            }
            
            // Set student
            Integer studentId = (Integer) recordData.get("studentId");
            if (studentId != null) {
                Optional<User> student = userRepository.findById(studentId);
                if (student.isPresent()) {
                    record.setStudent(student.get());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid student ID"));
                }
            }
            
            // Set subject
            Integer subjectId = (Integer) recordData.get("subjectId");
            if (subjectId != null) {
                Optional<Subject> subject = subjectRepository.findById(subjectId);
                if (subject.isPresent()) {
                    record.setSubject(subject.get());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid subject ID"));
                }
            }
            
            // Set actor (teacher/admin who created the record)
            Integer actorId = (Integer) recordData.get("actorId");
            if (actorId != null) {
                Optional<User> actor = userRepository.findById(actorId);
                if (actor.isPresent()) {
                    record.setActor(actor.get());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid actor ID"));
                }
            }
            
            // Validation
            if (record.getType() == null || record.getType().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Record type is required"));
            }
            
            Record savedRecord = recordRepository.save(record);
            
            return ResponseEntity.ok(Map.of(
                "message", "Record created successfully",
                "record", savedRecord
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to create record: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRecord(@PathVariable Integer id, @RequestBody Map<String, Object> recordData) {
        try {
            Optional<Record> recordOpt = recordRepository.findById(id);
            if (!recordOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Record record = recordOpt.get();
            
            // Update fields
            if (recordData.containsKey("type")) {
                record.setType((String) recordData.get("type"));
            }
            if (recordData.containsKey("value")) {
                record.setValue(((Number) recordData.get("value")).doubleValue());
            }
            if (recordData.containsKey("note")) {
                record.setNote((String) recordData.get("note"));
            }
            if (recordData.containsKey("status")) {
                record.setStatus((String) recordData.get("status"));
            }
            
            Record updatedRecord = recordRepository.save(record);
            
            return ResponseEntity.ok(Map.of(
                "message", "Record updated successfully",
                "record", updatedRecord
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to update record: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRecord(@PathVariable Integer id) {
        try {
            Optional<Record> record = recordRepository.findById(id);
            if (!record.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            recordRepository.deleteById(id);
            
            return ResponseEntity.ok(Map.of("message", "Record deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to delete record: " + e.getMessage()));
        }
    }
}
