package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Announcement;
import com.example.schoolmanagement.entity.ClassEntity;
import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.AnnouncementRepository;
import com.example.schoolmanagement.repository.ClassRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassRepository classRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    public List<Announcement> getAnnouncements(Integer schoolId, Integer classId, Integer recipientUserId) {
        if (recipientUserId != null) {
            return announcementRepository.findByRecipientUserId(recipientUserId);
        }
        if (classId != null) {
            return announcementRepository.findByClassEntityId(classId);
        } else if (schoolId != null) {
            return announcementRepository.findBySchoolId(schoolId);
        } else {
            return announcementRepository.findAll();
        }
    }

    public List<Announcement> getAnnouncementsBySchool(Integer schoolId) {
        return announcementRepository.findBySchoolId(schoolId);
    }

    public List<Announcement> getAnnouncementsByClass(Integer classId) {
        return announcementRepository.findByClassEntityId(classId);
    }

    public Announcement getAnnouncementById(Integer id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found with id: " + id));
    }

    public Announcement createAnnouncement(Map<String, Object> announcementData) {
        Announcement announcement = new Announcement();

        String title = (String) announcementData.get("title");
        String content = (String) announcementData.get("content");

        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Tiêu đề không được để trống");
        }
        if (content == null || content.trim().isEmpty()) {
            throw new BadRequestException("Nội dung không được để trống");
        }

        announcement.setTitle(title.trim());
        announcement.setContent(content.trim());
        announcement.setCreatedAt(LocalDateTime.now());

        // Helper: schoolId
        Integer schoolId = null;
        Object schoolIdObj = announcementData.get("schoolId");
        if (schoolIdObj != null) {
            if (schoolIdObj instanceof Integer) {
                schoolId = (Integer) schoolIdObj;
            } else if (schoolIdObj instanceof String) {
                String str = ((String) schoolIdObj).trim();
                if (!str.isEmpty()) {
                    try {
                        schoolId = Integer.parseInt(str);
                    } catch (NumberFormatException e) {
                        // ignore
                    }
                }
            } else if (schoolIdObj instanceof Number) {
                schoolId = ((Number) schoolIdObj).intValue();
            }
        }

        if (schoolId != null) {
            School school = schoolRepository.findById(schoolId).orElse(null);
            if (school == null) {
                throw new BadRequestException("Không tìm thấy trường học với ID: " + schoolId);
            }
            announcement.setSchool(school);
        } else {
            throw new BadRequestException("Trường học là bắt buộc");
        }

        // classId (optional)
        Integer classId = null;
        Object classIdObj = announcementData.get("classId");
        if (classIdObj != null) {
            if (classIdObj instanceof Integer) {
                classId = (Integer) classIdObj;
            } else if (classIdObj instanceof String) {
                String str = ((String) classIdObj).trim();
                if (!str.isEmpty()) {
                    try {
                        classId = Integer.parseInt(str);
                    } catch (NumberFormatException e) {
                        // ignore
                    }
                }
            } else if (classIdObj instanceof Number) {
                classId = ((Number) classIdObj).intValue();
            }
        }

        if (classId != null) {
            ClassEntity classEntity = classRepository.findById(classId).orElse(null);
            if (classEntity == null) {
                throw new BadRequestException("Không tìm thấy lớp học với ID: " + classId);
            }
            announcement.setClassEntity(classEntity);
        }

        // createdById
        Integer createdById = null;
        Object createdByIdObj = announcementData.get("createdById");
        if (createdByIdObj != null) {
            if (createdByIdObj instanceof Integer) {
                createdById = (Integer) createdByIdObj;
            } else if (createdByIdObj instanceof String) {
                String str = ((String) createdByIdObj).trim();
                if (!str.isEmpty()) {
                    try {
                        createdById = Integer.parseInt(str);
                    } catch (NumberFormatException e) {
                        // ignore
                    }
                }
            } else if (createdByIdObj instanceof Number) {
                createdById = ((Number) createdByIdObj).intValue();
            }
        }

        if (createdById != null) {
            User createdBy = userRepository.findById(createdById).orElse(null);
            if (createdBy == null) {
                throw new BadRequestException("Không tìm thấy người tạo với ID: " + createdById);
            }
            announcement.setCreatedBy(createdBy);
        } else {
            throw new BadRequestException("Người tạo là bắt buộc");
        }

        // recipientUserId (optional)
        Integer recipientUserId = null;
        Object recipientUserIdObj = announcementData.get("recipientUserId");
        if (recipientUserIdObj != null) {
            if (recipientUserIdObj instanceof Integer) {
                recipientUserId = (Integer) recipientUserIdObj;
            } else if (recipientUserIdObj instanceof String) {
                String str = ((String) recipientUserIdObj).trim();
                if (!str.isEmpty()) {
                    try {
                        recipientUserId = Integer.parseInt(str);
                    } catch (NumberFormatException ignored) {}
                }
            } else if (recipientUserIdObj instanceof Number) {
                recipientUserId = ((Number) recipientUserIdObj).intValue();
            }
        }
        if (recipientUserId != null) {
            User recipient = userRepository.findById(recipientUserId).orElse(null);
            if (recipient == null) {
                throw new BadRequestException("Không tìm thấy người nhận với ID: " + recipientUserId);
            }
            announcement.setRecipientUser(recipient);
        }

        return announcementRepository.save(announcement);
    }

    public Announcement updateAnnouncement(
            Integer id,
            Map<String, Object> announcementData,
            Integer currentUserId,
            String currentUserRole) {

        Announcement announcement = getAnnouncementById(id);

        // Check if announcement was created by ADMIN
        if (announcement.getCreatedBy() != null && announcement.getCreatedBy().getRole() != null) {
            String creatorRole = announcement.getCreatedBy().getRole().getName().toUpperCase();

            if ("ADMIN".equals(creatorRole)) {
                String userRole = currentUserRole;
                if (userRole != null) {
                    userRole = userRole.toUpperCase();
                }

                if (userRole == null && currentUserId != null) {
                    Optional<User> currentUser = userRepository.findById(currentUserId);
                    if (currentUser.isPresent() && currentUser.get().getRole() != null) {
                        userRole = currentUser.get().getRole().getName().toUpperCase();
                    }
                }

                if (userRole != null && "TEACHER".equals(userRole)) {
                    throw new BadRequestException("Bạn không thể chỉnh sửa thông báo từ Admin");
                }

                if (userRole != null && !"ADMIN".equals(userRole) && !"SUPER_ADMIN".equals(userRole)) {
                    throw new BadRequestException("Bạn không thể chỉnh sửa thông báo từ Admin");
                }

                if (userRole == null) {
                    throw new BadRequestException("Bạn không thể chỉnh sửa thông báo từ Admin");
                }
            }
        }

        if (announcementData.containsKey("title")) {
            announcement.setTitle((String) announcementData.get("title"));
        }
        if (announcementData.containsKey("content")) {
            announcement.setContent((String) announcementData.get("content"));
        }

        return announcementRepository.save(announcement);
    }

    public void deleteAnnouncement(Integer id, Integer currentUserId, String currentUserRole) {
        Announcement announcement = getAnnouncementById(id);

        if (announcement.getCreatedBy() != null && announcement.getCreatedBy().getRole() != null) {
            String creatorRole = announcement.getCreatedBy().getRole().getName().toUpperCase();

            if ("ADMIN".equals(creatorRole)) {
                String userRole = currentUserRole;
                if (userRole != null) {
                    userRole = userRole.toUpperCase();
                }

                if (userRole == null && currentUserId != null) {
                    Optional<User> currentUser = userRepository.findById(currentUserId);
                    if (currentUser.isPresent() && currentUser.get().getRole() != null) {
                        userRole = currentUser.get().getRole().getName().toUpperCase();
                    }
                }

                if (userRole != null && "TEACHER".equals(userRole)) {
                    throw new BadRequestException("Bạn không thể xóa thông báo từ Admin");
                }

                if (userRole != null && !"ADMIN".equals(userRole) && !"SUPER_ADMIN".equals(userRole)) {
                    throw new BadRequestException("Bạn không thể xóa thông báo từ Admin");
                }

                if (userRole == null) {
                    throw new BadRequestException("Bạn không thể xóa thông báo từ Admin");
                }
            }
        }

        announcementRepository.deleteById(id);
    }
}

