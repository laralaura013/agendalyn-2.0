/*
  Warnings:

  - A unique constraint covering the columns `[companyId,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'ADMIN';
ALTER TYPE "public"."Role" ADD VALUE 'MANAGER';
ALTER TYPE "public"."Role" ADD VALUE 'BARBER';
ALTER TYPE "public"."Role" ADD VALUE 'HAIRDRESSER';

-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_email_key" ON "public"."User"("companyId", "email");
