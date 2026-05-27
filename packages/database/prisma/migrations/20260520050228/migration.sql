/*
  Warnings:

  - Added the required column `marketType` to the `Fills` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('PERP', 'SPOT');

-- DropIndex
DROP INDEX IF EXISTS "Fills_timestamp_idx";

-- AlterTable
ALTER TABLE "Fills" ADD COLUMN     "marketType" "MarketType" NOT NULL,
ALTER COLUMN "fee" SET DATA TYPE TEXT;
