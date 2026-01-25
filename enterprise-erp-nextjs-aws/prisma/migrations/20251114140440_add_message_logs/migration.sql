-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'evolution-api',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT,
    "contextId" TEXT,
    "userId" TEXT,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "emailId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT,
    "contextId" TEXT,
    "userId" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_to_idx" ON "WhatsAppMessageLog"("to");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_sentAt_idx" ON "WhatsAppMessageLog"("sentAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_provider_idx" ON "WhatsAppMessageLog"("provider");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_success_idx" ON "WhatsAppMessageLog"("success");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_context_contextId_idx" ON "WhatsAppMessageLog"("context", "contextId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_userId_idx" ON "WhatsAppMessageLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_success_idx" ON "EmailLog"("success");

-- CreateIndex
CREATE INDEX "EmailLog_template_idx" ON "EmailLog"("template");

-- CreateIndex
CREATE INDEX "EmailLog_context_contextId_idx" ON "EmailLog"("context", "contextId");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
