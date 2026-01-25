-- CreateEnum
CREATE TYPE "StatusIncidente" AS ENUM ('ABERTO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "Incidente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusIncidente" NOT NULL DEFAULT 'ABERTO',
    "grupoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "concluidoPorId" TEXT,
    "conclusaoNotas" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incidente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incidente_grupoId_idx" ON "Incidente"("grupoId");

-- CreateIndex
CREATE INDEX "Incidente_unidadeId_idx" ON "Incidente"("unidadeId");

-- CreateIndex
CREATE INDEX "Incidente_status_idx" ON "Incidente"("status");

-- CreateIndex
CREATE INDEX "Incidente_createdAt_idx" ON "Incidente"("createdAt");

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

