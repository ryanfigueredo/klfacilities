-- SAFE ADDITIVE MIGRATION: make Carro.unidadeId nullable

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Carro'
      AND column_name = 'unidadeId'
  ) THEN
    ALTER TABLE "Carro" ALTER COLUMN "unidadeId" DROP NOT NULL;
  END IF;
END $$;


