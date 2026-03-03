INSERT INTO `school_years` (`school_id`, `name`, `status`)
SELECT DISTINCT c.school_id, c.school_year, 'ACTIVE'
FROM `classes` c
WHERE c.school_year IS NOT NULL 
  AND c.school_year <> ''
  AND NOT EXISTS (
      SELECT 1 
      FROM school_years sy 
      WHERE sy.school_id = c.school_id 
        AND sy.name = c.school_year COLLATE utf8mb4_unicode_ci
  );

UPDATE `classes` c
JOIN `school_years` sy 
  ON sy.school_id = c.school_id 
 AND sy.name = c.school_year COLLATE utf8mb4_unicode_ci
SET c.school_year_id = sy.id
WHERE c.school_year IS NOT NULL 
  AND c.school_year <> '';

ALTER TABLE `classes`
  DROP COLUMN `school_year`,
  ADD CONSTRAINT `fk_classes_school_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE SET NULL;

-- Kiểm tra trùng: SELECT name, school_year_id, school_id, COUNT(*) FROM classes WHERE school_year_id IS NOT NULL GROUP BY name, school_year_id, school_id HAVING COUNT(*) > 1;
ALTER TABLE `classes`
  ADD UNIQUE KEY `uk_classes_name_school_year_school` (`name`, `school_year_id`, `school_id`);


-- ############################################################################
-- PHẦN 2: BẢNG CLASS_SECTIONS (phân công lớp-môn) + THÊM class_section_id VÀO CÁC BẢNG
-- ############################################################################
-- Tạo bảng class_sections nếu chưa có
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

-- Thêm cột class_section_id và FK vào các bảng (bỏ qua nếu cột đã tồn tại)
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


-- ############################################################################
-- PHẦN 3: SUBJECTS - status, xóa mềm (deleted_at), unique (code, school_id), (name, school_id)
-- ############################################################################
ALTER TABLE `subjects` ADD COLUMN `status` varchar(20) DEFAULT 'ACTIVE' COMMENT 'ACTIVE hoặc INACTIVE';
ALTER TABLE `subjects` ADD COLUMN `deleted_at` datetime DEFAULT NULL COMMENT 'Khác NULL = đã xóa mềm';
UPDATE `subjects` SET status = 'ACTIVE' WHERE status IS NULL OR status NOT IN ('ACTIVE', 'INACTIVE');
-- Kiểm tra trùng: code/school_id, name/school_id trước khi chạy 2 dòng dưới
ALTER TABLE `subjects`
  ADD UNIQUE KEY `uk_subjects_code_school` (`code`, `school_id`),
  ADD UNIQUE KEY `uk_subjects_name_school` (`name`, `school_id`);


-- ############################################################################
-- PHẦN 4: ENROLLMENTS - unique (student_id, class_id)
-- ############################################################################
-- Kiểm tra trùng: SELECT student_id, class_id, COUNT(*) FROM enrollments GROUP BY student_id, class_id HAVING COUNT(*) > 1;
ALTER TABLE `enrollments`
  ADD UNIQUE KEY `uk_enrollments_student_class` (`student_id`, `class_id`);


-- ############################################################################
-- PHẦN 5: CLASS_SECTIONS - chuẩn semester (HK1, HK2), status, unique
-- ############################################################################
UPDATE `class_sections` SET semester = 'HK1' WHERE semester IN ('1', 'Học kỳ 1', 'HK1', '');
UPDATE `class_sections` SET semester = 'HK2' WHERE semester IN ('2', 'Học kỳ 2', 'HK2');
UPDATE `class_sections` SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
UPDATE `class_sections` SET status = 'INACTIVE' WHERE status NOT IN ('ACTIVE', 'INACTIVE');
-- Kiểm tra trùng: class_room_id, subject_id, semester, school_year
ALTER TABLE `class_sections`
  ADD UNIQUE KEY `uk_class_sections_room_subject_semester_year` (`class_room_id`, `subject_id`, `semester`, `school_year`);


-- ############################################################################
-- PHẦN 6: SCHEDULES - unique (class_id, date, period) và (teacher_id, date, period)
-- ############################################################################
-- Kiểm tra trùng class_id/date/period và teacher_id/date/period trước khi chạy
ALTER TABLE `schedules` ADD UNIQUE KEY `uk_schedules_class_date_period` (`class_id`, `date`, `period`);
ALTER TABLE `schedules` ADD UNIQUE KEY `uk_schedules_teacher_date_period` (`teacher_id`, `date`, `period`);


-- ############################################################################
-- PHẦN 7: EXAM_SCORES - cột attempt, unique, composite index
-- ############################################################################
ALTER TABLE `exam_scores` ADD COLUMN `attempt` int(11) DEFAULT 1 COMMENT 'Lần thi (1, 2, ...)';
-- Kiểm tra trùng student_id, subject_id, class_id, score_type, attempt trước khi chạy
ALTER TABLE `exam_scores`
  ADD UNIQUE KEY `uk_exam_scores_student_subject_class_type_attempt` (`student_id`, `subject_id`, `class_id`, `score_type`, `attempt`);
ALTER TABLE `exam_scores`
  ADD KEY `idx_exam_scores_school_student` (`school_id`, `student_id`),
  ADD KEY `idx_exam_scores_student_subject` (`student_id`, `subject_id`),
  ADD KEY `idx_exam_scores_class_subject_type` (`class_id`, `subject_id`, `score_type`);

-- ############################################################################
-- PHẦN 8: ROLE PARENT + BẢNG PARENT_STUDENT (1 phụ huynh nhiều con, 1 con nhiều phụ huynh)
-- ############################################################################
-- Thêm role PARENT cho từng trường (nếu chưa có)
INSERT INTO `roles` (`school_id`, `name`, `description`)
SELECT s.`id`, CONCAT('PARENT_', UPPER(REPLACE(s.`code`, ' ', '_'))), 'Phụ huynh'
FROM `schools` s
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` r WHERE r.`school_id` = s.`id` AND r.`name` LIKE 'PARENT_%'
);

-- Bảng liên kết phụ huynh – học sinh.
-- users dùng chung cho tất cả role; parent_id/student_id trỏ tới users.id.
-- Các FK phải hợp lệ: parent_id, student_id → users.id; school_id → schools.id.
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

-- -----------------------------------------------------------------------------
-- Cập nhật bảng parent_student đã tồn tại (school_id từ NULL sang NOT NULL)
-- Chạy 2 lệnh dưới nếu bảng đã có sẵn với school_id cho phép NULL.
-- -----------------------------------------------------------------------------
-- UPDATE parent_student ps INNER JOIN users u ON u.id = ps.parent_id SET ps.school_id = u.school_id WHERE ps.school_id IS NULL;
-- ALTER TABLE parent_student MODIFY school_id int(11) NOT NULL;

-- =============================================================================
-- KẾT THÚC MIGRATION GỘP
-- =============================================================================
