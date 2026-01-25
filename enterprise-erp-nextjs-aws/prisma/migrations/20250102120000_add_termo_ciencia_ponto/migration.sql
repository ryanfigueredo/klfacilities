-- CreateTable
CREATE TABLE "TermoCienciaPonto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" BIGINT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "hash" TEXT,
    "versaoTermo" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "TermoCienciaPonto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermoCienciaPonto_funcionarioId_key" ON "TermoCienciaPonto"("funcionarioId");

-- CreateIndex
CREATE INDEX "TermoCienciaPonto_funcionarioId_idx" ON "TermoCienciaPonto"("funcionarioId");

-- CreateIndex
CREATE INDEX "TermoCienciaPonto_assinadoEm_idx" ON "TermoCienciaPonto"("assinadoEm");

-- AddForeignKey
ALTER TABLE "TermoCienciaPonto" ADD CONSTRAINT "TermoCienciaPonto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

