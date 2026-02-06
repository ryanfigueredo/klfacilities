-- CreateTable
CREATE TABLE IF NOT EXISTS "FcmToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FcmToken_userId_idx" ON "FcmToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FcmToken_deviceId_idx" ON "FcmToken"("deviceId");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
