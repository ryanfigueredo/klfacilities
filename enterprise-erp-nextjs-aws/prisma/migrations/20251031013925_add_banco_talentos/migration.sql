-- CreateTable
CREATE TABLE "public"."Curriculo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "unidadeId" TEXT NOT NULL,
    "arquivoUrl" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curriculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Curriculo_unidadeId_idx" ON "public"."Curriculo"("unidadeId");

-- CreateIndex
CREATE INDEX "Curriculo_status_idx" ON "public"."Curriculo"("status");

-- CreateIndex
CREATE INDEX "Curriculo_createdAt_idx" ON "public"."Curriculo"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Curriculo" ADD CONSTRAINT "Curriculo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
