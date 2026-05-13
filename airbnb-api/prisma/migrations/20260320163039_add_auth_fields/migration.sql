-- Add password column with temporary default for existing rows
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT 'TEMP_WILL_BE_CHANGED';

-- Remove the default — new users must provide real password
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;

-- Create refresh_tokens table
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- Add foreign key
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- /*
--   Warnings:

--   - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

-- */
-- -- DropIndex
-- DROP INDEX "bookings_checkIn_idx";

-- -- DropIndex
-- DROP INDEX "bookings_checkOut_idx";

-- -- AlterTable
-- ALTER TABLE "users" ADD COLUMN     "password" TEXT NOT NULL;

-- -- CreateTable
-- CREATE TABLE "refresh-tokens" (
--     "id" TEXT NOT NULL,
--     "token" TEXT NOT NULL,
--     "userId" TEXT NOT NULL,
--     "expiresAt" TIMESTAMP(3) NOT NULL,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT "refresh-tokens_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateIndex
-- CREATE UNIQUE INDEX "refresh-tokens_token_key" ON "refresh-tokens"("token");

-- -- CreateIndex
-- CREATE INDEX "refresh-tokens_userId_idx" ON "refresh-tokens"("userId");

-- -- CreateIndex
-- CREATE INDEX "refresh-tokens_token_idx" ON "refresh-tokens"("token");

-- -- CreateIndex
-- CREATE INDEX "bookings_checkIn_checkOut_idx" ON "bookings"("checkIn", "checkOut");

-- -- AddForeignKey
-- ALTER TABLE "refresh-tokens" ADD CONSTRAINT "refresh-tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
