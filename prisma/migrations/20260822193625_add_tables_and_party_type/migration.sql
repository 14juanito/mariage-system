/*
  Warnings:

  - You are about to drop the column `plus_ones` on the `guests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `guests` DROP COLUMN `plus_ones`,
    ADD COLUMN `civility` ENUM('MR', 'MME') NULL,
    ADD COLUMN `party_type` ENUM('SINGLE', 'COUPLE') NOT NULL DEFAULT 'SINGLE',
    ADD COLUMN `table_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `tables` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tables_wedding_id_number_key`(`wedding_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `guests_table_id_idx` ON `guests`(`table_id`);

-- AddForeignKey
ALTER TABLE `tables` ADD CONSTRAINT `tables_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
