-- Thêm cột class_section_id và khóa ngoại vào các bảng
-- Chạy sau khi đã có bảng class_sections. Nếu cột đã tồn tại thì bỏ qua câu ADD COLUMN, chỉ chạy ADD CONSTRAINT.

-- 1. assignments
ALTER TABLE `assignments`
  ADD COLUMN `class_section_id` INT(11) DEFAULT NULL;
ALTER TABLE `assignments`
  ADD CONSTRAINT `fk_assignments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

-- 2. enrollments
ALTER TABLE `enrollments`
  ADD COLUMN `class_section_id` INT(11) DEFAULT NULL;
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

-- 3. exam_scores
ALTER TABLE `exam_scores`
  ADD COLUMN `class_section_id` INT(11) DEFAULT NULL;
ALTER TABLE `exam_scores`
  ADD CONSTRAINT `fk_exam_scores_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

-- 4. attendance
ALTER TABLE `attendance`
  ADD COLUMN `class_section_id` INT(11) DEFAULT NULL;
ALTER TABLE `attendance`
  ADD CONSTRAINT `fk_attendance_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

-- 5. schedules
ALTER TABLE `schedules`
  ADD COLUMN `class_section_id` INT(11) DEFAULT NULL;
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_schedules_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;
