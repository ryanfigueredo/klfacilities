-- SAFE ADDITIVE MIGRATION: add grupoId/carroRespId/owner to Carro and create CarroResponsavel

-- 1) Create CarroResponsavel FIRST (if not exists)
CREATE TABLE IF NOT EXISTS "CarroResponsavel" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CarroResponsavel_ativo_idx" ON "CarroResponsavel" ("ativo");

-- 2) Carro extra columns
ALTER TABLE "Carro" ADD COLUMN IF NOT EXISTS "grupoId" text;
ALTER TABLE "Carro" ADD COLUMN IF NOT EXISTS "carroRespId" text;
ALTER TABLE "Carro" ADD COLUMN IF NOT EXISTS "ownerId" text;

DO $$ BEGIN
  ALTER TABLE "Carro"
    ADD CONSTRAINT "Carro_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  BEGIN
    ALTER TABLE "Carro"
      ADD CONSTRAINT "Carro_carroRespId_fkey" FOREIGN KEY ("carroRespId") REFERENCES "CarroResponsavel"("id") ON DELETE NO ACTION;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$ BEGIN
  ALTER TABLE "Carro"
    ADD CONSTRAINT "Carro_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


