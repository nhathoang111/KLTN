package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Attendance;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.dto.attendance.AttendanceBulkRequest;
import com.example.schoolmanagement.dto.attendance.AttendanceBulkResponse;
import com.example.schoolmanagement.dto.attendance.AttendanceGetResponse;
import com.example.schoolmanagement.dto.attendance.AttendanceItemDto;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.AttendanceRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import com.example.schoolmanagement.repository.EnrollmentRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

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

        if (date != null && !date.isBlank()) {
            LocalDate targetDate = parseDateOnly(date);
            attendance = attendance.stream()
                .filter(a -> {
                    if (a.getAttendanceDate() == null) return false;
                    return a.getAttendanceDate().toLocalDate().equals(targetDate);
                })
                .toList();
        }

        return attendance;
    }

    /**
     * API chính cho admin: lấy điểm danh theo classSection + date.
     * - Nếu đã có attendance: trả về để chỉnh sửa.
     * - Nếu chưa có: trả về roster học sinh với status mặc định (PRESENT).
     * - Không tạo draft trong DB.
     */
    public AttendanceGetResponse getAttendanceByClassSectionAndDate(Integer classSectionId, String dateStr) {
        if (classSectionId == null) throw new BadRequestException("classSectionId is required");
        LocalDate date = parseDateOnly(dateStr);

        ClassSection classSection = classSectionRepository.findByIdFetchClassRoomAndSchool(classSectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Class section not found with id: " + classSectionId));
        ClassEntity cls = classSection.getClassRoom();
        if (cls == null || cls.getId() == null) throw new BadRequestException("Class section is missing class");
        Integer classId = cls.getId();

        // roster: học sinh ACTIVE trong lớp
        var enrollments = enrollmentRepository.findActiveEnrollmentsByClassId(classId);
        Set<Integer> rosterStudentIds = new HashSet<>();
        List<User> rosterStudents = new ArrayList<>();
        for (var e : enrollments) {
            if (e.getStudent() != null && e.getStudent().getId() != null) {
                rosterStudentIds.add(e.getStudent().getId());
                rosterStudents.add(e.getStudent());
            }
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        List<Attendance> existing = attendanceRepository
                .findByClassSectionIdAndAttendanceDateBetweenFetchStudent(classSectionId, start, end);

        Map<Integer, Attendance> existingByStudentId = new HashMap<>();
        for (Attendance a : existing) {
            if (a.getStudent() != null && a.getStudent().getId() != null) {
                existingByStudentId.put(a.getStudent().getId(), a);
            }
        }

        List<AttendanceItemDto> items = new ArrayList<>();
        for (User s : rosterStudents) {
            Attendance a = existingByStudentId.get(s.getId());
            if (a != null) {
                items.add(new AttendanceItemDto(
                        a.getId(),
                        classSectionId,
                        s.getId(),
                        s.getFullName(),
                        s.getEmail(),
                        a.getStatus(),
                        a.getNote()
                ));
            } else {
                items.add(new AttendanceItemDto(
                        null,
                        classSectionId,
                        s.getId(),
                        s.getFullName(),
                        s.getEmail(),
                        "PRESENT",
                        null
                ));
            }
        }

        return new AttendanceGetResponse(classSectionId, classId, date.toString(), items);
    }

    /**
     * Lấy điểm danh cho học sinh xem (tránh lỗi Lazy Loading bằng cách map sang DTO)
     */
    public AttendanceGetResponse getAttendanceForStudentView(Integer studentId, String dateStr) {
        if (studentId == null) throw new BadRequestException("studentId is required");
        LocalDate date = parseDateOnly(dateStr);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<Attendance> attendanceList = attendanceRepository.findByStudentId(studentId).stream()
                .filter(a -> a.getAttendanceDate() != null && 
                        !a.getAttendanceDate().isBefore(start) && 
                        !a.getAttendanceDate().isAfter(end))
                .toList();

        List<AttendanceItemDto> items = attendanceList.stream().map(a -> new AttendanceItemDto(
                a.getId(),
                a.getClassSection() != null ? a.getClassSection().getId() : null,
                studentId,
                a.getStudent() != null ? a.getStudent().getFullName() : null,
                a.getStudent() != null ? a.getStudent().getEmail() : null,
                a.getStatus(),
                a.getNote()
        )).toList();

        return new AttendanceGetResponse(null, null, date.toString(), items);
    }

    /**
     * Bulk upsert attendance theo roster lớp.
     * Validate:
     * - class_section tồn tại
     * - student thuộc lớp (enrollments ACTIVE)
     */
    @org.springframework.transaction.annotation.Transactional
    public AttendanceBulkResponse saveBulk(AttendanceBulkRequest req, Integer markingTeacherId) {
        if (req == null) throw new BadRequestException("Request body is required");
        if (req.getClassSectionId() == null) throw new BadRequestException("classSectionId is required");
        LocalDate date = parseDateOnly(req.getAttendanceDate());
        if (req.getItems() == null) throw new BadRequestException("items is required");

        ClassSection classSection = classSectionRepository.findByIdFetchClassRoomAndSchool(req.getClassSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Class section not found with id: " + req.getClassSectionId()));
        if (classSection.getTeacher() == null || classSection.getTeacher().getId() == null || markingTeacherId == null
                || !markingTeacherId.equals(classSection.getTeacher().getId())) {
            throw new ForbiddenException("Access denied");
        }
        ClassEntity cls = classSection.getClassRoom();
        if (cls == null || cls.getId() == null) throw new BadRequestException("Class section is missing class");

        Integer classId = cls.getId();
        var enrollments = enrollmentRepository.findActiveEnrollmentsByClassId(classId);
        Set<Integer> rosterStudentIds = new HashSet<>();
        for (var e : enrollments) {
            if (e.getStudent() != null && e.getStudent().getId() != null) {
                rosterStudentIds.add(e.getStudent().getId());
            }
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        List<Attendance> existing = attendanceRepository
                .findByClassSectionIdAndAttendanceDateBetweenFetchStudent(req.getClassSectionId(), start, end);
        Map<Integer, Attendance> existingByStudentId = new HashMap<>();
        for (Attendance a : existing) {
            if (a.getStudent() != null && a.getStudent().getId() != null) {
                existingByStudentId.put(a.getStudent().getId(), a);
            }
        }

        List<AttendanceItemDto> savedDtos = new ArrayList<>();
        int savedCount = 0;
        for (AttendanceBulkRequest.AttendanceBulkRequestItem item : req.getItems()) {
            if (item == null) continue;
            Integer studentId = item.getStudentId();
            if (studentId == null) throw new BadRequestException("studentId is required in items");
            if (!rosterStudentIds.contains(studentId)) {
                throw new BadRequestException("Student " + studentId + " is not in this class");
            }
            String status = normalizeStatus(item.getStatus());
            String note = item.getNote();

            Attendance a = existingByStudentId.get(studentId);
            if (a == null) {
                a = new Attendance();
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new BadRequestException("Invalid student ID: " + studentId));
                a.setStudent(student);
                a.setClassEntity(cls);
                a.setClassSection(classSection);
                a.setSchool(cls.getSchool());
                // Lưu theo ngày (không tạo draft): set 12:00 để ổn định, filter theo date vẫn đúng
                a.setAttendanceDate(LocalDateTime.of(date, LocalTime.NOON));
                a.setCreatedAt(LocalDateTime.now());
            }
            a.setStatus(status);
            a.setNote(note);
            a.setUpdatedAt(LocalDateTime.now());
            Attendance saved = attendanceRepository.save(a);
            savedCount++;

            savedDtos.add(new AttendanceItemDto(
                    saved.getId(),
                    req.getClassSectionId(),
                    studentId,
                    saved.getStudent() != null ? saved.getStudent().getFullName() : null,
                    saved.getStudent() != null ? saved.getStudent().getEmail() : null,
                    saved.getStatus(),
                    saved.getNote()
            ));
        }

        return new AttendanceBulkResponse("Saved attendance", savedCount, savedDtos);
    }

    private static LocalDate parseDateOnly(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            throw new BadRequestException("date is required (YYYY-MM-DD)");
        }
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (Exception e) {
            throw new BadRequestException("Invalid date format. Use YYYY-MM-DD. Received: " + dateStr);
        }
    }

    private static String normalizeStatus(String raw) {
        String s = raw == null ? "" : raw.trim().toUpperCase();
        if (s.isBlank()) return "PRESENT";
        return switch (s) {
            case "PRESENT", "ABSENT", "LATE", "EXCUSED" -> s;
            default -> throw new BadRequestException("Invalid attendance status: " + raw);
        };
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
        attendance.setStatus(normalizeStatus(status));

        attendance.setAttendanceDate(LocalDateTime.now());
        attendance.setNote((String) attendanceData.get("note"));

        Attendance savedAttendance = attendanceRepository.save(attendance);

        log.info("Created attendance, ID: {}", savedAttendance.getId());

        return savedAttendance;
    }

    @org.springframework.transaction.annotation.Transactional
    public Attendance updateAttendance(Integer id, Map<String, Object> attendanceData, Integer markingTeacherId) {
        Attendance attendance = getAttendanceRecord(id);
        if (attendance.getClassSection() == null || attendance.getClassSection().getTeacher() == null
                || attendance.getClassSection().getTeacher().getId() == null || markingTeacherId == null
                || !markingTeacherId.equals(attendance.getClassSection().getTeacher().getId())) {
            throw new ForbiddenException("Access denied");
        }

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
            attendance.setStatus(normalizeStatus(status));
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
