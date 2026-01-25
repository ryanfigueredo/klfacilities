-- CreateEnum
CREATE TYPE "public"."PeriodicidadeProvisionamento" AS ENUM ('MENSAL', 'QUINZENAL', 'SEMANAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- AlterTable: Adicionar campos ao Provisionamento
ALTER TABLE "public"."Provisionamento" 
  ADD COLUMN "competencia" TIMESTAMP(3),
  ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE INDEX "Provisionamento_competencia_idx" ON "public"."Provisionamento"("competencia");
CREATE INDEX "Provisionamento_templateId_idx" ON "public"."Provisionamento"("templateId");

-- CreateTable: ProvisionamentoTemplate
CREATE TABLE "public"."ProvisionamentoTemplate" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "tipo" "public"."TipoMov" NOT NULL DEFAULT 'DESPESA',
    "periodicidade" "public"."PeriodicidadeProvisionamento" NOT NULL DEFAULT 'MENSAL',
    "diaVencimento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "categoriaId" TEXT,
    "subcategoriaId" TEXT,
    "centroCustoId" TEXT,
    "contaId" TEXT,
    "formaPagamento" TEXT,
    "documento" TEXT,
    "obs" TEXT,
    "ultimaGeracao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProvisionamentoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProvisionamentoTemplate_ativo_periodicidade_idx" ON "public"."ProvisionamentoTemplate"("ativo", "periodicidade");
CREATE INDEX "ProvisionamentoTemplate_grupoId_unidadeId_idx" ON "public"."ProvisionamentoTemplate"("grupoId", "unidadeId");

-- AddForeignKey
ALTER TABLE "public"."Provisionamento" ADD CONSTRAINT "Provisionamento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ProvisionamentoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ProvisionamentoTemplate" ADD CONSTRAINT "ProvisionamentoTemplate_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ProvisionamentoTemplate" ADD CONSTRAINT "ProvisionamentoTemplate_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ProvisionamentoTemplate" ADD CONSTRAINT "ProvisionamentoTemplate_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Atualizar competencia para provisionamentos existentes (usar dataVenc como padrão)
UPDATE "public"."Provisionamento" SET "competencia" = "dataVenc" WHERE "competencia" IS NULL;

