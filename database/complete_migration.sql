-- Complete Database Migration for Smart Fish Care
-- This script will update your existing database to include all required tables
-- Run this if your database only has the basic users and sensor_data tables

-- ============================================
-- 1. Add Email Verification Fields to Users
-- ============================================
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `verification_token` VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `verification_expires` TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `otp_code` VARCHAR(6) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `otp_expires` TIMESTAMP NULL DEFAULT NULL;

-- ============================================
-- 2. Create Email Verification Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS `email_verification_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `verification_type` enum('signup','password_reset','email_change') NOT NULL,
  `token` varchar(255) NOT NULL,
  `otp_code` varchar(6) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `email` (`email`),
  KEY `token` (`token`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `email_verification_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 3. Create Fish Size Ranges Table
-- ============================================
CREATE TABLE IF NOT EXISTS `fish_size_ranges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `min_length` decimal(5,2) NOT NULL,
  `max_length` decimal(5,2) NOT NULL,
  `min_width` decimal(5,2) NOT NULL,
  `max_width` decimal(5,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default fish size ranges
INSERT IGNORE INTO `fish_size_ranges` (`category`, `min_length`, `max_length`, `min_width`, `max_width`) VALUES
('Small', 0.00, 5.00, 0.00, 2.00),
('Medium', 5.10, 10.00, 2.10, 4.00),
('Large', 10.10, 999.99, 4.10, 999.99);

-- ============================================
-- 4. Create Water Parameters Table
-- ============================================
CREATE TABLE IF NOT EXISTS `water_parameters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parameter_name` varchar(100) NOT NULL,
  `normal_min` decimal(5,2) NOT NULL,
  `normal_max` decimal(5,2) NOT NULL,
  `danger_min` decimal(5,2) DEFAULT NULL,
  `danger_max` decimal(5,2) DEFAULT NULL,
  `unit` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `parameter_name` (`parameter_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default water parameters
INSERT IGNORE INTO `water_parameters` (`parameter_name`, `normal_min`, `normal_max`, `danger_min`, `danger_max`, `unit`) VALUES
('Temperature', 24.00, 27.00, 22.00, 29.00, '°C'),
('pH', 6.50, 8.00, 4.00, 9.50, 'pH');

-- ============================================
-- 5. Create Stocking Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS `stocking_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fish_type` varchar(100) NOT NULL,
  `stock_date` date NOT NULL,
  `aquarium_number` varchar(50) NOT NULL,
  `quantity` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `stock_date` (`stock_date`),
  KEY `aquarium_number` (`aquarium_number`),
  CONSTRAINT `stocking_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 6. Create Harvest Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS `harvest_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fish_type` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL,
  `size` varchar(50) NOT NULL,
  `harvest_date` date NOT NULL,
  `aquarium_number` varchar(50) NOT NULL,
  `weight` decimal(8,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `harvest_date` (`harvest_date`),
  KEY `aquarium_number` (`aquarium_number`),
  CONSTRAINT `harvest_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 7. Create Feeding Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS `feeding_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fish_size` varchar(50) NOT NULL,
  `food_type` varchar(100) NOT NULL,
  `feeding_time` time NOT NULL,
  `quantity` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `fish_size` (`fish_size`),
  KEY `feeding_time` (`feeding_time`),
  CONSTRAINT `feeding_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 8. Create Fish Detections Table
-- ============================================
CREATE TABLE IF NOT EXISTS `fish_detections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `detected_length` decimal(5,2) NOT NULL COMMENT 'Fish length in centimeters',
  `detected_width` decimal(5,2) NOT NULL COMMENT 'Fish width in centimeters',
  `size_category` varchar(50) NOT NULL COMMENT 'Small, Medium, or Large',
  `confidence_score` decimal(3,2) DEFAULT NULL COMMENT 'Detection confidence (0.00-1.00)',
  `detection_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `size_category` (`size_category`),
  KEY `detection_timestamp` (`detection_timestamp`),
  KEY `idx_user_timestamp` (`user_id`, `detection_timestamp`),
  CONSTRAINT `fish_detections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- 9. Create System Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `action` (`action`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `system_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Migration Complete!
-- ============================================
-- Your database now has all required tables.
-- Next step: Run `npm run db:generate` to regenerate Prisma Client

