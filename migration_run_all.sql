-- =============================================================================
-- CHẠY TẤT CẢ MIGRATION LÊN DB CLOUD (đúng thứ tự)
-- Cách chạy:
--   mysql -h HOST -P PORT -u USER -p defaultdb < migration_run_all.sql
--   Hoặc mở từng block trong MySQL Workbench / DBeaver và Execute.
-- Nếu báo "Duplicate column name" / "Duplicate key" => bước đó đã chạy, bỏ qua.
-- DB do Hibernate tạo (đã có school_year_id): file này đã BỎ QUA PHẦN 1 của
--   consolidated (chuyển school_year string -> school_years). Nếu bạn có DB cũ
--   với cột classes.school_year, hãy chạy migration_consolidated.sql trước.
-- =============================================================================

-- ========== 1. USERS – thêm cột profile ==========
ALTER TABLE `users` ADD COLUMN `date_of_birth` DATE DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `gender` VARCHAR(20) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(30) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `department` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `subject_id` INT(11) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `relationship` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `users` ADD CONSTRAINT `fk_users_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;

-- ========== 2. TEACHER_SUBJECTS – bảng n-n giáo viên – môn học ==========
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

-- ========== 3. CONSOLIDATED (từ PHẦN 2, bỏ PHẦN 1) ==========
-- PHẦN 2: BẢNG CLASS_SECTIONS + class_section_id
CREATE TABLE IF NOT EXISTS `class_sections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_room_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `semester` varchar(50) DEFAULT NULL COMMENT 'HK1, HK2',
  `school_year` varchar(50) DEFAULT NULL COMMENT 'năm học',
  `status` varchar(50) DEFAULT NULL COMMENT 'trạng thái',
  PRIMARY KEY (`id`),
  KEY `fk_class_section_class_room` (`class_room_id`),
  KEY `fk_class_section_subject` (`subject_id`),
  KEY `fk_class_section_teacher` (`teacher_id`),
  CONSTRAINT `fk_class_section_class_room` FOREIGN KEY (`class_room_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_class_section_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_class_section_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `assignments`   ADD COLUMN `class_section_id` int(11) DEFAULT NULL;
ALTER TABLE `assignments`   ADD CONSTRAINT `fk_assignments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;
ALTER TABLE `enrollments`   ADD COLUMN `class_section_id` int(11) DEFAULT NULL;
ALTER TABLE `enrollments`   ADD CONSTRAINT `fk_enrollments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;
ALTER TABLE `exam_scores`   ADD COLUMN `class_section_id` int(11) DEFAULT NULL;
ALTER TABLE `exam_scores`   ADD CONSTRAINT `fk_exam_scores_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;
ALTER TABLE `attendance`    ADD COLUMN `class_section_id` int(11) DEFAULT NULL;
ALTER TABLE `attendance`   ADD CONSTRAINT `fk_attendance_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;
ALTER TABLE `schedules`    ADD COLUMN `class_section_id` int(11) DEFAULT NULL;
ALTER TABLE `schedules`    ADD CONSTRAINT `fk_schedules_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

-- PHẦN 3: SUBJECTS
ALTER TABLE `subjects` ADD COLUMN `status` varchar(20) DEFAULT 'ACTIVE' COMMENT 'ACTIVE hoặc INACTIVE';
ALTER TABLE `subjects` ADD COLUMN `deleted_at` datetime DEFAULT NULL COMMENT 'Khác NULL = đã xóa mềm';
UPDATE `subjects` SET status = 'ACTIVE' WHERE status IS NULL OR status NOT IN ('ACTIVE', 'INACTIVE');
ALTER TABLE `subjects`
  ADD UNIQUE KEY `uk_subjects_code_school` (`code`, `school_id`),
  ADD UNIQUE KEY `uk_subjects_name_school` (`name`, `school_id`);

-- PHẦN 4: ENROLLMENTS
ALTER TABLE `enrollments`
  ADD UNIQUE KEY `uk_enrollments_student_class` (`student_id`, `class_id`);

-- PHẦN 5: CLASS_SECTIONS
UPDATE `class_sections` SET semester = 'HK1' WHERE semester IN ('1', 'Học kỳ 1', 'HK1', '');
UPDATE `class_sections` SET semester = 'HK2' WHERE semester IN ('2', 'Học kỳ 2', 'HK2');
UPDATE `class_sections` SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
UPDATE `class_sections` SET status = 'INACTIVE' WHERE status NOT IN ('ACTIVE', 'INACTIVE');
ALTER TABLE `class_sections`
  ADD UNIQUE KEY `uk_class_sections_room_subject_semester_year` (`class_room_id`, `subject_id`, `semester`, `school_year`);

-- PHẦN 6: SCHEDULES
ALTER TABLE `schedules` ADD UNIQUE KEY `uk_schedules_class_date_period` (`class_id`, `date`, `period`);
ALTER TABLE `schedules` ADD UNIQUE KEY `uk_schedules_teacher_date_period` (`teacher_id`, `date`, `period`);

-- PHẦN 7: EXAM_SCORES
ALTER TABLE `exam_scores` ADD COLUMN `attempt` int(11) DEFAULT 1 COMMENT 'Lần thi (1, 2, ...)';
ALTER TABLE `exam_scores`
  ADD UNIQUE KEY `uk_exam_scores_student_subject_class_type_attempt` (`student_id`, `subject_id`, `class_id`, `score_type`, `attempt`);
ALTER TABLE `exam_scores`
  ADD KEY `idx_exam_scores_school_student` (`school_id`, `student_id`),
  ADD KEY `idx_exam_scores_student_subject` (`student_id`, `subject_id`),
  ADD KEY `idx_exam_scores_class_subject_type` (`class_id`, `subject_id`, `score_type`);

-- PHẦN 8: PARENT + parent_student
INSERT INTO `roles` (`school_id`, `name`, `description`)
SELECT s.`id`, CONCAT('PARENT_', UPPER(REPLACE(s.`code`, ' ', '_'))), 'Phụ huynh'
FROM `schools` s
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` r WHERE r.`school_id` = s.`id` AND r.`name` LIKE 'PARENT_%'
);

CREATE TABLE IF NOT EXISTS `parent_student` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_student` (`parent_id`,`student_id`),
  KEY `fk_ps_parent` (`parent_id`),
  KEY `fk_ps_student` (`student_id`),
  KEY `fk_ps_school` (`school_id`),
  CONSTRAINT `fk_ps_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- KẾT THÚC
-- =============================================================================
