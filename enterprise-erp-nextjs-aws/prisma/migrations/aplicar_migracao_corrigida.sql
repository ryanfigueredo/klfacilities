-- ✅ MIGRAÇÃO CORRIGIDA - Verifica tudo antes de criar

-- Criar tabela se não existir
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManifestacaoFuncionario_pkey" PRIMARY KEY ("id")
);

-- Índices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ManifestacaoFuncionario_unidadeId_idx') THEN
        CREATE INDEX "ManifestacaoFuncionario_unidadeId_idx" ON "public"."ManifestacaoFuncionario"("unidadeId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ManifestacaoFuncionario_status_idx') THEN
        CREATE INDEX "ManifestacaoFuncionario_status_idx" ON "public"."ManifestacaoFuncionario"("status");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ManifestacaoFuncionario_tipo_idx') THEN
        CREATE INDEX "ManifestacaoFuncionario_tipo_idx" ON "public"."ManifestacaoFuncionario"("tipo");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ManifestacaoFuncionario_createdAt_idx') THEN
        CREATE INDEX "ManifestacaoFuncionario_createdAt_idx" ON "public"."ManifestacaoFuncionario"("createdAt");
    END IF;
END $$;

-- Foreign Keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManifestacaoFuncionario_unidadeId_fkey') THEN
        ALTER TABLE "public"."ManifestacaoFuncionario" 
        ADD CONSTRAINT "ManifestacaoFuncionario_unidadeId_fkey" 
        FOREIGN KEY ("unidadeId") 
        REFERENCES "public"."Unidade"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManifestacaoFuncionario_respondidoPorId_fkey') THEN
        ALTER TABLE "public"."ManifestacaoFuncionario" 
        ADD CONSTRAINT "ManifestacaoFuncionario_respondidoPorId_fkey" 
        FOREIGN KEY ("respondidoPorId") 
        REFERENCES "public"."User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
