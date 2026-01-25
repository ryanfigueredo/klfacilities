/*
  Warnings:

  - The `status` column on the `Anomalia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `anomalyHash` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the column `anomalyStatus` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the column `anomalyType` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaid` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the column `grupoid` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the column `unidadeid` on the `Movimento` table. All the data in the column will be lost.
  - You are about to drop the `Provisao` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `Anomalia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Movimento` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AnomalyType" AS ENUM ('DUPLICATE', 'NO_CATEGORY', 'OUTLIER');

-- CreateEnum
CREATE TYPE "public"."AnomalyStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "public"."TipoPonto" AS ENUM ('ENTRADA', 'INTERVALO_INICIO', 'INTERVALO_FIM', 'SAIDA');

-- DropForeignKey
ALTER TABLE "public"."Provisao" DROP CONSTRAINT "Provisao_criadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Provisao" DROP CONSTRAINT "Provisao_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Provisao" DROP CONSTRAINT "Provisao_unidadeId_fkey";

-- DropIndex
DROP INDEX "public"."Movimento_anomalyHash_idx";

-- DropIndex
DROP INDEX "public"."Movimento_anomalyStatus_idx";

-- DropIndex
DROP INDEX "public"."Movimento_anomalyType_idx";

-- DropIndex
DROP INDEX "public"."Movimento_importItemId_idx";

-- AlterTable
ALTER TABLE "public"."Anomalia" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "type",
ADD COLUMN     "type" "public"."AnomalyType" NOT NULL,
ALTER COLUMN "hash" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AnomalyStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3);

-- Drop view first to avoid dependency issues
DROP VIEW IF EXISTS "public"."movimento_compat" CASCADE;

-- AlterTable
ALTER TABLE "public"."Movimento" DROP COLUMN "anomalyHash",
DROP COLUMN "anomalyStatus",
DROP COLUMN "anomalyType",
DROP COLUMN "categoriaid" CASCADE,
DROP COLUMN "grupoid" CASCADE,
DROP COLUMN "unidadeid" CASCADE,
ADD COLUMN     "funcionarioId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "veiculoId" TEXT;

-- AlterTable
ALTER TABLE "public"."Unidade" ADD COLUMN     "lat" DECIMAL(65,30),
ADD COLUMN     "lng" DECIMAL(65,30),
ADD COLUMN     "radiusM" INTEGER;

-- DropTable
DROP TABLE "public"."Provisao";

-- CreateTable
CREATE TABLE "public"."Funcionario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "grupoId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Provisionamento" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "tipo" "public"."TipoMov" NOT NULL DEFAULT 'DESPESA',
    "dataVenc" TIMESTAMP(3) NOT NULL,
    "dataPgto" TIMESTAMP(3),
    "status" "public"."StatusProvisao" NOT NULL DEFAULT 'PENDENTE',
    "documento" TEXT,
    "formaPagamento" TEXT,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "categoriaId" TEXT,
    "subcategoriaId" TEXT,
    "centroCustoId" TEXT,
    "contaId" TEXT,
    "obs" TEXT,
    "movimentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provisionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportBatch" (
    "id" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "filename" TEXT,
    "totalLinhas" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "placa" TEXT,
    "veiculoId" TEXT,
    "valor" DECIMAL(65,30),
    "descricao" TEXT,
    "documento" TEXT,
    "origem" TEXT NOT NULL,
    "checksum" TEXT,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movimentoId" TEXT,

    CONSTRAINT "ImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PontoQrCode" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PontoQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroPonto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "unidadeId" TEXT NOT NULL,
    "tipo" "public"."TipoPonto" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DECIMAL(65,30),
    "lng" DECIMAL(65,30),
    "accuracy" DECIMAL(65,30),
    "selfieUrl" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "qrcodeId" TEXT,
    "hash" TEXT,
    "protocolo" TEXT,
    "cpfSnapshot" TEXT,
    "criadoPorId" TEXT NOT NULL,

    CONSTRAINT "RegistroPonto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_nome_key" ON "public"."Funcionario"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_cpf_key" ON "public"."Funcionario"("cpf");

-- CreateIndex
CREATE INDEX "Funcionario_grupoId_idx" ON "public"."Funcionario"("grupoId");

-- CreateIndex
CREATE INDEX "Funcionario_unidadeId_idx" ON "public"."Funcionario"("unidadeId");

-- CreateIndex
CREATE INDEX "Provisionamento_status_dataVenc_idx" ON "public"."Provisionamento"("status", "dataVenc");

-- CreateIndex
CREATE INDEX "Provisionamento_grupoId_unidadeId_idx" ON "public"."Provisionamento"("grupoId", "unidadeId");

-- CreateIndex
CREATE INDEX "ImportBatch_origem_status_idx" ON "public"."ImportBatch"("origem", "status");

-- CreateIndex
CREATE INDEX "ImportItem_batchId_status_idx" ON "public"."ImportItem"("batchId", "status");

-- CreateIndex
CREATE INDEX "ImportItem_origem_placa_idx" ON "public"."ImportItem"("origem", "placa");

-- CreateIndex
CREATE INDEX "ImportItem_movimentoId_idx" ON "public"."ImportItem"("movimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportItem_origem_checksum_key" ON "public"."ImportItem"("origem", "checksum");

-- CreateIndex
CREATE UNIQUE INDEX "PontoQrCode_code_key" ON "public"."PontoQrCode"("code");

-- CreateIndex
CREATE INDEX "PontoQrCode_unidadeId_idx" ON "public"."PontoQrCode"("unidadeId");

-- CreateIndex
CREATE INDEX "RegistroPonto_funcionarioId_timestamp_idx" ON "public"."RegistroPonto"("funcionarioId", "timestamp");

-- CreateIndex
CREATE INDEX "RegistroPonto_unidadeId_timestamp_idx" ON "public"."RegistroPonto"("unidadeId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "public"."PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Anomalia_type_idx" ON "public"."Anomalia"("type");

-- CreateIndex
CREATE INDEX "Anomalia_status_idx" ON "public"."Anomalia"("status");

-- CreateIndex
CREATE INDEX "Movimento_funcionarioId_idx" ON "public"."Movimento"("funcionarioId");

-- CreateIndex
CREATE INDEX "Movimento_updatedById_idx" ON "public"."Movimento"("updatedById");

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "public"."Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Movimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_importItemId_fkey" FOREIGN KEY ("importItemId") REFERENCES "public"."ImportItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Funcionario" ADD CONSTRAINT "Funcionario_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Funcionario" ADD CONSTRAINT "Funcionario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provisionamento" ADD CONSTRAINT "Provisionamento_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "public"."Movimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportItem" ADD CONSTRAINT "ImportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportItem" ADD CONSTRAINT "ImportItem_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "public"."Movimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PontoQrCode" ADD CONSTRAINT "PontoQrCode_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroPonto" ADD CONSTRAINT "RegistroPonto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "public"."Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroPonto" ADD CONSTRAINT "RegistroPonto_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroPonto" ADD CONSTRAINT "RegistroPonto_qrcodeId_fkey" FOREIGN KEY ("qrcodeId") REFERENCES "public"."PontoQrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroPonto" ADD CONSTRAINT "RegistroPonto_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
