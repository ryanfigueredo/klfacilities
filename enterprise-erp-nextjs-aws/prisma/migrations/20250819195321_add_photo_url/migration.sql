-- CreateEnum
CREATE TYPE "public"."StatusProvisao" AS ENUM ('PENDENTE', 'EFETIVADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."Provisao" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoMov" NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "unidadeId" TEXT,
    "grupoId" TEXT,
    "status" "public"."StatusProvisao" NOT NULL DEFAULT 'PENDENTE',
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provisao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Provisao_dataPrevista_tipo_idx" ON "public"."Provisao"("dataPrevista", "tipo");

-- CreateIndex
CREATE INDEX "Provisao_status_idx" ON "public"."Provisao"("status");

-- CreateIndex
CREATE INDEX "Provisao_unidadeId_idx" ON "public"."Provisao"("unidadeId");

-- CreateIndex
CREATE INDEX "Provisao_grupoId_idx" ON "public"."Provisao"("grupoId");

-- AddForeignKey
ALTER TABLE "public"."Provisao" ADD CONSTRAINT "Provisao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisao" ADD CONSTRAINT "Provisao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisao" ADD CONSTRAINT "Provisao_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
