/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "botCancelPolicy" TEXT,
ADD COLUMN     "botGreeting" TEXT,
ADD COLUMN     "botMenuJson" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionStatus" "public"."SubscriptionStatus",
ADD COLUMN     "useSharedWaba" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "wabaAccessToken" TEXT,
ADD COLUMN     "wabaAppSecret" TEXT,
ADD COLUMN     "wabaPhoneNumberId" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappLastCheckAt" TIMESTAMP(3),
ADD COLUMN     "whatsappStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "public"."Company"("slug");
