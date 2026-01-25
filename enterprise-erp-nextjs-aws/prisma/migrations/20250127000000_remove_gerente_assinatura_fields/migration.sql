-- Remove foreign key constraint
ALTER TABLE "public"."ChecklistResposta" DROP CONSTRAINT IF EXISTS "ChecklistResposta_gerenteAssinadoPorId_fkey";

-- Drop index
DROP INDEX IF EXISTS "ChecklistResposta_gerenteAssinadoPorId_idx";

-- Remove columns
ALTER TABLE "public"."ChecklistResposta" DROP COLUMN IF EXISTS "gerenteAssinaturaFotoUrl";
ALTER TABLE "public"."ChecklistResposta" DROP COLUMN IF EXISTS "gerenteAssinadoEm";
ALTER TABLE "public"."ChecklistResposta" DROP COLUMN IF EXISTS "gerenteAssinadoPorId";

