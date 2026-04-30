package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Enrollment;
import com.example.schoolmanagement.entity.EnrollmentHistory;
import com.example.schoolmanagement.repository.EnrollmentHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EnrollmentHistoryService {
    @Autowired
    private EnrollmentHistoryRepository enrollmentHistoryRepository;

    public void openHistoryForEnrollment(Enrollment enrollment, String status, String eventType, String eventNote) {
        if (enrollment == null || enrollment.getStudent() == null || enrollment.getClassEntity() == null) {
            return;
        }
        Integer enrollmentId = enrollment.getId();
        if (enrollmentId != null) {
            List<EnrollmentHistory> openRows = enrollmentHistoryRepository.findOpenByEnrollmentId(enrollmentId);
            if (!openRows.isEmpty()) {
                return;
            }
        }
        EnrollmentHistory h = new EnrollmentHistory();
        h.setEnrollment(enrollment);
        h.setStudent(enrollment.getStudent());
        h.setClassEntity(enrollment.getClassEntity());
        h.setSchool(enrollment.getSchool() != null ? enrollment.getSchool() : enrollment.getClassEntity().getSchool());
        h.setSchoolYear(enrollment.getClassEntity().getSchoolYear());
        h.setStatus(status);
        h.setEventType(eventType);
        h.setEventNote(eventNote);
        h.setStartedAt(LocalDateTime.now());
        h.setEndedAt(null);
        enrollmentHistoryRepository.save(h);
    }

    public void closeHistoryForEnrollment(Enrollment enrollment, String finalStatus, String eventType, String eventNote) {
        if (enrollment == null || enrollment.getStudent() == null || enrollment.getClassEntity() == null) {
            return;
        }
        List<EnrollmentHistory> openRows;
        if (enrollment.getId() != null) {
            openRows = enrollmentHistoryRepository.findOpenByEnrollmentId(enrollment.getId());
        } else {
            openRows = enrollmentHistoryRepository.findOpenByStudentIdAndClassId(
                    enrollment.getStudent().getId(),
                    enrollment.getClassEntity().getId()
            );
        }
        if (openRows.isEmpty()) {
            EnrollmentHistory h = new EnrollmentHistory();
            h.setEnrollment(enrollment);
            h.setStudent(enrollment.getStudent());
            h.setClassEntity(enrollment.getClassEntity());
            h.setSchool(enrollment.getSchool() != null ? enrollment.getSchool() : enrollment.getClassEntity().getSchool());
            h.setSchoolYear(enrollment.getClassEntity().getSchoolYear());
            h.setStatus(finalStatus);
            h.setEventType(eventType);
            h.setEventNote(eventNote);
            LocalDateTime now = LocalDateTime.now();
            h.setStartedAt(now);
            h.setEndedAt(now);
            enrollmentHistoryRepository.save(h);
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (EnrollmentHistory h : openRows) {
            h.setStatus(finalStatus);
            h.setEventType(eventType);
            h.setEventNote(eventNote);
            h.setEndedAt(now);
            enrollmentHistoryRepository.save(h);
        }
    }
}
