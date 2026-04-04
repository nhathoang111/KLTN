package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Announcement;
import com.example.schoolmanagement.service.AnnouncementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "*")
public class AnnouncementController {

    private static final Logger log = LoggerFactory.getLogger(AnnouncementController.class);

    @Autowired
    private AnnouncementService announcementService;

    @GetMapping
    public ResponseEntity<?> getAnnouncements(@RequestParam(required = false) Integer schoolId,
                                             @RequestParam(required = false) Integer classId,
                                             @RequestParam(required = false) Integer recipientUserId) {
        List<Announcement> announcements = announcementService.getAnnouncements(schoolId, classId, recipientUserId);

        if (log.isDebugEnabled()) {
            for (Announcement ann : announcements) {
                if (ann.getCreatedBy() != null) {
                    log.debug("Announcement ID: {}, Creator: {}, Creator Role: {}",
                            ann.getId(),
                            ann.getCreatedBy().getFullName(),
                            ann.getCreatedBy().getRole() != null ? ann.getCreatedBy().getRole().getName() : "NULL");
                }
            }
        }

        return ResponseEntity.ok(Map.of("announcements", announcements));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getAnnouncementsBySchool(@PathVariable Integer schoolId) {
        List<Announcement> announcements = announcementService.getAnnouncementsBySchool(schoolId);
        return ResponseEntity.ok(Map.of("announcements", announcements));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getAnnouncementsByClass(@PathVariable Integer classId) {
        List<Announcement> announcements = announcementService.getAnnouncementsByClass(classId);
        return ResponseEntity.ok(Map.of("announcements", announcements));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAnnouncement(@PathVariable Integer id) {
        Announcement announcement = announcementService.getAnnouncementById(id);
        return ResponseEntity.ok(announcement);
    }

    @PostMapping
    public ResponseEntity<?> createAnnouncement(@RequestBody Map<String, Object> announcementData) {
        log.debug("Creating announcement, received data: {}", announcementData);

        Announcement savedAnnouncement = announcementService.createAnnouncement(announcementData);
        log.info("Announcement created successfully with ID: {}", savedAnnouncement.getId());

        return ResponseEntity.ok(Map.of(
            "message", "Announcement created successfully",
            "announcement", savedAnnouncement
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Integer id, 
                                                 @RequestBody Map<String, Object> announcementData,
                                                 @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
                                                 @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        Announcement updatedAnnouncement = announcementService.updateAnnouncement(id, announcementData, currentUserId, currentUserRole);

        return ResponseEntity.ok(Map.of(
            "message", "Announcement updated successfully",
            "announcement", updatedAnnouncement
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Integer id,
                                                  @RequestHeader(value = "X-User-Id", required = false) Integer currentUserId,
                                                  @RequestHeader(value = "X-User-Role", required = false) String currentUserRole) {
        announcementService.deleteAnnouncement(id, currentUserId, currentUserRole);

        return ResponseEntity.ok(Map.of("message", "Announcement deleted successfully"));
    }
}
