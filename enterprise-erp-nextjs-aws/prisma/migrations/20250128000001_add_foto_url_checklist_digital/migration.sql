-- AlterTable
ALTER TABLE "public"."ChecklistDigital" ADD COLUMN     "fotoUrl" TEXT;

-- Comment
COMMENT ON COLUMN "public"."ChecklistDigital"."fotoUrl" IS 'URL da foto anexada (S3)';

