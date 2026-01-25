-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'RH', 'SUPERVISOR', 'LUCIANO');

-- CreateEnum
CREATE TYPE "public"."TipoMov" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "public"."StatusProposta" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA', 'AJUSTES');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'RH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Grupo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanoConta" (
    "id" TEXT NOT NULL,
    "palavraChave" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "centroCusto" TEXT,

    CONSTRAINT "PlanoConta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Movimento" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoMov" NOT NULL,
    "dataLanc" TIMESTAMP(3) NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "centroCusto" TEXT,
    "documento" TEXT,
    "formaPagamento" TEXT,
    "valor" DECIMAL(65,30) NOT NULL,
    "valorAssinado" DECIMAL(65,30) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proposta" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "unidadeId" TEXT,
    "valor" DECIMAL(65,30),
    "status" "public"."StatusProposta" NOT NULL DEFAULT 'PENDENTE',
    "obsLuciano" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnexoProposta" (
    "id" TEXT NOT NULL,
    "propostaId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoProposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Auditoria" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "alvo" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_nome_key" ON "public"."Unidade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nome_key" ON "public"."Grupo"("nome");

-- CreateIndex
CREATE INDEX "Movimento_dataLanc_tipo_idx" ON "public"."Movimento"("dataLanc", "tipo");

-- CreateIndex
CREATE INDEX "Movimento_competencia_idx" ON "public"."Movimento"("competencia");

-- CreateIndex
CREATE INDEX "Movimento_grupoId_idx" ON "public"."Movimento"("grupoId");

-- CreateIndex
CREATE INDEX "Movimento_unidadeId_idx" ON "public"."Movimento"("unidadeId");

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposta" ADD CONSTRAINT "Proposta_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposta" ADD CONSTRAINT "Proposta_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnexoProposta" ADD CONSTRAINT "AnexoProposta_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "public"."Proposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
