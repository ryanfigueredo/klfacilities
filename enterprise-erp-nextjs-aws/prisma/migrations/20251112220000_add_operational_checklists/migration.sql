-- CreateEnum
CREATE TYPE "ChecklistPerguntaTipo" AS ENUM ('TEXTO', 'FOTO', 'BOOLEANO', 'NUMERICO', 'SELECAO');

-- CreateEnum
CREATE TYPE "ChecklistRespostaStatus" AS ENUM ('RASCUNHO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorId" TEXT NOT NULL,
    "atualizadoPorId" TEXT,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistGrupoTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistGrupoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistPerguntaTemplate" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "ChecklistPerguntaTipo" NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT FALSE,
    "ordem" INTEGER NOT NULL,
    "instrucoes" TEXT,
    "opcoes" TEXT[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistPerguntaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistEscopo" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "grupoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
    "ultimoEnvioEm" TIMESTAMP(3),
    "ultimoSupervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistEscopo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResposta" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "escopoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "grupoId" TEXT,
    "supervisorId" TEXT NOT NULL,
    "status" "ChecklistRespostaStatus" NOT NULL DEFAULT 'CONCLUIDO',
    "observacoes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistResposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistRespostaPergunta" (
    "id" TEXT NOT NULL,
    "respostaId" TEXT NOT NULL,
    "perguntaId" TEXT NOT NULL,
    "valorTexto" TEXT,
    "valorBoolean" BOOLEAN,
    "valorNumero" DOUBLE PRECISION,
    "valorOpcao" TEXT,
    "fotoUrl" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistRespostaPergunta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplate_ativo_idx" ON "ChecklistTemplate"("ativo");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_createdAt_idx" ON "ChecklistTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "ChecklistGrupoTemplate_templateId_ordem_idx" ON "ChecklistGrupoTemplate"("templateId", "ordem");

-- CreateIndex
CREATE INDEX "ChecklistPerguntaTemplate_grupoId_ordem_idx" ON "ChecklistPerguntaTemplate"("grupoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistEscopo_templateId_unidadeId_key" ON "ChecklistEscopo"("templateId", "unidadeId");

-- CreateIndex
CREATE INDEX "ChecklistEscopo_unidadeId_idx" ON "ChecklistEscopo"("unidadeId");

-- CreateIndex
CREATE INDEX "ChecklistEscopo_grupoId_idx" ON "ChecklistEscopo"("grupoId");

-- CreateIndex
CREATE INDEX "ChecklistEscopo_ativo_idx" ON "ChecklistEscopo"("ativo");

-- CreateIndex
CREATE INDEX "ChecklistResposta_templateId_idx" ON "ChecklistResposta"("templateId");

-- CreateIndex
CREATE INDEX "ChecklistResposta_unidadeId_idx" ON "ChecklistResposta"("unidadeId");

-- CreateIndex
CREATE INDEX "ChecklistResposta_grupoId_idx" ON "ChecklistResposta"("grupoId");

-- CreateIndex
CREATE INDEX "ChecklistResposta_supervisorId_idx" ON "ChecklistResposta"("supervisorId");

-- CreateIndex
CREATE INDEX "ChecklistResposta_status_idx" ON "ChecklistResposta"("status");

-- CreateIndex
CREATE INDEX "ChecklistResposta_createdAt_idx" ON "ChecklistResposta"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistRespostaPergunta_respostaId_perguntaId_key" ON "ChecklistRespostaPergunta"("respostaId", "perguntaId");

-- CreateIndex
CREATE INDEX "ChecklistRespostaPergunta_perguntaId_idx" ON "ChecklistRespostaPergunta"("perguntaId");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistGrupoTemplate" ADD CONSTRAINT "ChecklistGrupoTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistPerguntaTemplate" ADD CONSTRAINT "ChecklistPerguntaTemplate_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ChecklistGrupoTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistEscopo" ADD CONSTRAINT "ChecklistEscopo_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistEscopo" ADD CONSTRAINT "ChecklistEscopo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistEscopo" ADD CONSTRAINT "ChecklistEscopo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_escopoId_fkey" FOREIGN KEY ("escopoId") REFERENCES "ChecklistEscopo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResposta" ADD CONSTRAINT "ChecklistResposta_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRespostaPergunta" ADD CONSTRAINT "ChecklistRespostaPergunta_respostaId_fkey" FOREIGN KEY ("respostaId") REFERENCES "ChecklistResposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRespostaPergunta" ADD CONSTRAINT "ChecklistRespostaPergunta_perguntaId_fkey" FOREIGN KEY ("perguntaId") REFERENCES "ChecklistPerguntaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

