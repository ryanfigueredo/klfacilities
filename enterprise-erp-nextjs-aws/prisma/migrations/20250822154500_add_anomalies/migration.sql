-- SAFE ADDITIVE MIGRATION: anomaly enums, fields on Movimento, and Anomalia table

-- 1) Enums created via Prisma diff (handled in client). Ensure columns exist.

-- 2) Columns on Movimento
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "anomalyHash" varchar(128);
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "anomalyType" text;
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "anomalyStatus" text;

CREATE INDEX IF NOT EXISTS "Movimento_anomalyType_idx" ON "Movimento" ("anomalyType");
CREATE INDEX IF NOT EXISTS "Movimento_anomalyStatus_idx" ON "Movimento" ("anomalyStatus");
CREATE INDEX IF NOT EXISTS "Movimento_anomalyHash_idx" ON "Movimento" ("anomalyHash");

-- 3) Anomalia table
CREATE TABLE IF NOT EXISTS "Anomalia" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "movimentoIds" text[] NOT NULL,
  "type" text NOT NULL,
  "hash" varchar(128) NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "notes" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "resolvedAt" timestamptz NULL,
  "resolvedBy" text NULL
);

CREATE INDEX IF NOT EXISTS "Anomalia_type_idx" ON "Anomalia" ("type");
CREATE INDEX IF NOT EXISTS "Anomalia_status_idx" ON "Anomalia" ("status");
CREATE INDEX IF NOT EXISTS "Anomalia_hash_idx" ON "Anomalia" ("hash");


