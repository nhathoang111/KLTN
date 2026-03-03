-- =============================================================================
-- MIGRATION: Bổ sung cột users theo role
-- STUDENT: date_of_birth, gender
-- TEACHER: subject_id (bộ môn), phone, department
-- PARENT: phone, relationship
-- Chạy lần lượt; nếu báo Duplicate column name / Duplicate key thì đã có, bỏ qua.
-- =============================================================================

ALTER TABLE `users` ADD COLUMN `date_of_birth` DATE DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `gender` VARCHAR(20) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(30) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `department` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `subject_id` INT(11) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `relationship` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `users` ADD CONSTRAINT `fk_users_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;
