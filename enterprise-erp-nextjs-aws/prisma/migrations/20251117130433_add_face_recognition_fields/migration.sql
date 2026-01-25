-- Add face recognition fields to Funcionario
ALTER TABLE "public"."Funcionario" ADD COLUMN IF NOT EXISTS "fotoUrl" TEXT;
ALTER TABLE "public"."Funcionario" ADD COLUMN IF NOT EXISTS "faceDescriptor" JSONB;
