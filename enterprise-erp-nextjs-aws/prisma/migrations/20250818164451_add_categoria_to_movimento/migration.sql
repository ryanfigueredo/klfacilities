-- CreateEnum
CREATE TYPE "public"."TipoMovimento" AS ENUM ('RECEITA', 'DESPESA');

-- AlterTable
ALTER TABLE "public"."Movimento" ADD COLUMN     "categoriaId" TEXT;

-- CreateTable
CREATE TABLE "public"."Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "public"."TipoMovimento" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_tipo_key" ON "public"."Categoria"("nome", "tipo");

-- CreateIndex
CREATE INDEX "Movimento_categoriaId_idx" ON "public"."Movimento"("categoriaId");

-- AddForeignKey
ALTER TABLE "public"."Movimento" ADD CONSTRAINT "Movimento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
