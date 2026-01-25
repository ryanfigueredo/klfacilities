-- ✅ MIGRAÇÃO SEGURA - Apenas cria tabela nova
-- Execute este SQL no seu banco PostgreSQL (Neon, Supabase, etc.)

CREATE TABLE IF NOT EXISTS "public"."ManifestacaoFuncionario" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "funcionarioNome" TEXT,
    "funcionarioCpf" TEXT,
    "unidadeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "resposta" TEXT,
    "respondidoPorId" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManifestacaoFuncionario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ManifestacaoFuncionario_unidadeId_idx" ON "public"."ManifestacaoFuncionario"("unidadeId");
CREATE INDEX IF NOT EXISTS "ManifestacaoFuncionario_status_idx" ON "public"."ManifestacaoFuncionario"("status");
CREATE INDEX IF NOT EXISTS "ManifestacaoFuncionario_tipo_idx" ON "public"."ManifestacaoFuncionario"("tipo");
CREATE INDEX IF NOT EXISTS "ManifestacaoFuncionario_createdAt_idx" ON "public"."ManifestacaoFuncionario"("createdAt");

-- Foreign Keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManifestacaoFuncionario_unidadeId_fkey') THEN
        ALTER TABLE "public"."ManifestacaoFuncionario" 
        ADD CONSTRAINT "ManifestacaoFuncionario_unidadeId_fkey" 
        FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManifestacaoFuncionario_respondidoPorId_fkey') THEN
        ALTER TABLE "public"."ManifestacaoFuncionario" 
        ADD CONSTRAINT "ManifestacaoFuncionario_respondidoPorId_fkey" 
        FOREIGN KEY ("respondidoPorId") REFERENCES "public"."User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
