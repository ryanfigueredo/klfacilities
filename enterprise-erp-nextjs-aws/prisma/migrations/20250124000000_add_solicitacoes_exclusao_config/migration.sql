-- CreateEnum
CREATE TYPE "TipoSolicitacaoExclusao" AS ENUM ('GRUPO', 'UNIDADE', 'SUPERVISOR_SCOPE');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoExclusaoConfig" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "SolicitacaoExclusaoConfig" (
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

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoConfig_status_idx" ON "SolicitacaoExclusaoConfig"("status");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoConfig_solicitadoPorId_idx" ON "SolicitacaoExclusaoConfig"("solicitadoPorId");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoConfig_tipo_resourceId_idx" ON "SolicitacaoExclusaoConfig"("tipo", "resourceId");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoConfig_createdAt_idx" ON "SolicitacaoExclusaoConfig"("createdAt");

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusaoConfig" ADD CONSTRAINT "SolicitacaoExclusaoConfig_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusaoConfig" ADD CONSTRAINT "SolicitacaoExclusaoConfig_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

