package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Record;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.service.RecordService;
import com.example.schoolmanagement.repository.UserRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/behaviors")
@CrossOrigin(origins = "*")
public class BehaviorController {

    @Autowired
    private RecordService recordService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    @GetMapping
    public ResponseEntity<?> getBehaviors(@RequestParam(required = false) Integer studentId,
                                         @RequestParam(required = false) Integer classId) {
        List<Record> behaviors = recordService.getRecordsByType("BEHAVIOR", studentId, null, classId);
        return ResponseEntity.ok(Map.of("behaviors", behaviors));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getBehaviorsByStudent(@PathVariable Integer studentId) {
        List<Record> behaviors = recordService.getRecordsByTypeAndStudent("BEHAVIOR", studentId);
        return ResponseEntity.ok(Map.of("behaviors", behaviors));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getBehaviorsByClass(@PathVariable Integer classId) {
        List<Record> behaviors = recordService.getRecordsByType("BEHAVIOR", null, null, classId);
        return ResponseEntity.ok(Map.of("behaviors", behaviors));
    }

    @PostMapping
    public ResponseEntity<?> createBehavior(@RequestBody Map<String, Object> behaviorData) {
        Record record = new Record();
        record.setType("BEHAVIOR");

        // Set student
        Integer studentId = (Integer) behaviorData.get("studentId");
        if (studentId != null) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new BadRequestException("Invalid student ID"));
            record.setStudent(student);
            record.setSchool(student.getSchool());
        }

        // Set class
        Integer classId = (Integer) behaviorData.get("classId");
        if (classId != null) {
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID"));
            record.setClassEntity(classEntity);
        }

        // Set behavior type (POSITIVE, NEGATIVE, NEUTRAL)
        String behaviorType = (String) behaviorData.get("behaviorType");
        if (behaviorType != null && (behaviorType.equals("POSITIVE") || behaviorType.equals("NEGATIVE") || behaviorType.equals("NEUTRAL"))) {
            record.setStatus(behaviorType);
        } else {
            throw new BadRequestException("Invalid behavior type");
        }

        // Set date
        record.setDate(LocalDateTime.now());

        // Set note/description
        record.setNote((String) behaviorData.get("note"));

        Record savedRecord = recordService.saveRecord(record);

        return ResponseEntity.ok(Map.of(
            "message", "Behavior recorded successfully",
            "behavior", savedRecord
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBehavior(@PathVariable Integer id, @RequestBody Map<String, Object> behaviorData) {
        Record record = recordService.getRecordById(id);
        if (!"BEHAVIOR".equals(record.getType())) {
            throw new ResourceNotFoundException("Behavior record not found with id: " + id);
        }

        // Update behavior type
        if (behaviorData.containsKey("behaviorType")) {
            String behaviorType = (String) behaviorData.get("behaviorType");
            if (behaviorType != null && (behaviorType.equals("POSITIVE") || behaviorType.equals("NEGATIVE") || behaviorType.equals("NEUTRAL"))) {
                record.setStatus(behaviorType);
            } else {
                throw new BadRequestException("Invalid behavior type");
            }
        }

        // Update note
        if (behaviorData.containsKey("note")) {
            record.setNote((String) behaviorData.get("note"));
        }

        Record updatedRecord = recordService.saveRecord(record);

        return ResponseEntity.ok(Map.of(
            "message", "Behavior updated successfully",
            "behavior", updatedRecord
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBehavior(@PathVariable Integer id) {
        Record record = recordService.getRecordById(id);
        if (!"BEHAVIOR".equals(record.getType())) {
            throw new ResourceNotFoundException("Behavior record not found with id: " + id);
        }

        recordService.deleteRecord(id);

        return ResponseEntity.ok(Map.of("message", "Behavior deleted successfully"));
    }
}
