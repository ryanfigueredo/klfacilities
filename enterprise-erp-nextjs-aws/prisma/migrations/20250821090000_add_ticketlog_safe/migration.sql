-- SAFE ADDITIVE MIGRATION: Ticket Log
-- Rules: Only ADD columns/tables/indexes. No drops, no enum changes.

-- 1) Add optional columns to Movimento
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "parentId" text;
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "origem" text;

-- 2) Create new table RateioMovimento (credit allocation)
CREATE TABLE IF NOT EXISTS "RateioMovimento" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "movimentoId" text NOT NULL,
  "grupoId" text NULL,
  "unidadeId" text NULL,
  "percentual" numeric NULL,
  "valor" numeric NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- FKs (CASCADE for child rows only)
DO $$ BEGIN
  ALTER TABLE "RateioMovimento"
    ADD CONSTRAINT "RateioMovimento_movimentoId_fkey"
    FOREIGN KEY ("movimentoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RateioMovimento"
    ADD CONSTRAINT "RateioMovimento_grupoId_fkey"
    FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RateioMovimento"
    ADD CONSTRAINT "RateioMovimento_unidadeId_fkey"
    FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Create table ConciliacaoTicketLog (reconciliation)
CREATE TABLE IF NOT EXISTS "ConciliacaoTicketLog" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "creditoId" text NOT NULL,
  "consumoId" text NOT NULL,
  "valor" numeric NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "ConciliacaoTicketLog"
    ADD CONSTRAINT "ConciliacaoTicketLog_creditoId_fkey"
    FOREIGN KEY ("creditoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciliacaoTicketLog"
    ADD CONSTRAINT "ConciliacaoTicketLog_consumoId_fkey"
    FOREIGN KEY ("consumoId") REFERENCES "Movimento"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Indexes (standard)
CREATE INDEX IF NOT EXISTS "Movimento_parentId_idx" ON "Movimento" ("parentId");
CREATE INDEX IF NOT EXISTS "RateioMovimento_movimentoId_idx" ON "RateioMovimento" ("movimentoId");
CREATE INDEX IF NOT EXISTS "RateioMovimento_grupoId_idx" ON "RateioMovimento" ("grupoId");
CREATE INDEX IF NOT EXISTS "RateioMovimento_unidadeId_idx" ON "RateioMovimento" ("unidadeId");
CREATE INDEX IF NOT EXISTS "ConciliacaoTicketLog_creditoId_idx" ON "ConciliacaoTicketLog" ("creditoId");
CREATE INDEX IF NOT EXISTS "ConciliacaoTicketLog_consumoId_idx" ON "ConciliacaoTicketLog" ("consumoId");

-- 5) Optional: CONCURRENTLY indexes for large tables (best-effort)
-- Note: This may fail in transactional contexts; errors other than "already exists" will bubble.
DO $$ BEGIN
  EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movimento_parentId_idx_conc" ON "Movimento" ("parentId")';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE NOT IN ('42P07','0A000','25001') THEN RAISE; END IF;
END $$;


