-- AlterTable
ALTER TABLE "public"."ChecklistPerguntaTemplate" ADD COLUMN     "peso" INTEGER;

-- AlterTable
ALTER TABLE "public"."ChecklistRespostaPergunta" ADD COLUMN     "nota" INTEGER;

-- Add comment
COMMENT ON COLUMN "public"."ChecklistPerguntaTemplate"."peso" IS 'Peso da pergunta (1-5): 1=Péssimo, 2=Ruim, 3=Regular, 4=Bom, 5=Ótimo';

-- Add comment
COMMENT ON COLUMN "public"."ChecklistRespostaPergunta"."nota" IS 'Nota selecionada (1-5): 1=Péssimo, 2=Ruim, 3=Regular, 4=Bom, 5=Ótimo';

