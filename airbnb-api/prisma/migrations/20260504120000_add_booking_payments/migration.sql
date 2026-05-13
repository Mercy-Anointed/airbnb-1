CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'FLUTTERWAVE');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED');

ALTER TABLE "bookings"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN "paymentProvider" "PaymentProvider",
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "paymentReference" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "bookings_paymentReference_key" ON "bookings"("paymentReference");
CREATE INDEX "bookings_paymentReference_idx" ON "bookings"("paymentReference");
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");
