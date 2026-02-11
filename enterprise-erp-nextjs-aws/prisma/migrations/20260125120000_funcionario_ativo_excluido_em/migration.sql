-- AlterTable: add soft-delete fields to Funcionario (preserve records for legal use)
ALTER TABLE "Funcionario" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Funcionario" ADD COLUMN IF NOT EXISTS "excluidoEm" TIMESTAMP(3);

-- Index for filtering active/inactive
CREATE INDEX IF NOT EXISTS "Funcionario_ativo_idx" ON "Funcionario"("ativo");
