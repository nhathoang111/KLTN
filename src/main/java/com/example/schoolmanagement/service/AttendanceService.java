package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Attendance;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    public List<Attendance> getAttendance(Integer studentId, Integer classId, String date) {
        List<Attendance> attendance;

        if (studentId != null && classId != null) {
            attendance = attendanceRepository.findByStudentId(studentId);
            attendance = attendance.stream()
                .filter(a -> a.getClassEntity() != null && a.getClassEntity().getId().equals(classId))
                .toList();
        } else if (studentId != null) {
            attendance = attendanceRepository.findByStudentId(studentId);
        } else if (classId != null) {
            attendance = attendanceRepository.findByClassEntityId(classId);
        } else {
            attendance = attendanceRepository.findAll();
        }

        // TODO: handle date filter in future if needed
        return attendance;
    }

    public Attendance getAttendanceRecord(Integer id) {
        return attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance not found with id: " + id));
    }

    public Attendance createAttendance(Map<String, Object> attendanceData) {
        Attendance attendance = new Attendance();

        Object studentIdObj = attendanceData.get("studentId");
        Integer studentId = null;
        if (studentIdObj instanceof Integer) {
            studentId = (Integer) studentIdObj;
        } else if (studentIdObj instanceof String && !((String) studentIdObj).isEmpty()) {
            try {
                studentId = Integer.parseInt((String) studentIdObj);
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid student ID format");
            }
        }

        if (studentId != null) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new BadRequestException("Invalid student ID"));
            attendance.setStudent(student);
            attendance.setSchool(student.getSchool());
        }

        Object classIdObj = attendanceData.get("classId");
        Integer classId = null;
        if (classIdObj instanceof Integer) {
            classId = (Integer) classIdObj;
        } else if (classIdObj instanceof String && !((String) classIdObj).isEmpty()) {
            try {
                classId = Integer.parseInt((String) classIdObj);
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid class ID format");
            }
        }

        if (classId != null) {
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> new BadRequestException("Invalid class ID"));
            attendance.setClassEntity(classEntity);
        }

        String status = (String) attendanceData.get("status");
        if (status != null && (status.equals("PRESENT") || status.equals("ABSENT") || status.equals("LATE"))) {
            attendance.setStatus(status);
        } else {
            throw new BadRequestException("Invalid attendance status");
        }

        attendance.setAttendanceDate(LocalDateTime.now());
        attendance.setNote((String) attendanceData.get("note"));

        Attendance savedAttendance = attendanceRepository.save(attendance);

        log.info("Created attendance, ID: {}", savedAttendance.getId());

        return savedAttendance;
    }

    public Attendance updateAttendance(Integer id, Map<String, Object> attendanceData) {
        Attendance attendance = getAttendanceRecord(id);

        if (attendanceData.containsKey("studentId")) {
            Object studentIdObj = attendanceData.get("studentId");
            Integer studentId = null;
            if (studentIdObj instanceof Integer) {
                studentId = (Integer) studentIdObj;
            } else if (studentIdObj instanceof String && !((String) studentIdObj).isEmpty()) {
                try {
                    studentId = Integer.parseInt((String) studentIdObj);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Invalid student ID format");
                }
            }
            if (studentId != null) {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new BadRequestException("Invalid student ID"));
                attendance.setStudent(student);
                attendance.setSchool(student.getSchool());
            }
        }

        if (attendanceData.containsKey("classId")) {
            Object classIdObj = attendanceData.get("classId");
            Integer classId = null;
            if (classIdObj instanceof Integer) {
                classId = (Integer) classIdObj;
            } else if (classIdObj instanceof String && !((String) classIdObj).isEmpty()) {
                try {
                    classId = Integer.parseInt((String) classIdObj);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Invalid class ID format");
                }
            }
            if (classId != null) {
                ClassEntity classEntity = classRepository.findById(classId)
                        .orElseThrow(() -> new BadRequestException("Invalid class ID"));
                attendance.setClassEntity(classEntity);
            }
        }

        if (attendanceData.containsKey("status")) {
            String status = (String) attendanceData.get("status");
            if (status != null && (status.equals("PRESENT") || status.equals("ABSENT") || status.equals("LATE"))) {
                attendance.setStatus(status);
            } else {
                throw new BadRequestException("Invalid attendance status");
            }
        }

        if (attendanceData.containsKey("note")) {
            attendance.setNote((String) attendanceData.get("note"));
        }

        Attendance updatedAttendance = attendanceRepository.save(attendance);

        return updatedAttendance;
    }

    public void deleteAttendance(Integer id) {
        if (!attendanceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Attendance not found with id: " + id);
        }
        attendanceRepository.deleteById(id);
    }
}

