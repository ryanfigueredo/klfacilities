-- AlterTable
ALTER TABLE "public"."ChecklistPerguntaTemplate" ADD COLUMN     "permiteMultiplasFotos" BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN "public"."ChecklistPerguntaTemplate"."permiteMultiplasFotos" IS 'Permite adicionar múltiplas fotos quando tipo é FOTO';

