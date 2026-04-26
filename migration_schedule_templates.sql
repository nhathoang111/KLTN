-- =============================================================================
-- SCHEDULE TEMPLATES
-- TKB mẫu theo lớp + tuần mốc, dùng để sinh TKB cả học kỳ
-- =============================================================================

CREATE TABLE IF NOT EXISTS `schedule_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `class_section_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `week_start` date NOT NULL COMMENT 'Thứ 2 của tuần mẫu',
  `date` date NOT NULL COMMENT 'Ngày cụ thể trong tuần mẫu',
  `day_of_week` int(11) DEFAULT NULL COMMENT '1=Thứ 2 ... 6=Thứ 7',
  `period` int(11) NOT NULL COMMENT 'Tiết 1-10',
  `room` varchar(255) DEFAULT NULL,
  `fixed_activity_code` varchar(16) DEFAULT NULL COMMENT 'CHAOCO/SHL nếu là tiết cố định',
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_templates_class_week_date_period` (`class_id`, `week_start`, `date`, `period`),
  KEY `idx_schedule_templates_class_week` (`class_id`, `week_start`),
  KEY `idx_schedule_templates_school_class` (`school_id`, `class_id`),
  KEY `idx_schedule_templates_teacher_date_period` (`teacher_id`, `date`, `period`),
  CONSTRAINT `fk_schedule_templates_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_templates_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_templates_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_schedule_templates_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_schedule_templates_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
