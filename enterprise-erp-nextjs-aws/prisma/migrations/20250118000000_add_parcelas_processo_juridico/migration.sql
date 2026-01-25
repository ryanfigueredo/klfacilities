-- Adicionar role JURIDICO ao enum Role
-- Role JURIDICO já existe; manter linha apenas por segurança idempotente
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'JURIDICO';

-- Criar enum StatusParcela apenas se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'StatusParcela'
    ) THEN
        CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA');
    END IF;
END $$;

-- Renomear coluna cliente para reclamante, somente se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ProcessoJuridico'
          AND column_name = 'cliente'
    ) THEN
        ALTER TABLE "ProcessoJuridico" RENAME COLUMN "cliente" TO "reclamante";
    END IF;
END $$;

-- Renomear coluna valorProcesso para valorCausa, somente se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ProcessoJuridico'
          AND column_name = 'valorProcesso'
    ) THEN
        ALTER TABLE "ProcessoJuridico" RENAME COLUMN "valorProcesso" TO "valorCausa";
    END IF;
END $$;

ALTER TABLE "ProcessoJuridico" DROP COLUMN IF EXISTS "valorPagamento";
ALTER TABLE "ProcessoJuridico" DROP COLUMN IF EXISTS "dataVencimento";

-- Remover índice antigo de dataVencimento
DROP INDEX IF EXISTS "ProcessoJuridico_dataVencimento_idx";

-- Criar tabela ParcelaProcesso
CREATE TABLE IF NOT EXISTS "ParcelaProcesso" (
    "id" TEXT NOT NULL,
    "processoJuridicoId" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "mesVencimento" INTEGER NOT NULL,
    "anoVencimento" INTEGER,
    "status" "StatusParcela" NOT NULL DEFAULT 'PENDENTE',
    "notificadoEm" TIMESTAMP(3),
    "pagoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcelaProcesso_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "ParcelaProcesso_processoJuridicoId_idx" ON "ParcelaProcesso"("processoJuridicoId");
CREATE INDEX IF NOT EXISTS "ParcelaProcesso_status_idx" ON "ParcelaProcesso"("status");
CREATE INDEX IF NOT EXISTS "ParcelaProcesso_diaVencimento_mesVencimento_idx" ON "ParcelaProcesso"("diaVencimento", "mesVencimento");

-- Adicionar foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ParcelaProcesso_processoJuridicoId_fkey'
    ) THEN
        ALTER TABLE "ParcelaProcesso" 
        ADD CONSTRAINT "ParcelaProcesso_processoJuridicoId_fkey" 
        FOREIGN KEY ("processoJuridicoId") 
        REFERENCES "ProcessoJuridico"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

