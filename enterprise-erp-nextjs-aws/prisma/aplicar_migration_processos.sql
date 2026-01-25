-- Migration consolidada para Processos Jurídicos
-- Execute este arquivo diretamente no banco de dados

-- Criar enum StatusProcesso (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusProcesso') THEN
        CREATE TYPE "StatusProcesso" AS ENUM (
            'EM_ANDAMENTO', 
            'ARQUIVADO', 
            'AGUARDANDO_PAGAMENTO', 
            'PAGO', 
            'CANCELADO'
        );
    END IF;
END $$;

-- Criar tabela ProcessoJuridico (se não existir)
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

-- Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_status_idx" ON "ProcessoJuridico"("status");
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_dataVencimento_idx" ON "ProcessoJuridico"("dataVencimento");
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_numeroProcesso_idx" ON "ProcessoJuridico"("numeroProcesso");
CREATE INDEX IF NOT EXISTS "ProcessoJuridico_criadoPorId_idx" ON "ProcessoJuridico"("criadoPorId");

-- Adicionar foreign key (se não existir)
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

-- Criar trigger para updatedAt (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_processojuridico_updated_at'
    ) THEN
        CREATE TRIGGER update_processojuridico_updated_at
            BEFORE UPDATE ON "ProcessoJuridico"
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Marcar migration como aplicada
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid()::text,
    'checksum-placeholder',
    NOW(),
    '20250116010000_add_processo_juridico',
    NULL,
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING;

