-- SAFE ADDITIVE MIGRATION: add importItemId to Movimento if missing

-- 1) Add column if not exists
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "importItemId" text;

-- 2) Optional unique index (aligns with one-to-one linking use-cases)
DO $$ BEGIN
  PERFORM 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'Movimento_importItemId_idx';
  IF NOT FOUND THEN
    EXECUTE 'CREATE INDEX "Movimento_importItemId_idx" ON "Movimento" ("importItemId")';
  END IF;
END $$;

-- 3) Optional FK to ImportItem if table exists
DO $$
DECLARE
  fk_exists BOOLEAN;
  tbl_exists BOOLEAN;
BEGIN
  SELECT to_regclass('"ImportItem"') IS NOT NULL INTO tbl_exists;
  IF tbl_exists THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'Movimento'
        AND tc.constraint_name = 'Movimento_importItemId_fkey'
    ) INTO fk_exists;
    IF NOT fk_exists THEN
      BEGIN
        ALTER TABLE "Movimento"
          ADD CONSTRAINT "Movimento_importItemId_fkey"
          FOREIGN KEY ("importItemId") REFERENCES "ImportItem"("id") ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$;


