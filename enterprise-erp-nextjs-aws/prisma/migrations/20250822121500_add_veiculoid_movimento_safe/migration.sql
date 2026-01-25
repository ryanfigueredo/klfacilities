-- SAFE ADDITIVE MIGRATION: add veiculoId to Movimento if missing

-- 1) Add column if not exists
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "veiculoId" text;

-- 2) Add FK to Veiculo if table exists; ignore if already present
DO $$
DECLARE
  fk_exists BOOLEAN;
  tbl_exists BOOLEAN;
BEGIN
  SELECT to_regclass('"Veiculo"') IS NOT NULL INTO tbl_exists;
  IF tbl_exists THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'Movimento'
        AND tc.constraint_name = 'Movimento_veiculoId_fkey'
    ) INTO fk_exists;
    IF NOT fk_exists THEN
      BEGIN
        ALTER TABLE "Movimento"
          ADD CONSTRAINT "Movimento_veiculoId_fkey"
          FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN
        -- ignore
        NULL;
      END;
    END IF;
  END IF;
END $$;

-- 3) Optional index
CREATE INDEX IF NOT EXISTS "Movimento_veiculoId_idx" ON "Movimento" ("veiculoId");


