-- CreateEnum
CREATE TYPE "StatusSolicitacaoExclusao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "SolicitacaoExclusaoColaborador" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "solicitadoPorId" TEXT NOT NULL,
    "motivo" TEXT,
    "status" "StatusSolicitacaoExclusao" NOT NULL DEFAULT 'PENDENTE',
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoExclusaoColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoColaborador_status_idx" ON "SolicitacaoExclusaoColaborador"("status");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoColaborador_funcionarioId_idx" ON "SolicitacaoExclusaoColaborador"("funcionarioId");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoColaborador_solicitadoPorId_idx" ON "SolicitacaoExclusaoColaborador"("solicitadoPorId");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusaoColaborador_createdAt_idx" ON "SolicitacaoExclusaoColaborador"("createdAt");

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusaoColaborador" ADD CONSTRAINT "SolicitacaoExclusaoColaborador_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusaoColaborador" ADD CONSTRAINT "SolicitacaoExclusaoColaborador_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusaoColaborador" ADD CONSTRAINT "SolicitacaoExclusaoColaborador_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

