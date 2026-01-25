-- AlterTable: Tornar criadoPorId opcional em RegistroPonto
ALTER TABLE "public"."RegistroPonto" ALTER COLUMN "criadoPorId" DROP NOT NULL;

-- AlterTable: Tornar criadoPorId opcional em Incidente
ALTER TABLE "public"."Incidente" ALTER COLUMN "criadoPorId" DROP NOT NULL;

-- AlterTable: Tornar criadoPorId opcional em ChecklistTemplate
ALTER TABLE "public"."ChecklistTemplate" ALTER COLUMN "criadoPorId" DROP NOT NULL;

