package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Record;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.RecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RecordService {

    @Autowired
    private RecordRepository recordRepository;

    public List<Record> getAllRecords() {
        return recordRepository.findAll();
    }

    public List<Record> getRecordsByStudent(Integer studentId) {
        return recordRepository.findByStudentId(studentId);
    }

    public List<Record> getRecordsByClass(Integer classId) {
        return recordRepository.findByClassEntityId(classId);
    }

    public List<Record> getRecordsByType(String type) {
        return recordRepository.findByType(type);
    }

    public List<Record> getRecordsByType(String type, Integer studentId, Integer classId, Integer subjectId) {
        return recordRepository.findAll(); // Simplified for now
    }

    public List<Record> getRecordsByTypeAndStudent(String type, Integer studentId) {
        return recordRepository.findAll(); // Simplified for now
    }

    public Record getRecordById(Integer id) {
        Optional<Record> optionalRecord = recordRepository.findById(id);
        return optionalRecord.orElseThrow(() -> new ResourceNotFoundException("Record not found with id: " + id));
    }

    public Record saveRecord(Record record) {
        return recordRepository.save(record);
    }

    public List<Record> getExamScores(Integer studentId, Integer classId, Integer subjectId) {
        return recordRepository.findAll(); // Simplified for now
    }

    public List<Record> getAttendanceRecords(Integer studentId, Integer classId) {
        return recordRepository.findAll(); // Simplified for now
    }

    public List<Record> getBehaviorRecords(Integer studentId, Integer classId) {
        return recordRepository.findAll(); // Simplified for now
    }

    public Record createRecord(Map<String, Object> recordData) {
        Record record = new Record();
        // Set properties from recordData
        record.setType((String) recordData.get("type"));
        // Set other properties as needed
        return recordRepository.save(record);
    }

    public Record updateRecord(Integer id, Map<String, Object> recordData) {
        Optional<Record> optionalRecord = recordRepository.findById(id);
        if (optionalRecord.isPresent()) {
            Record record = optionalRecord.get();
            record.setType((String) recordData.get("type"));
            return recordRepository.save(record);
        }
        throw new ResourceNotFoundException("Record not found");
    }

    public void deleteRecord(Integer id) {
        recordRepository.deleteById(id);
    }
}
