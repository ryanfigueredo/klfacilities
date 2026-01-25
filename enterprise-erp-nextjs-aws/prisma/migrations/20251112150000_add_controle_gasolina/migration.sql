-- CreateEnum
CREATE TYPE "TipoCombustivel" AS ENUM ('GASOLINA', 'ALCOOL', 'DIESEL', 'FLEX');

-- CreateEnum
CREATE TYPE "SituacaoTanque" AS ENUM ('CHEIO', 'MEIO_TANQUE', 'QUASE_VAZIO');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT,
    "ano" INTEGER,
    "tipoCombustivel" "TipoCombustivel" NOT NULL,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "responsavelId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleUser" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KmRecord" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KmRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelRecord" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "litros" DOUBLE PRECISION NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "situacaoTanque" "SituacaoTanque" NOT NULL,
    "kmAtual" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotaRecord" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "kmSaida" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "partida" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "alterouRota" BOOLEAN NOT NULL DEFAULT false,
    "alteracaoRota" TEXT,
    "realizouAbastecimento" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_placa_key" ON "Vehicle"("placa");

-- CreateIndex
CREATE INDEX "Vehicle_grupoId_idx" ON "Vehicle"("grupoId");

-- CreateIndex
CREATE INDEX "Vehicle_unidadeId_idx" ON "Vehicle"("unidadeId");

-- CreateIndex
CREATE INDEX "Vehicle_responsavelId_idx" ON "Vehicle"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleUser_veiculoId_usuarioId_key" ON "VehicleUser"("veiculoId", "usuarioId");

-- CreateIndex
CREATE INDEX "VehicleUser_usuarioId_idx" ON "VehicleUser"("usuarioId");

-- CreateIndex
CREATE INDEX "KmRecord_veiculoId_idx" ON "KmRecord"("veiculoId");

-- CreateIndex
CREATE INDEX "KmRecord_usuarioId_idx" ON "KmRecord"("usuarioId");

-- CreateIndex
CREATE INDEX "KmRecord_createdAt_idx" ON "KmRecord"("createdAt");

-- CreateIndex
CREATE INDEX "FuelRecord_veiculoId_idx" ON "FuelRecord"("veiculoId");

-- CreateIndex
CREATE INDEX "FuelRecord_usuarioId_idx" ON "FuelRecord"("usuarioId");

-- CreateIndex
CREATE INDEX "FuelRecord_createdAt_idx" ON "FuelRecord"("createdAt");

-- CreateIndex
CREATE INDEX "RotaRecord_veiculoId_idx" ON "RotaRecord"("veiculoId");

-- CreateIndex
CREATE INDEX "RotaRecord_usuarioId_idx" ON "RotaRecord"("usuarioId");

-- CreateIndex
CREATE INDEX "RotaRecord_createdAt_idx" ON "RotaRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUser" ADD CONSTRAINT "VehicleUser_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUser" ADD CONSTRAINT "VehicleUser_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KmRecord" ADD CONSTRAINT "KmRecord_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KmRecord" ADD CONSTRAINT "KmRecord_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelRecord" ADD CONSTRAINT "FuelRecord_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelRecord" ADD CONSTRAINT "FuelRecord_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaRecord" ADD CONSTRAINT "RotaRecord_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaRecord" ADD CONSTRAINT "RotaRecord_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

