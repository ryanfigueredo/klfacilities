/*
  Warnings:

  - Added the required column `updatedAt` to the `Grupo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PlanoConta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Unidade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Grupo" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Movimento" ADD COLUMN     "responsavel" TEXT;

-- AlterTable
ALTER TABLE "public"."PlanoConta" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Unidade" ADD COLUMN     "ativa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."Responsavel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MapeamentoGrupoUnidadeResponsavel" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapeamentoGrupoUnidadeResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Responsavel_nome_key" ON "public"."Responsavel"("nome");

-- CreateIndex
CREATE INDEX "MapeamentoGrupoUnidadeResponsavel_grupoId_idx" ON "public"."MapeamentoGrupoUnidadeResponsavel"("grupoId");

-- CreateIndex
CREATE INDEX "MapeamentoGrupoUnidadeResponsavel_unidadeId_idx" ON "public"."MapeamentoGrupoUnidadeResponsavel"("unidadeId");

-- CreateIndex
CREATE INDEX "MapeamentoGrupoUnidadeResponsavel_responsavelId_idx" ON "public"."MapeamentoGrupoUnidadeResponsavel"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "MapeamentoGrupoUnidadeResponsavel_grupoId_unidadeId_respons_key" ON "public"."MapeamentoGrupoUnidadeResponsavel"("grupoId", "unidadeId", "responsavelId");

-- CreateIndex
CREATE INDEX "Movimento_categoria_idx" ON "public"."Movimento"("categoria");

-- CreateIndex
CREATE INDEX "PlanoConta_palavraChave_idx" ON "public"."PlanoConta"("palavraChave");

-- AddForeignKey
ALTER TABLE "public"."MapeamentoGrupoUnidadeResponsavel" ADD CONSTRAINT "MapeamentoGrupoUnidadeResponsavel_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapeamentoGrupoUnidadeResponsavel" ADD CONSTRAINT "MapeamentoGrupoUnidadeResponsavel_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapeamentoGrupoUnidadeResponsavel" ADD CONSTRAINT "MapeamentoGrupoUnidadeResponsavel_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "public"."Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
