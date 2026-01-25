-- Create ClienteFinal table
CREATE TABLE IF NOT EXISTS "ClienteFinal" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteFinal_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS "ClienteFinal_email_key" ON "ClienteFinal"("email");

-- Create indexes
CREATE INDEX IF NOT EXISTS "ClienteFinal_grupoId_idx" ON "ClienteFinal"("grupoId");
CREATE INDEX IF NOT EXISTS "ClienteFinal_unidadeId_idx" ON "ClienteFinal"("unidadeId");
CREATE INDEX IF NOT EXISTS "ClienteFinal_email_idx" ON "ClienteFinal"("email");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ClienteFinal_grupoId_fkey'
    ) THEN
        ALTER TABLE "ClienteFinal" 
        ADD CONSTRAINT "ClienteFinal_grupoId_fkey" 
        FOREIGN KEY ("grupoId") 
        REFERENCES "Grupo"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ClienteFinal_unidadeId_fkey'
    ) THEN
        ALTER TABLE "ClienteFinal" 
        ADD CONSTRAINT "ClienteFinal_unidadeId_fkey" 
        FOREIGN KEY ("unidadeId") 
        REFERENCES "Unidade"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Create ChecklistRelatorioConfirmacao table
CREATE TABLE IF NOT EXISTS "ChecklistRelatorioConfirmacao" (
    "id" TEXT NOT NULL,
    "respostaId" TEXT NOT NULL,
    "clienteFinalId" TEXT NOT NULL,
    "emailEnviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEm" TIMESTAMP(3),
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "tokenConfirmacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistRelatorioConfirmacao_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on tokenConfirmacao
CREATE UNIQUE INDEX IF NOT EXISTS "ChecklistRelatorioConfirmacao_tokenConfirmacao_key" ON "ChecklistRelatorioConfirmacao"("tokenConfirmacao");

-- Create indexes
CREATE INDEX IF NOT EXISTS "ChecklistRelatorioConfirmacao_respostaId_idx" ON "ChecklistRelatorioConfirmacao"("respostaId");
CREATE INDEX IF NOT EXISTS "ChecklistRelatorioConfirmacao_clienteFinalId_idx" ON "ChecklistRelatorioConfirmacao"("clienteFinalId");
CREATE INDEX IF NOT EXISTS "ChecklistRelatorioConfirmacao_tokenConfirmacao_idx" ON "ChecklistRelatorioConfirmacao"("tokenConfirmacao");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChecklistRelatorioConfirmacao_respostaId_fkey'
    ) THEN
        ALTER TABLE "ChecklistRelatorioConfirmacao" 
        ADD CONSTRAINT "ChecklistRelatorioConfirmacao_respostaId_fkey" 
        FOREIGN KEY ("respostaId") 
        REFERENCES "ChecklistResposta"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChecklistRelatorioConfirmacao_clienteFinalId_fkey'
    ) THEN
        ALTER TABLE "ChecklistRelatorioConfirmacao" 
        ADD CONSTRAINT "ChecklistRelatorioConfirmacao_clienteFinalId_fkey" 
        FOREIGN KEY ("clienteFinalId") 
        REFERENCES "ClienteFinal"("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
    END IF;
END $$;

