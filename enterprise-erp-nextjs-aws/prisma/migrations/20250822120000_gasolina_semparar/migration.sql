-- SAFE ADDITIVE MIGRATION: Gasolina (Abastecimento) e Sem Parar
-- Regras: Somente ADD. Nenhum DROP/ALTER destrutivo.

-- 1) Índice opcional na origem de Movimento (se ainda não existir)
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'Movimento_origem_idx';
  IF NOT FOUND THEN
    EXECUTE 'CREATE INDEX "Movimento_origem_idx" ON "Movimento" ("origem")';
  END IF;
END $$;

-- 2) Tabela Abastecimento
CREATE TABLE IF NOT EXISTS "Abastecimento" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "movimentoId" text NOT NULL UNIQUE,
  "data" timestamptz NOT NULL,
  "placa" text NULL,
  "motorista" text NULL,
  "km" integer NULL,
  "litros" numeric NULL,
  "precoUnitario" numeric NULL,
  "valor" numeric NULL,
  "cidade" text NULL,
  "uf" text NULL,
  "estabelecimento" text NULL,
  "nsu" text NULL,
  "bandeira" text NULL,
  "autorizacao" text NULL,
  "produto" text NULL,
  "origem" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "Abastecimento"
    ADD CONSTRAINT "Abastecimento_movimentoId_fkey"
    FOREIGN KEY ("movimentoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Abastecimento_data_idx" ON "Abastecimento" ("data");
CREATE INDEX IF NOT EXISTS "Abastecimento_placa_idx" ON "Abastecimento" ("placa");
CREATE INDEX IF NOT EXISTS "Abastecimento_origem_idx" ON "Abastecimento" ("origem");

-- 3) Tabela ConciliacaoSemParar
CREATE TABLE IF NOT EXISTS "ConciliacaoSemParar" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "creditoId" text NOT NULL,
  "consumoId" text NOT NULL,
  "valor" numeric NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "ConciliacaoSemParar"
    ADD CONSTRAINT "ConciliacaoSemParar_creditoId_fkey"
    FOREIGN KEY ("creditoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciliacaoSemParar"
    ADD CONSTRAINT "ConciliacaoSemParar_consumoId_fkey"
    FOREIGN KEY ("consumoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ConciliacaoSemParar_creditoId_idx" ON "ConciliacaoSemParar" ("creditoId");
CREATE INDEX IF NOT EXISTS "ConciliacaoSemParar_consumoId_idx" ON "ConciliacaoSemParar" ("consumoId");


