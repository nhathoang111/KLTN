-- =============================================================================
-- MIGRATION: Bảng liên kết giáo viên – môn học (n-n)
-- Một giáo viên có thể chọn nhiều môn.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `teacher_subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_teacher_subject` (`user_id`, `subject_id`),
  KEY `fk_ts_user` (`user_id`),
  KEY `fk_ts_subject` (`subject_id`),
  CONSTRAINT `fk_ts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ts_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
