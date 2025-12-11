/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `approvalNotes` TEXT NULL,
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` INTEGER NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `gatewayResponse` TEXT NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL,
    ADD COLUMN `netAmount` DOUBLE NULL,
    ADD COLUMN `paymentGateway` VARCHAR(191) NULL,
    ADD COLUMN `refundAmount` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `refundReason` VARCHAR(191) NULL,
    ADD COLUMN `refundStatus` VARCHAR(191) NULL,
    ADD COLUMN `refundedAt` DATETIME(3) NULL,
    ADD COLUMN `taxAmount` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `transactionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `createdBy` INTEGER NULL,
    ADD COLUMN `lastPasswordChangedAt` DATETIME(3) NULL,
    ADD COLUMN `passwordResetExpiry` DATETIME(3) NULL,
    ADD COLUMN `passwordResetToken` VARCHAR(191) NULL,
    ADD COLUMN `staffStatus` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `Payment_transactionId_key` ON `Payment`(`transactionId`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_invoiceNumber_key` ON `Payment`(`invoiceNumber`);
