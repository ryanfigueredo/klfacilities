-- Adicionar campo codigo ao modelo Funcionario
ALTER TABLE "Funcionario" ADD COLUMN IF NOT EXISTS "codigo" INTEGER;

-- Criar índice para o campo codigo
CREATE INDEX IF NOT EXISTS "Funcionario_codigo_idx" ON "Funcionario"("codigo");

