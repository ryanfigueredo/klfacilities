-- AlterTable
ALTER TABLE "public"."ChecklistResposta" ADD COLUMN     "gerenteAssinaturaFotoUrl" TEXT,
ADD COLUMN     "gerenteAssinadoEm" TIMESTAMP(3),
ADD COLUMN     "gerenteAssinadoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_gerenteAssinadoPorId_fkey" FOREIGN KEY ("gerenteAssinadoPorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ChecklistResposta_gerenteAssinadoPorId_idx" ON "public"."ChecklistResposta"("gerenteAssinadoPorId");

