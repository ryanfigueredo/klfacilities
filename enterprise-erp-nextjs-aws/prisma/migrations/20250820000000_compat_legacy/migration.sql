-- === COMPATIBILIDADE LEGADA + GARANTIA DE COLUNAS CANÔNICAS ===

-- 1) Garantir colunas canônicas (não apaga nada)
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "grupoId" uuid;
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "unidadeId" uuid;
ALTER TABLE "Movimento" ADD COLUMN IF NOT EXISTS "categoriaId" uuid;

-- 2) Se colunas antigas existirem, copiar valores para as canônicas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='grupo_id') THEN
    EXECUTE 'UPDATE "Movimento" SET "grupoId" = ("grupo_id")::uuid WHERE "grupoId" IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='unidade_id') THEN
    EXECUTE 'UPDATE "Movimento" SET "unidadeId" = ("unidade_id")::uuid WHERE "unidadeId" IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='categoria_id') THEN
    EXECUTE 'UPDATE "Movimento" SET "categoriaId" = ("categoria_id")::uuid WHERE "categoriaId" IS NULL';
  END IF;
END$$;

-- 3) Criar colunas ALIAS para nomes legados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Movimento' AND column_name = 'grupoid'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN grupoid uuid GENERATED ALWAYS AS (("grupoId")::uuid) STORED';
    EXCEPTION WHEN others THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='grupoid') THEN
        EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN grupoid uuid';
        EXECUTE '
          CREATE OR REPLACE FUNCTION movimento_sync_grupoid() RETURNS trigger AS $f$
          BEGIN
            NEW.grupoid := (NEW."grupoId")::uuid;
            RETURN NEW;
          END;$f$ LANGUAGE plpgsql;
        ';
        EXECUTE '
          DROP TRIGGER IF EXISTS movimento_trg_sync_grupoid ON "Movimento";
          CREATE TRIGGER movimento_trg_sync_grupoid BEFORE INSERT OR UPDATE ON "Movimento"
          FOR EACH ROW EXECUTE FUNCTION movimento_sync_grupoid();
        ';
        EXECUTE 'UPDATE "Movimento" SET grupoid = ("grupoId")::uuid WHERE grupoid IS DISTINCT FROM (("grupoId")::uuid)';
      END IF;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Movimento' AND column_name = 'unidadeid'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN unidadeid uuid GENERATED ALWAYS AS (("unidadeId")::uuid) STORED';
    EXCEPTION WHEN others THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='unidadeid') THEN
        EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN unidadeid uuid';
        EXECUTE '
          CREATE OR REPLACE FUNCTION movimento_sync_unidadeid() RETURNS trigger AS $f$
          BEGIN
            NEW.unidadeid := (NEW."unidadeId")::uuid;
            RETURN NEW;
          END;$f$ LANGUAGE plpgsql;
        ';
        EXECUTE '
          DROP TRIGGER IF EXISTS movimento_trg_sync_unidadeid ON "Movimento";
          CREATE TRIGGER movimento_trg_sync_unidadeid BEFORE INSERT OR UPDATE ON "Movimento"
          FOR EACH ROW EXECUTE FUNCTION movimento_sync_unidadeid();
        ';
        EXECUTE 'UPDATE "Movimento" SET unidadeid = ("unidadeId")::uuid WHERE unidadeid IS DISTINCT FROM (("unidadeId")::uuid)';
      END IF;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Movimento' AND column_name = 'categoriaid'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN categoriaid uuid GENERATED ALWAYS AS (("categoriaId")::uuid) STORED';
    EXCEPTION WHEN others THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Movimento' AND column_name='categoriaid') THEN
        EXECUTE 'ALTER TABLE "Movimento" ADD COLUMN categoriaid uuid';
        EXECUTE '
          CREATE OR REPLACE FUNCTION movimento_sync_categoriaid() RETURNS trigger AS $f$
          BEGIN
            NEW.categoriaid := (NEW."categoriaId")::uuid;
            RETURN NEW;
          END;$f$ LANGUAGE plpgsql;
        ';
        EXECUTE '
          DROP TRIGGER IF EXISTS movimento_trg_sync_categoriaid ON "Movimento";
          CREATE TRIGGER movimento_trg_sync_categoriaid BEFORE INSERT OR UPDATE ON "Movimento"
          FOR EACH ROW EXECUTE FUNCTION movimento_sync_categoriaid();
        ';
        EXECUTE 'UPDATE "Movimento" SET categoriaid = ("categoriaId")::uuid WHERE categoriaid IS DISTINCT FROM (("categoriaId")::uuid)';
      END IF;
    END;
  END IF;
END$$;

-- 4) VIEW de compatibilidade
DROP VIEW IF EXISTS movimento_compat;
CREATE VIEW movimento_compat AS
SELECT
  m.*
FROM "Movimento" m;


