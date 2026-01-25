-- AlterTable
ALTER TABLE "ChecklistResposta" ADD COLUMN     "protocolo" TEXT,
ADD COLUMN     "assinaturaFotoUrl" TEXT,
ADD COLUMN     "lat" DECIMAL(10,8),
ADD COLUMN     "lng" DECIMAL(11,8),
ADD COLUMN     "accuracy" DECIMAL(10,2),
ADD COLUMN     "ip" BIGINT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "hash" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistResposta_protocolo_idx" ON "ChecklistResposta"("protocolo");

