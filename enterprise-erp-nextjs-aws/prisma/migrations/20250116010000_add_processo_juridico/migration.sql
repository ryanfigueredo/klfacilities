-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('EM_ANDAMENTO', 'ARQUIVADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO');

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcessoJuridico" (
    "id" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "cliente" TEXT,
    "advogado" TEXT,
    "escritorio" TEXT,
    "tipoProcesso" TEXT,
    "valorProcesso" DECIMAL(65,30),
    "valorPagamento" DECIMAL(65,30),
    "dataVencimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "status" "StatusProcesso" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "arquivosUrl" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessoJuridico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_status_idx" ON "ProcessoJuridico"("status");

-- CreateIndex  
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_dataVencimento_idx" ON "ProcessoJuridico"("dataVencimento");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_numeroProcesso_idx" ON "ProcessoJuridico"("numeroProcesso");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_criadoPorId_idx" ON "ProcessoJuridico"("criadoPorId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ProcessoJuridico_criadoPorId_fkey'
    ) THEN
        ALTER TABLE "ProcessoJuridico" 
        ADD CONSTRAINT "ProcessoJuridico_criadoPorId_fkey" 
        FOREIGN KEY ("criadoPorId") 
        REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

