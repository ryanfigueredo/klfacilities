-- AlterTable
ALTER TABLE "public"."AuditLog" ADD COLUMN     "error" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Movimento" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "deletedReason" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "public"."AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Movimento_dataLanc_tipo_idx" ON "public"."Movimento"("dataLanc", "tipo");

-- CreateIndex
CREATE INDEX "Movimento_competencia_idx" ON "public"."Movimento"("competencia");

-- CreateIndex
CREATE INDEX "Movimento_grupoId_idx" ON "public"."Movimento"("grupoId");

-- CreateIndex
CREATE INDEX "Movimento_unidadeId_idx" ON "public"."Movimento"("unidadeId");

-- CreateIndex
CREATE INDEX "Movimento_categoria_idx" ON "public"."Movimento"("categoria");

-- CreateIndex
CREATE INDEX "Movimento_deletedAt_idx" ON "public"."Movimento"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
