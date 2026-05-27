/*
  Warnings:

  - You are about to drop the column `userId` on the `Fills` table. All the data in the column will be lost.
  - Added the required column `makerUserId` to the `Fills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `takerUserId` to the `Fills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Fills" DROP CONSTRAINT "Fills_userId_fkey";

-- AlterTable
ALTER TABLE "Fills" DROP COLUMN "userId",
ADD COLUMN     "makerUserId" TEXT NOT NULL,
ADD COLUMN     "takerUserId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_makerUserId_fkey" FOREIGN KEY ("makerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_takerUserId_fkey" FOREIGN KEY ("takerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
