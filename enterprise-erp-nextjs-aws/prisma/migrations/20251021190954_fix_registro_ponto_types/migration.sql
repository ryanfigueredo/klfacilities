/*
  Warnings:

  - The `ip` column on the `RegistroPonto` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cpfSnapshot` column on the `RegistroPonto` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."TipoChecklist" AS ENUM ('LIMPEZA', 'INSUMOS', 'SATISFACAO');

-- CreateEnum
CREATE TYPE "public"."StatusLimpeza" AS ENUM ('LIMPEZA', 'RETIRADA_LIXO');

-- CreateEnum
CREATE TYPE "public"."TipoInsumo" AS ENUM ('ALCOOL_HIGIENIZACAO', 'PAPEL_HIGIENICO', 'PAPEL_TOALHA', 'SABONETE');

-- CreateEnum
CREATE TYPE "public"."AvaliacaoSatisfacao" AS ENUM ('MUITO_RUIM', 'RUIM', 'REGULAR', 'BOM', 'MUITO_BOM');

-- CreateEnum
CREATE TYPE "public"."FatorInfluencia" AS ENUM ('CHEIRO', 'DISPONIBILIDADE_INSUMOS', 'LIMPEZA_SUPERFICIES', 'POSTURA_EQUIPE', 'RECOLHIMENTO_LIXO');

-- AlterTable
ALTER TABLE "public"."RegistroPonto" DROP COLUMN "ip",
ADD COLUMN     "ip" BIGINT,
DROP COLUMN "cpfSnapshot",
ADD COLUMN     "cpfSnapshot" BIGINT;

-- CreateTable
CREATE TABLE "public"."ChecklistDigital" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "tipo" "public"."TipoChecklist" NOT NULL,
    "servicosLimpeza" "public"."StatusLimpeza"[],
    "insumosSolicitados" "public"."TipoInsumo"[],
    "avaliacaoLimpeza" "public"."AvaliacaoSatisfacao",
    "fatoresInfluencia" "public"."FatorInfluencia"[],
    "comentarios" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDigital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistDigital_unidadeId_idx" ON "public"."ChecklistDigital"("unidadeId");

-- CreateIndex
CREATE INDEX "ChecklistDigital_tipo_idx" ON "public"."ChecklistDigital"("tipo");

-- CreateIndex
CREATE INDEX "ChecklistDigital_timestamp_idx" ON "public"."ChecklistDigital"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."ChecklistDigital" ADD CONSTRAINT "ChecklistDigital_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
