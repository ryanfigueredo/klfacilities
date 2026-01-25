-- Migration para adicionar roles MASTER e OPERACIONAL
-- Adicionar novos valores ao enum Role

DO $$ 
BEGIN
    -- Adicionar novos valores ao enum existente
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MASTER';
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPERACIONAL';
END $$;

