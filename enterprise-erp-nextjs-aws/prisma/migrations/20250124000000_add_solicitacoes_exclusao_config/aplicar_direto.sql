-- Migração: add_solicitacoes_exclusao_config
-- Execute este SQL diretamente no banco se a migração não foi aplicada automaticamente

-- CreateEnum (se não existir)
DO $$ BEGIN
    CREATE TYPE "TipoSolicitacaoExclusao" AS ENUM ('GRUPO', 'UNIDADE', 'SUPERVISOR_SCOPE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (se não existir)
DO $$ BEGIN
    CREATE TYPE "StatusSolicitacaoExclusaoConfig" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (se não existir)
CREATE TABLE IF NOT EXISTS "SolicitacaoExclusaoConfig" (
    "id" TEXT NOT NULL,
    "tipo" "TipoSolicitacaoExclusao" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "solicitadoPorId" TEXT NOT NULL,
    "motivo" TEXT,
    "status" "StatusSolicitacaoExclusaoConfig" NOT NULL DEFAULT 'PENDENTE',
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoExclusaoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (se não existir)
CREATE INDEX IF NOT EXISTS "SolicitacaoExclusaoConfig_status_idx" ON "SolicitacaoExclusaoConfig"("status");
CREATE INDEX IF NOT EXISTS "SolicitacaoExclusaoConfig_solicitadoPorId_idx" ON "SolicitacaoExclusaoConfig"("solicitadoPorId");
CREATE INDEX IF NOT EXISTS "SolicitacaoExclusaoConfig_tipo_resourceId_idx" ON "SolicitacaoExclusaoConfig"("tipo", "resourceId");
CREATE INDEX IF NOT EXISTS "SolicitacaoExclusaoConfig_createdAt_idx" ON "SolicitacaoExclusaoConfig"("createdAt");

-- AddForeignKey (se não existir)
DO $$ BEGIN
    ALTER TABLE "SolicitacaoExclusaoConfig" ADD CONSTRAINT "SolicitacaoExclusaoConfig_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SolicitacaoExclusaoConfig" ADD CONSTRAINT "SolicitacaoExclusaoConfig_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

