-- CreateTable
CREATE TABLE "FuncionarioUnidade" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuncionarioUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FuncionarioUnidade_funcionarioId_unidadeId_key" ON "FuncionarioUnidade"("funcionarioId", "unidadeId");

-- CreateIndex
CREATE INDEX "FuncionarioUnidade_funcionarioId_idx" ON "FuncionarioUnidade"("funcionarioId");

-- CreateIndex
CREATE INDEX "FuncionarioUnidade_unidadeId_idx" ON "FuncionarioUnidade"("unidadeId");

-- AddForeignKey
ALTER TABLE "FuncionarioUnidade" ADD CONSTRAINT "FuncionarioUnidade_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioUnidade" ADD CONSTRAINT "FuncionarioUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: para cada funcionário com unidadeId, inserir em FuncionarioUnidade (evita duplicata por unique)
INSERT INTO "FuncionarioUnidade" ("id", "funcionarioId", "unidadeId")
SELECT gen_random_uuid()::text, "id", "unidadeId"
FROM "Funcionario"
WHERE "unidadeId" IS NOT NULL
ON CONFLICT ("funcionarioId", "unidadeId") DO NOTHING;
