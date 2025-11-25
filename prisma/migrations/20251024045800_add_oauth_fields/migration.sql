/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add nullable columns first
ALTER TABLE `User` ADD COLUMN `email_temp` VARCHAR(191) NULL,
    ADD COLUMN `firstName` VARCHAR(191) NULL,
    ADD COLUMN `googleId` VARCHAR(191) NULL,
    ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastName` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `username` VARCHAR(191) NULL;

-- Step 2: Update existing users with email based on username
UPDATE `User` SET `email_temp` = CONCAT(`username`, '@example.com') WHERE `email_temp` IS NULL;

-- Step 3: Add the required email column and copy data
ALTER TABLE `User` ADD COLUMN `email` VARCHAR(191) NOT NULL DEFAULT '';
UPDATE `User` SET `email` = `email_temp`;

-- Step 4: Drop the temporary column
ALTER TABLE `User` DROP COLUMN `email_temp`;

-- Step 5: Create unique indexes
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);
CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);
