-- AlterTable
ALTER TABLE `User` ADD COLUMN `requiresPasswordChange` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tempPassword` VARCHAR(191) NULL,
    ADD COLUMN `tempPasswordExpiry` DATETIME(3) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;
