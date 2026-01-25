-- CreateTable
CREATE TABLE "public"."SupervisorScope" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "grupoId" TEXT,
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorScope_supervisorId_grupoId_unidadeId_key"
  ON "public"."SupervisorScope" ("supervisorId", "grupoId", "unidadeId");

-- CreateIndex
CREATE INDEX "SupervisorScope_grupoId_idx"
  ON "public"."SupervisorScope" ("grupoId");

-- CreateIndex
CREATE INDEX "SupervisorScope_unidadeId_idx"
  ON "public"."SupervisorScope" ("unidadeId");

-- AddForeignKey
ALTER TABLE "public"."SupervisorScope"
  ADD CONSTRAINT "SupervisorScope_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupervisorScope"
  ADD CONSTRAINT "SupervisorScope_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupervisorScope"
  ADD CONSTRAINT "SupervisorScope_unidadeId_fkey"
  FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

