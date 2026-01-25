-- AlterTable
ALTER TABLE "public"."ChecklistPerguntaTemplate" ADD COLUMN     "permiteAnexarFoto" BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN "public"."ChecklistPerguntaTemplate"."permiteAnexarFoto" IS 'Permite anexar foto em qualquer tipo de pergunta';

