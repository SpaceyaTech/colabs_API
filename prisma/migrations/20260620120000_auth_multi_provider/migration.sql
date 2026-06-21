-- AlterTable
ALTER TABLE "User" ALTER COLUMN "githubId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "googleId" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- Mark existing OAuth users as verified
UPDATE "User" SET "emailVerified" = true, "emailVerifiedAt" = NOW() WHERE "githubId" IS NOT NULL;
