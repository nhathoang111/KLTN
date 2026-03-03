-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 01, 2026 at 05:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `announcements` (
  `class_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `assignments` (
  `class_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `max_score` double DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `attachment_size` bigint(20) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `due_date` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_path` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `instructions` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `class_section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `assignment_submissions` (
  `assignment_id` int(11) DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `score` double DEFAULT NULL,
  `similarity_score` double DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `attachment_size` bigint(20) DEFAULT NULL,
  `graded_at` datetime(6) DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_path` varchar(255) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  `feedback` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `status` varchar(255) NOT NULL,
  `attendance_date` datetime NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `class_section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `chat_memory` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `answer` varchar(5000) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `question` varchar(5000) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT INTO `chat_memory` (`id`, `user_id`, `created_at`, `answer`, `question`) VALUES
(1, 1, '2025-11-24 10:59:29.000000', 'Chào bạn! Tôi là một trợ lý giáo dục. Bạn cần tôi giúp gì không? Hãy cứ đặt câu hỏi nhé!\n', 'hi'),
(2, 1, '2025-11-24 11:09:42.000000', 'Chào bạn! Tôi là một trợ lý giáo dục, và rất vui được giới thiệu về trang web này.\n\nTrang web này là một nguồn tài nguyên hữu ích dành cho việc học tập và trau dồi kiến thức. Tại đây, bạn có thể tìm thấy:\n\n*   **Thông tin và giải thích:** Trang web cung cấp thông tin, giải thích chi tiết về nhiều chủ đề khác nhau, giúp bạn hiểu rõ hơn về các khái niệm và vấn đề.\n*   **Câu trả lời và hướng dẫn:** Bạn có thể đặt câu hỏi và nhận được câu trả lời rõ ràng, dễ hiểu. Trang web có thể hướng dẫn bạn cách giải quyết các bài tập, vấn đề học tập một cách hiệu quả.\n*   **Hỗ trợ đa dạng:** Trang web hỗ trợ nhiều lĩnh vực khác nhau, từ các môn học ở trường đến những chủ đề mở rộng.\n*   **Tương tác và học hỏi:** Bạn có thể tương tác với tôi để tìm kiếm thông tin, được giải đáp thắc mắc và khám phá kiến thức mới.\n\nTóm lại, trang web này là một công cụ hỗ trợ tuyệt vời cho việc học tập của bạn. Hãy thoải mái khám phá và sử dụng nó để nâng cao kiến thức và kỹ năng của mình nhé!\n', 'giới thiệu về trang web này'),
(3, 1, '2025-11-24 11:44:34.000000', 'Chào bạn! Tôi là một trợ lý giáo dục và rất vui được cung cấp thông tin về lịch sử trường Phan Châu Trinh.\n\nTrường Phan Châu Trinh là một ngôi trường có bề dày lịch sử và truyền thống đáng tự hào tại Đà Nẵng. Dưới đây là những nét chính về lịch sử hình thành và phát triển của trường:\n\n**1. Khái quát:**\n\n*   **Tên gọi:** Trường Phan Châu Trinh\n*   **Địa điểm:** Đà Nẵng, Việt Nam\n*   **Loại hình:** Trường trung học phổ thông công lập\n*   **Nổi tiếng:** Về chất lượng giáo dục và truyền thống yêu nước.\n\n**2. Quá trình thành lập và phát triển:**\n\n*   **Năm thành lập:** Trường được thành lập vào năm 1927.\n*   **Thời kỳ ban đầu:** Trường được thành lập trong bối cảnh đất nước còn dưới ách đô hộ của thực dân Pháp. Mục tiêu ban đầu là đào tạo học sinh có kiến thức, ý thức dân tộc, và lòng yêu nước.\n*   **Giai đoạn kháng chiến:** Trường đã đóng góp tích cực vào phong trào đấu tranh giành độc lập dân tộc. Nhiều học sinh và thầy cô đã tham gia vào các hoạt động cách mạng, thậm chí hy sinh vì Tổ quốc.\n*   **Sau năm 1975:** Trường tiếp tục phát triển và trở thành một trong những trường trung học phổ thông hàng đầu tại Đà Nẵng. Trường tập trung vào nâng cao chất lượng giáo dục toàn diện, chú trọng cả về kiến thức và kỹ năng.\n*   **Hiện nay:** Trường Phan Châu Trinh vẫn duy trì vị thế là một trường có uy tín, luôn đổi mới và phát triển để đáp ứng yêu cầu của xã hội.\n\n**3. Những điểm nổi bật trong lịch sử:**\n\n*   **Truyền thống yêu nước:** Trường luôn giữ vững và phát huy truyền thống yêu nước, tinh thần cách mạng của các thế hệ đi trước.\n*   **Chất lượng giáo dục:** Trường có đội ngũ giáo viên giỏi, tâm huyết và luôn nỗ lực nâng cao chất lượng dạy và học.\n*   **Thành tích:** Trường đạt được nhiều thành tích cao trong các kỳ thi học sinh giỏi, các hoạt động văn hóa, thể thao.\n*   **Cơ sở vật chất:** Trường có cơ sở vật chất khang trang, đáp ứng tốt cho việc dạy và học.\n\n**4. Ý nghĩa:**\n\nTrường Phan Châu Trinh không chỉ là nơi đào tạo kiến thức mà còn là nơi ươm mầm những thế hệ học sinh có tài, có đức, góp phần xây dựng đất nước. Ngôi trường là biểu tượng của tinh thần hiếu học, lòng yêu nước và sự kiên cường của người dân Đà Nẵng.\n\nHy vọng những thông tin trên đã giúp bạn hiểu rõ hơn về lịch sử của trường Phan Châu Trinh. Nếu bạn có bất kỳ câu hỏi nào khác, đừng ngần ngại hỏi nhé!\n', 'cho tôi lịch sử về trường Phan Châu Trinh');

CREATE TABLE `classes` (
  `capacity` int(11) DEFAULT NULL,
  `grade_level` int(11) DEFAULT NULL,
  `school_year_id` int(11) DEFAULT NULL,
  `homeroom_teacher_id` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `room` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT INTO `classes` (`capacity`, `grade_level`, `school_year_id`, `homeroom_teacher_id`, `id`, `school_id`, `name`, `status`, `room`) VALUES
(30, 10, 1, 33, 7, 6, '10/1', 'ACTIVE', 'A101');

CREATE TABLE `class_sections` (
  `id` int(11) NOT NULL,
  `class_room_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `semester` varchar(50) DEFAULT NULL COMMENT 'học kỳ',
  `school_year` varchar(50) DEFAULT NULL COMMENT 'năm học',
  `status` varchar(50) DEFAULT NULL COMMENT 'trạng thái'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `documents` (
  `class_id` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `uploaded_at` datetime(6) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_type` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `enrollments` (
  `class_id` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `rollno` int(11) DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `class_section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT INTO `enrollments` (`class_id`, `id`, `rollno`, `school_id`, `student_id`, `status`, `class_section_id`) VALUES
(7, 9, 1, 6, 34, 'ACTIVE', NULL);
CREATE TABLE `exam_scores` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `class_id` int(11) DEFAULT NULL,
  `school_id` int(11) NOT NULL,
  `score` double NOT NULL,
  `score_type` varchar(50) DEFAULT '15P',
  `note` varchar(500) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `class_section_id` int(11) DEFAULT NULL,
  `attempt` int(11) DEFAULT 1 COMMENT 'Lần thi (1, 2, ...)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT INTO `exam_scores` (`id`, `student_id`, `subject_id`, `class_id`, `school_id`, `score`, `score_type`, `note`, `status`, `created_at`, `updated_at`, `class_section_id`, `attempt`) VALUES
(29, 34, 18, 7, 6, 7, '15P', '', 'ACTIVE', '2026-02-28 07:33:30', '2026-02-28 07:33:30', NULL, 1),
(30, 34, 18, 7, 6, 7, 'CUOIKI', '', 'ACTIVE', '2026-02-28 07:33:30', '2026-02-28 07:33:30', NULL, 1),
(31, 34, 18, 7, 6, 7, '1TIET', '', 'ACTIVE', '2026-02-28 07:33:30', '2026-02-28 07:33:30', NULL, 1);
CREATE TABLE `records` (
  `id` int(11) NOT NULL,
  `date` datetime(6) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `value` double DEFAULT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `revoked` bit(1) DEFAULT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `school_id`, `created_at`, `description`, `name`) VALUES
(1, NULL, '2025-10-16 06:52:23.000000', 'Super Administrator - Full system access', 'SUPER_ADMIN'),
(11, NULL, '2026-02-26 07:21:55.000000', 'School Administrator - THPT Nguyễn Du', 'ADMIN_THPTND'),
(12, NULL, '2026-02-26 07:21:55.000000', 'School Administrator - THPT Lê Hồng Phong', 'ADMIN_THPTLHP'),
(13, NULL, '2026-02-26 07:21:55.000000', 'School Administrator - THPT Trần Đại Nghĩa', 'ADMIN_THPTTDN'),
(14, NULL, '2026-02-26 07:21:55.000000', 'Teacher - THPT Nguyễn Du', 'TEACHER_THPTND'),
(15, NULL, '2026-02-26 07:21:55.000000', 'Teacher - THPT Lê Hồng Phong', 'TEACHER_THPTLHP'),
(16, NULL, '2026-02-26 07:21:55.000000', 'Teacher - THPT Trần Đại Nghĩa', 'TEACHER_THPTTDN'),
(17, NULL, '2026-02-26 07:21:55.000000', 'Student - THPT Nguyễn Du', 'STUDENT_THPTND'),
(18, NULL, '2026-02-26 07:21:55.000000', 'Student - THPT Lê Hồng Phong', 'STUDENT_THPTLHP'),
(19, NULL, '2026-02-26 07:21:55.000000', 'Student - THPT Trần Đại Nghĩa', 'STUDENT_THPTTDN'),
(23, 6, NULL, '', 'ADMIN'),
(24, 6, NULL, '', 'Teacher'),
(25, 6, NULL, '', 'Student');

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `class_id` int(11) DEFAULT NULL,
  `day_of_week` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `id` int(11) NOT NULL,
  `period` int(11) DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `room` varchar(255) DEFAULT NULL,
  `class_section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`class_id`, `day_of_week`, `date`, `id`, `period`, `school_id`, `subject_id`, `teacher_id`, `room`, `class_section_id`) VALUES
(7, NULL, '2026-03-02', 1073, 2, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-02', 1074, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-02', 1075, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-03', 1076, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-04', 1077, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-04', 1078, 3, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-04', 1079, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-05', 1080, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-05', 1081, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-05', 1082, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-05', 1083, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-06', 1084, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-06', 1085, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-06', 1086, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-06', 1087, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-07', 1088, 1, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-07', 1089, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-07', 1090, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-07', 1091, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-07', 1092, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-09', 1093, 2, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-09', 1094, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-09', 1095, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-10', 1096, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-11', 1097, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-11', 1098, 3, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-11', 1099, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-12', 1100, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-12', 1101, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-12', 1102, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-12', 1103, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-13', 1104, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-13', 1105, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-13', 1106, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-13', 1107, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-14', 1108, 1, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-14', 1109, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-14', 1110, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-14', 1111, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-14', 1112, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-16', 1113, 2, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-16', 1114, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-16', 1115, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-17', 1116, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-18', 1117, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-18', 1118, 3, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-18', 1119, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-19', 1120, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-19', 1121, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-19', 1122, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-19', 1123, 5, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-20', 1124, 1, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-20', 1125, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-20', 1126, 4, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-20', 1127, 5, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-21', 1128, 1, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-21', 1129, 2, 6, 18, 33, 'A101', NULL),
(7, NULL, '2026-03-21', 1130, 3, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-21', 1131, 4, 6, 19, 33, 'A101', NULL),
(7, NULL, '2026-03-21', 1132, 5, 6, 18, 33, 'A101', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` int(11) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `ward` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `score_locked` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `created_at`, `updated_at`, `address`, `province`, `district`, `ward`, `code`, `email`, `name`, `phone`, `status`, `score_locked`) VALUES
(1, '2025-10-16 06:52:23.000000', '2025-10-16 06:52:23.000000', '123 Đường ABC', 'Hồ Chí Minh', 'Quận 1', NULL, 'THPTND', 'info@thptnguyendu.edu.vn', 'Trường THPT Nguyễn Du', '028-1234567', 'ACTIVE', 0),
(6, NULL, NULL, '40 Yến Bái', 'Thành phố Đà Nẵng', 'Quận Hải Châu', 'Phường Hải Châu', 'PD', 'pd@gmail.com', 'Phù Đổng', '0123345', 'ACTIVE', 0);

-- --------------------------------------------------------

--
-- Table structure for table `school_years`
--

CREATE TABLE `school_years` (
  `id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL COMMENT 'Ví dụ: 2024-2025',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_years`
--

INSERT INTO `school_years` (`id`, `school_id`, `name`, `start_date`, `end_date`, `status`) VALUES
(1, 6, '2024-2025', NULL, NULL, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `school_id` int(11) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'ACTIVE' COMMENT 'ACTIVE hoặc INACTIVE',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Khác NULL = đã xóa mềm'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `school_id`, `code`, `name`, `status`, `deleted_at`) VALUES
(18, 6, 'MTH', 'Toán', 'ACTIVE', NULL),
(19, 6, 'LEC', 'Văn', 'ACTIVE', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role_id`, `school_id`, `email`, `full_name`, `password_hash`, `status`) VALUES
(1, 1, 1, 'superadmin@example.com', 'Super Administrator', '$2a$10$WV1lwYoNLkF5uvmGLQaK/e4hVj9oZkoi2N6.HxK0VflGp4Wp.7r0y', 'ACTIVE'),
(32, 23, 6, 'adminpd@gmail.com', 'Admin', '$2a$10$1hJsYioRdyt4QKdupXsXt.uV508uc.v9kC5xaXi6P19JsajzE.hlO', 'ACTIVE'),
(33, 24, 6, 'hoang@gmail.com', 'Nguyễn Nhật Hoàng', '$2a$10$9vHpyBBESIE7odYiKOk2J.r6gKkk4sWc67OtfDpZlF/B/eh.dnxky', 'INACTIVE'),
(34, 25, 6, 'hai@gmail.com', 'Nguyễn Đắc Hải', '$2a$10$oxCckVyT4jLK9BxKAUy82O9hvhm7M3GQDjryokayEM9VJ.VevdnEu', 'ACTIVE');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK3n8i71lr49vv058cita1b90m7` (`class_id`),
  ADD KEY `FKht7cvemps7a8tjylacwtyyckj` (`created_by`),
  ADD KEY `FKx7li6yoanrgdx0sb4rd3i8od` (`school_id`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK15vvra255mh2h6merxffxmb2t` (`class_id`),
  ADD KEY `FKotqcl7qkgnihgxa6x71is49i3` (`created_by`),
  ADD KEY `FKt4g3ywst5pobqkwnmlp4ug89a` (`school_id`),
  ADD KEY `FKmd9krpotkeiujbef6ren2yvq5` (`subject_id`),
  ADD KEY `fk_assignments_class_section` (`class_section_id`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKm7i7ubgh7y2n6mvg8muw62oax` (`assignment_id`),
  ADD KEY `FK4p81v51rngn38897x4mhbfqyt` (`graded_by`),
  ADD KEY `FKqjl87tk4vkd1tmnjxh2ol58ck` (`school_id`),
  ADD KEY `FKgf6lwnlqvnetehdftwcij7r5g` (`student_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_date` (`attendance_date`),
  ADD KEY `fk_attendance_class_section` (`class_section_id`);

--
-- Indexes for table `chat_memory`
--
ALTER TABLE `chat_memory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_chatmemory_user` (`user_id`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_classes_name_school_year_school` (`name`,`school_year_id`,`school_id`),
  ADD KEY `FKsunn99t67x9n0ni828ihrjvy5` (`homeroom_teacher_id`),
  ADD KEY `FKh0oaysw8jogs1h9q9ph5dvp5d` (`school_id`),
  ADD KEY `fk_classes_school_year` (`school_year_id`);

--
-- Indexes for table `class_sections`
--
ALTER TABLE `class_sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_class_sections_room_subject_semester_year` (`class_room_id`,`subject_id`,`semester`,`school_year`),
  ADD KEY `fk_class_section_subject` (`subject_id`),
  ADD KEY `fk_class_section_teacher` (`teacher_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK6jy03vm6brco99vabi2q5lv7r` (`class_id`),
  ADD KEY `FK7qckyw8h64cqwstcxw6eufom9` (`school_id`),
  ADD KEY `FK1ugacya4ssi0ilf8a9tjycgs6` (`uploaded_by`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_enrollments_student_class` (`student_id`,`class_id`),
  ADD KEY `FKloh1q3o1ua6yuw9mwqdvhc54u` (`class_id`),
  ADD KEY `FKd035k6ap0eol4rqdb7a21iyih` (`school_id`),
  ADD KEY `FK2lha5vwilci2yi3vu5akusx4a` (`student_id`),
  ADD KEY `fk_enrollments_class_section` (`class_section_id`);

--
-- Indexes for table `exam_scores`
--
ALTER TABLE `exam_scores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_exam_scores_student_subject_class_type_attempt` (`student_id`,`subject_id`,`class_id`,`score_type`,`attempt`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `fk_exam_scores_class_section` (`class_section_id`),
  ADD KEY `idx_exam_scores_school_student` (`school_id`,`student_id`),
  ADD KEY `idx_exam_scores_student_subject` (`student_id`,`subject_id`),
  ADD KEY `idx_exam_scores_class_subject_type` (`class_id`,`subject_id`,`score_type`);

--
-- Indexes for table `records`
--
ALTER TABLE `records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKt25wbqxl85yxfiiag8o6ht8ob` (`actor_id`),
  ADD KEY `FKkl390pwlhj89xjxu5hf42x8fu` (`class_id`),
  ADD KEY `FKilctlr8fmmdb972r2sus3popu` (`school_id`),
  ADD KEY `FKdpdw6rxmd1lh2irlsygj1dkxg` (`student_id`),
  ADD KEY `FK2i7kclxaqrgif4j5u50faapco` (`subject_id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK1lih5y2npsf8u5o3vhdb9y0os` (`user_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK_role_name_school` (`name`,`school_id`),
  ADD KEY `FKk0tg63co09eqybkw2weocqim1` (`school_id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_schedules_class_date_period` (`class_id`,`date`,`period`),
  ADD UNIQUE KEY `uk_schedules_teacher_date_period` (`teacher_id`,`date`,`period`),
  ADD KEY `FKe9px6t0yucpeap743s7dvjnr1` (`class_id`),
  ADD KEY `FKigmq11x92eodjudp2133csm7h` (`school_id`),
  ADD KEY `FK7tl4569066j839d7hd28xwuw8` (`subject_id`),
  ADD KEY `FKk3l6clk2nk64svalyk2lw03pq` (`teacher_id`),
  ADD KEY `fk_schedules_class_section` (`class_section_id`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UKm5x8j64nhdcprk9ghc6622swx` (`code`);

--
-- Indexes for table `school_years`
--
ALTER TABLE `school_years`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_school_years_school` (`school_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_subjects_code_school` (`code`,`school_id`),
  ADD UNIQUE KEY `uk_subjects_name_school` (`name`,`school_id`),
  ADD KEY `FKmuktvnrq4ft25nduvev1wseqd` (`school_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`),
  ADD KEY `FKp56c1712k691lhsyewcssf40f` (`role_id`),
  ADD KEY `FK3gj5j7vnsoxf1wp9n5hsqdiq3` (`school_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_memory`
--
ALTER TABLE `chat_memory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `class_sections`
--
ALTER TABLE `class_sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `exam_scores`
--
ALTER TABLE `exam_scores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `records`
--
ALTER TABLE `records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1133;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `school_years`
--
ALTER TABLE `school_years`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `FK3n8i71lr49vv058cita1b90m7` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `FKht7cvemps7a8tjylacwtyyckj` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKx7li6yoanrgdx0sb4rd3i8od` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `FK15vvra255mh2h6merxffxmb2t` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `FKmd9krpotkeiujbef6ren2yvq5` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `FKotqcl7qkgnihgxa6x71is49i3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKt4g3ywst5pobqkwnmlp4ug89a` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `fk_assignments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `FK4p81v51rngn38897x4mhbfqyt` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKgf6lwnlqvnetehdftwcij7r5g` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKm7i7ubgh7y2n6mvg8muw62oax` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`),
  ADD CONSTRAINT `FKqjl87tk4vkd1tmnjxh2ol58ck` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `fk_attendance_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `chat_memory`
--
ALTER TABLE `chat_memory`
  ADD CONSTRAINT `fk_chatmemory_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `FKh0oaysw8jogs1h9q9ph5dvp5d` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `FKsunn99t67x9n0ni828ihrjvy5` FOREIGN KEY (`homeroom_teacher_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_classes_school_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `class_sections`
--
ALTER TABLE `class_sections`
  ADD CONSTRAINT `fk_class_section_class_room` FOREIGN KEY (`class_room_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_class_section_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_class_section_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `FK1ugacya4ssi0ilf8a9tjycgs6` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FK6jy03vm6brco99vabi2q5lv7r` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `FK7qckyw8h64cqwstcxw6eufom9` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `FK2lha5vwilci2yi3vu5akusx4a` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKd035k6ap0eol4rqdb7a21iyih` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `FKloh1q3o1ua6yuw9mwqdvhc54u` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `fk_enrollments_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `exam_scores`
--
ALTER TABLE `exam_scores`
  ADD CONSTRAINT `exam_scores_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `exam_scores_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `exam_scores_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `exam_scores_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `fk_exam_scores_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `records`
--
ALTER TABLE `records`
  ADD CONSTRAINT `FK2i7kclxaqrgif4j5u50faapco` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `FKdpdw6rxmd1lh2irlsygj1dkxg` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `FKilctlr8fmmdb972r2sus3popu` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `FKkl390pwlhj89xjxu5hf42x8fu` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `FKt25wbqxl85yxfiiag8o6ht8ob` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `FK1lih5y2npsf8u5o3vhdb9y0os` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `FKk0tg63co09eqybkw2weocqim1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `FK7tl4569066j839d7hd28xwuw8` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `FKe9px6t0yucpeap743s7dvjnr1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `FKigmq11x92eodjudp2133csm7h` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `FKk3l6clk2nk64svalyk2lw03pq` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_schedules_class_section` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `school_years`
--
ALTER TABLE `school_years`
  ADD CONSTRAINT `fk_school_years_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `FKmuktvnrq4ft25nduvev1wseqd` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `FK3gj5j7vnsoxf1wp9n5hsqdiq3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `FKp56c1712k691lhsyewcssf40f` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
