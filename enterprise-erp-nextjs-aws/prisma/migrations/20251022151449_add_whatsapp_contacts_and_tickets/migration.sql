-- CreateEnum
CREATE TYPE "public"."StatusTicket" AS ENUM ('PENDENTE', 'CONCLUIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "public"."Unidade" ADD COLUMN     "emailSupervisor" TEXT,
ADD COLUMN     "whatsappLider" TEXT;

-- CreateTable
CREATE TABLE "public"."ticket_checklist" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "status" "public"."StatusTicket" NOT NULL DEFAULT 'PENDENTE',
    "whatsappMessageId" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPor" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_checklist_checklistId_key" ON "public"."ticket_checklist"("checklistId");

-- AddForeignKey
ALTER TABLE "public"."ticket_checklist" ADD CONSTRAINT "ticket_checklist_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."ChecklistDigital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_checklist" ADD CONSTRAINT "ticket_checklist_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "public"."Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
