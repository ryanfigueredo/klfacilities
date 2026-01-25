-- Additive enum change: add AUXILIAR_ADMIN while keeping LUCIANO
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'AUXILIAR_ADMIN'
  ) THEN
    ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'AUXILIAR_ADMIN';
  END IF;
END $$;


