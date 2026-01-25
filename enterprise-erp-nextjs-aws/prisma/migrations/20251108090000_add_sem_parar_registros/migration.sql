-- Adiciona tabela para registros de gastos Sem Parar

CREATE TABLE "SemPararRegistro" (
  "id" TEXT NOT NULL,
  "veiculoId" TEXT NOT NULL,
  "data" DATE NOT NULL,
  "valor" DECIMAL(10,2) NOT NULL,
  "descricao" TEXT,
  "local" TEXT,
  "tipo" TEXT DEFAULT 'PEDAGIO',
  "arquivoImportacao" TEXT,
  "linhaPlanilha" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,

  CONSTRAINT "SemPararRegistro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SemPararRegistro_data_idx" ON "SemPararRegistro" ("data");
CREATE INDEX "SemPararRegistro_veiculoId_idx" ON "SemPararRegistro" ("veiculoId");

ALTER TABLE "SemPararRegistro"
  ADD CONSTRAINT "SemPararRegistro_veiculoId_fkey"
  FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemPararRegistro"
  ADD CONSTRAINT "SemPararRegistro_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

