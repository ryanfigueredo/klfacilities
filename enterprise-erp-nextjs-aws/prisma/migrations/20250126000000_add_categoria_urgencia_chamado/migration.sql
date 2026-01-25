-- CreateTable
CREATE TABLE IF NOT EXISTS "CategoriaUrgenciaChamado" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "prazoHoras" INTEGER NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaUrgenciaChamado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CategoriaUrgenciaChamado_codigo_key" ON "CategoriaUrgenciaChamado"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CategoriaUrgenciaChamado_codigo_idx" ON "CategoriaUrgenciaChamado"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CategoriaUrgenciaChamado_ordem_idx" ON "CategoriaUrgenciaChamado"("ordem");

-- AlterTable
ALTER TABLE "Incidente" ADD COLUMN IF NOT EXISTS "categoriaUrgenciaId" TEXT;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_categoriaUrgenciaId_fkey" FOREIGN KEY ("categoriaUrgenciaId") REFERENCES "CategoriaUrgenciaChamado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Incidente_categoriaUrgenciaId_idx" ON "Incidente"("categoriaUrgenciaId");

-- Inserir categorias padrão (podem ser editadas depois com nomes específicos como "Funcionário Faltou", etc.)
INSERT INTO "CategoriaUrgenciaChamado" ("id", "codigo", "nome", "prazoHoras", "descricao", "ordem", "ativo", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'X', 'Urgência Crítica', 2, 'Resolver em 2 horas', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Y', 'Urgência Alta', 12, 'Resolver em 12 horas', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'A', 'Urgência Normal', 24, 'Resolver em 24 horas', 3, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'B', 'Urgência Baixa', 168, 'Resolver em 1 semana', 4, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'C', 'Urgência Muito Baixa', 360, 'Resolver em 15 dias +', 5, true, NOW(), NOW())
ON CONFLICT ("codigo") DO NOTHING;

