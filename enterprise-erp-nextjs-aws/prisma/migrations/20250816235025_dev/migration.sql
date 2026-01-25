/*
  Warnings:

  - You are about to drop the `Auditoria` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "public"."AuditLog_resource_idx";

-- DropIndex
DROP INDEX "public"."AuditLog_timestamp_idx";

-- DropIndex
DROP INDEX "public"."AuditLog_userId_idx";

-- DropIndex
DROP INDEX "public"."MapeamentoGrupoUnidadeResponsavel_grupoId_idx";

-- DropIndex
DROP INDEX "public"."MapeamentoGrupoUnidadeResponsavel_responsavelId_idx";

-- DropIndex
DROP INDEX "public"."MapeamentoGrupoUnidadeResponsavel_unidadeId_idx";

-- DropIndex
DROP INDEX "public"."Movimento_categoria_idx";

-- DropIndex
DROP INDEX "public"."Movimento_competencia_idx";

-- DropIndex
DROP INDEX "public"."Movimento_dataLanc_tipo_idx";

-- DropIndex
DROP INDEX "public"."Movimento_grupoId_idx";

-- DropIndex
DROP INDEX "public"."Movimento_unidadeId_idx";

-- DropIndex
DROP INDEX "public"."PlanoConta_palavraChave_idx";

-- AlterTable
ALTER TABLE "public"."Grupo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."PlanoConta" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Unidade" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."Auditoria";
