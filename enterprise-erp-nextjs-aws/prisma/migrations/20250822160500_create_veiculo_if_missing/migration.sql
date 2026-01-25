-- SAFE ADDITIVE MIGRATION: create Veiculo table if missing

DO $$ BEGIN
  IF to_regclass('"Veiculo"') IS NULL THEN
    CREATE TABLE "Veiculo" (
      "id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
      "placa" text UNIQUE NOT NULL,
      "descricao" text NULL,
      "ativo" boolean NOT NULL DEFAULT true,
      "grupoId" text NULL,
      "unidadeId" text NULL,
      "semParar" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

DO $$ BEGIN
  BEGIN
    ALTER TABLE "Veiculo"
      ADD CONSTRAINT "Veiculo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE NO ACTION;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN
    ALTER TABLE "Veiculo"
      ADD CONSTRAINT "Veiculo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE NO ACTION;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS "Veiculo_grupoId_idx" ON "Veiculo" ("grupoId");
CREATE INDEX IF NOT EXISTS "Veiculo_unidadeId_idx" ON "Veiculo" ("unidadeId");
CREATE INDEX IF NOT EXISTS "Veiculo_placa_idx" ON "Veiculo" ("placa");


