-- Add origem fields to Curriculo table for Indeed integration

-- Add origem column (default MANUAL for existing records)
ALTER TABLE "Curriculo" ADD COLUMN IF NOT EXISTS "origem" text NOT NULL DEFAULT 'MANUAL';

-- Add origemId column (nullable)
ALTER TABLE "Curriculo" ADD COLUMN IF NOT EXISTS "origemId" text;

-- Add origemDados column (JSON, nullable)
ALTER TABLE "Curriculo" ADD COLUMN IF NOT EXISTS "origemDados" jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Curriculo_origem_idx" ON "Curriculo" ("origem");
CREATE INDEX IF NOT EXISTS "Curriculo_origemId_idx" ON "Curriculo" ("origemId");

