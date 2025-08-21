/*
  Warnings:

  - You are about to alter the column `cpf` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(14)`.
  - You are about to drop the column `discount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tip` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,cpf]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "gender" "public"."Gender",
ADD COLUMN     "number" TEXT,
ADD COLUMN     "state" VARCHAR(2),
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zipCode" VARCHAR(10),
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cpf" SET DATA TYPE VARCHAR(14);

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "discount",
DROP COLUMN "tip";

-- AlterTable
ALTER TABLE "public"."_PackageServices" ADD CONSTRAINT "_PackageServices_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_PackageServices_AB_unique";

-- AlterTable
ALTER TABLE "public"."_ServiceToUser" ADD CONSTRAINT "_ServiceToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_ServiceToUser_AB_unique";

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "public"."Client"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_cpf_key" ON "public"."Client"("companyId", "cpf");
