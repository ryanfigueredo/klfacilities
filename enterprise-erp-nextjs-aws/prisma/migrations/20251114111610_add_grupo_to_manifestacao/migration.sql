-- Add grupoId to ManifestacaoFuncionario table

-- Add grupoId column (nullable)
ALTER TABLE "ManifestacaoFuncionario" ADD COLUMN IF NOT EXISTS "grupoId" text;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ManifestacaoFuncionario_grupoId_fkey'
  ) THEN
    ALTER TABLE "ManifestacaoFuncionario" 
    ADD CONSTRAINT "ManifestacaoFuncionario_grupoId_fkey" 
    FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS "ManifestacaoFuncionario_grupoId_idx" ON "ManifestacaoFuncionario" ("grupoId");
