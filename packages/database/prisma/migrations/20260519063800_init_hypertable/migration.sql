/*
  Warnings:

  - The primary key for the `OrderHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `originalOrderTimestamp` to the `Fills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Fills" DROP CONSTRAINT "Fills_originalOrderId_fkey";

-- AlterTable
ALTER TABLE "Fills" ADD COLUMN     "originalOrderTimestamp" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "OrderHistory" DROP CONSTRAINT "OrderHistory_pkey",
ADD CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id", "timestamp");

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_originalOrderId_originalOrderTimestamp_fkey" FOREIGN KEY ("originalOrderId", "originalOrderTimestamp") REFERENCES "OrderHistory"("id", "timestamp") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add this at the end of the file:
SELECT create_hypertable('"OrderHistory"', 'timestamp');
