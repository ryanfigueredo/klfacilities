-- SAFE ADDITIVE FK FIX: Carro.responsavelId -> CarroResponsavel(id)

-- 1) Ensure column is nullable
ALTER TABLE "Carro" ALTER COLUMN "responsavelId" DROP NOT NULL;

-- 2) Drop old FK if exists
ALTER TABLE "Carro" DROP CONSTRAINT IF EXISTS "Carro_responsavelId_fkey";

-- 3) Recreate FK with SET NULL on delete and CASCADE on update
ALTER TABLE "Carro"
  ADD CONSTRAINT "Carro_responsavelId_fkey"
  FOREIGN KEY ("responsavelId")
  REFERENCES "CarroResponsavel"("id")
  ON UPDATE CASCADE
  ON DELETE SET NULL;


