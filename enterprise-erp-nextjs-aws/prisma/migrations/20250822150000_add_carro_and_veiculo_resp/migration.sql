-- SAFE ADDITIVE MIGRATION: Carro model and Veiculo responsavel/observacoes

-- 1) Extend Veiculo with responsavelId and observacoes (guard if table exists)
DO $$
DECLARE tbl_exists BOOLEAN;
BEGIN
  SELECT to_regclass('"Veiculo"') IS NOT NULL INTO tbl_exists;
  IF tbl_exists THEN
    EXECUTE 'ALTER TABLE "Veiculo" ADD COLUMN IF NOT EXISTS "responsavelId" text';
    EXECUTE 'ALTER TABLE "Veiculo" ADD COLUMN IF NOT EXISTS "observacoes" text';
    BEGIN
      ALTER TABLE "Veiculo"
        ADD CONSTRAINT "Veiculo_responsavelId_fkey"
        FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Veiculo_responsavelId_idx" ON "Veiculo" ("responsavelId")';
  END IF;
END $$;

-- 2) Create Carro table if not exists
CREATE TABLE IF NOT EXISTS "Carro" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "nome" text NOT NULL,
  "placa" text NOT NULL,
  "unidadeId" text NOT NULL,
  "responsavelId" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "Carro"
    ADD CONSTRAINT "Carro_unidadeId_fkey"
    FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Carro"
    ADD CONSTRAINT "Carro_responsavelId_fkey"
    FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- unique placa
DO $$ BEGIN
  ALTER TABLE "Carro" ADD CONSTRAINT "Carro_placa_key" UNIQUE ("placa");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Carro_unidadeId_idx" ON "Carro" ("unidadeId");
CREATE INDEX IF NOT EXISTS "Carro_responsavelId_idx" ON "Carro" ("responsavelId");


