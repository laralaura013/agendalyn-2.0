-- AlterEnum
ALTER TYPE "public"."AppointmentStatus" ADD VALUE 'NO_SHOW';

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "serviceId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_companyId_createdAt_idx" ON "public"."Review"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_companyId_userId_createdAt_idx" ON "public"."Review"("companyId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_companyId_serviceId_createdAt_idx" ON "public"."Review"("companyId", "serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_companyId_status_start_idx" ON "public"."Appointment"("companyId", "status", "start");

-- CreateIndex
CREATE INDEX "Order_companyId_status_createdAt_idx" ON "public"."Order"("companyId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
