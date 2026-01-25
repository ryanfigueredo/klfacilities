-- CreateTable
CREATE TABLE "public"."ManifestacaoFuncionario" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "funcionarioNome" TEXT,
    "funcionarioCpf" TEXT,
    "unidadeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "resposta" TEXT,
    "respondidoPorId" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManifestacaoFuncionario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManifestacaoFuncionario_unidadeId_idx" ON "public"."ManifestacaoFuncionario"("unidadeId");

-- CreateIndex
CREATE INDEX "ManifestacaoFuncionario_status_idx" ON "public"."ManifestacaoFuncionario"("status");

-- CreateIndex
CREATE INDEX "ManifestacaoFuncionario_tipo_idx" ON "public"."ManifestacaoFuncionario"("tipo");

-- CreateIndex
CREATE INDEX "ManifestacaoFuncionario_createdAt_idx" ON "public"."ManifestacaoFuncionario"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ManifestacaoFuncionario" ADD CONSTRAINT "ManifestacaoFuncionario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManifestacaoFuncionario" ADD CONSTRAINT "ManifestacaoFuncionario_respondidoPorId_fkey" FOREIGN KEY ("respondidoPorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

