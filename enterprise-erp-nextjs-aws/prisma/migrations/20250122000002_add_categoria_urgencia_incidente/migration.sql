-- CreateEnum
CREATE TYPE "CategoriaChamado" AS ENUM ('FUNCIONARIO_FALTOU', 'FALTA_INSUMOS', 'PROBLEMA_LIMPEZA', 'PROBLEMA_ESTRUTURAL', 'OUTRO');

-- AlterTable
ALTER TABLE "Incidente" ADD COLUMN IF NOT EXISTS "categoria" "CategoriaChamado";
ALTER TABLE "Incidente" ADD COLUMN IF NOT EXISTS "urgencia" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Incidente_categoria_idx" ON "Incidente"("categoria");
CREATE INDEX IF NOT EXISTS "Incidente_urgencia_idx" ON "Incidente"("urgencia");

