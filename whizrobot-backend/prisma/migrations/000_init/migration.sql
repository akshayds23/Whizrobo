-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Organization_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `org_id` INTEGER NULL,
    `is_superadmin` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_org_id_idx`(`org_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `permission_key` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Permission_permission_key_key`(`permission_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    UNIQUE INDEX `UserPermission_user_id_permission_id_key`(`user_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Robot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `robot_code` VARCHAR(191) NOT NULL,
    `org_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Robot_robot_code_key`(`robot_code`),
    INDEX `Robot_org_id_idx`(`org_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_code` VARCHAR(191) NOT NULL,
    `course_name` VARCHAR(191) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `source` ENUM('WHIZROBOT', 'SCHOOL') NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Course_course_code_key`(`course_code`),
    INDEX `Course_course_code_idx`(`course_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseLevel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_id` INTEGER NOT NULL,
    `level_name` VARCHAR(191) NOT NULL,
    `sequence_no` INTEGER NOT NULL,

    UNIQUE INDEX `CourseLevel_course_id_sequence_no_key`(`course_id`, `sequence_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lesson` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_level_id` INTEGER NOT NULL,
    `lesson_name` VARCHAR(191) NOT NULL,
    `content_type` ENUM('VIDEO', 'IMAGE', 'TEXT') NOT NULL,
    `content_url` VARCHAR(191) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationCourseAccess` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `org_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `allowed_levels` JSON NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrganizationCourseAccess_org_id_course_id_key`(`org_id`, `course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `License` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `license_key` VARCHAR(191) NOT NULL,
    `org_id` INTEGER NOT NULL,
    `robot_id` INTEGER NOT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `License_license_key_key`(`license_key`),
    INDEX `License_org_id_idx`(`org_id`),
    INDEX `License_robot_id_idx`(`robot_id`),
    INDEX `License_valid_until_idx`(`valid_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminAuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_user_id` INTEGER NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RobotUsageLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `robot_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `lesson_id` INTEGER NULL,
    `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `duration_seconds` INTEGER NOT NULL,

    UNIQUE INDEX `RobotUsageLog_robot_id_course_id_lesson_id_opened_at_key`(`robot_id`, `course_id`, `lesson_id`, `opened_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LicenseNotification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `org_id` INTEGER NOT NULL,
    `robot_id` INTEGER NULL,
    `license_id` INTEGER NOT NULL,
    `type` ENUM('WARNING_30_DAYS', 'WARNING_7_DAYS', 'EXPIRED') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledged` BOOLEAN NOT NULL DEFAULT false,

    INDEX `LicenseNotification_license_id_idx`(`license_id`),
    INDEX `LicenseNotification_org_id_idx`(`org_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPermission` ADD CONSTRAINT `UserPermission_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPermission` ADD CONSTRAINT `UserPermission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Robot` ADD CONSTRAINT `Robot_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseLevel` ADD CONSTRAINT `CourseLevel_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lesson` ADD CONSTRAINT `Lesson_course_level_id_fkey` FOREIGN KEY (`course_level_id`) REFERENCES `CourseLevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationCourseAccess` ADD CONSTRAINT `OrganizationCourseAccess_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationCourseAccess` ADD CONSTRAINT `OrganizationCourseAccess_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_robot_id_fkey` FOREIGN KEY (`robot_id`) REFERENCES `Robot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminAuditLog` ADD CONSTRAINT `AdminAuditLog_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RobotUsageLog` ADD CONSTRAINT `RobotUsageLog_robot_id_fkey` FOREIGN KEY (`robot_id`) REFERENCES `Robot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RobotUsageLog` ADD CONSTRAINT `RobotUsageLog_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RobotUsageLog` ADD CONSTRAINT `RobotUsageLog_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `Lesson`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseNotification` ADD CONSTRAINT `LicenseNotification_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseNotification` ADD CONSTRAINT `LicenseNotification_robot_id_fkey` FOREIGN KEY (`robot_id`) REFERENCES `Robot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseNotification` ADD CONSTRAINT `LicenseNotification_license_id_fkey` FOREIGN KEY (`license_id`) REFERENCES `License`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME,
  migration_name VARCHAR(255),
  logs TEXT,
  rolled_back_at DATETIME,
  started_at DATETIME NOT NULL,
  applied_steps_count INT NOT NULL
);
