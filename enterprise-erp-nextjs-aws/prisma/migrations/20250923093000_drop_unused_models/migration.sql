-- Drop FKs/columns that point to tables we are removing (only if they exist)
DO $$ 
BEGIN
    -- Drop columns only if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Movimento' AND column_name = 'veiculoId') THEN
        ALTER TABLE "Movimento" DROP COLUMN "veiculoId" CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ImportItem' AND column_name = 'veiculoId') THEN
        ALTER TABLE "ImportItem" DROP COLUMN "veiculoId" CASCADE;
    END IF;
END $$;

-- Drop child tables first (those that depend on others)
DROP TABLE IF EXISTS "AnexoProposta" CASCADE;
DROP TABLE IF EXISTS "ConciliacaoSemParar" CASCADE;
DROP TABLE IF EXISTS "ConciliacaoTicketLog" CASCADE;
DROP TABLE IF EXISTS "Abastecimento" CASCADE;

-- Then drop parents
DROP TABLE IF EXISTS "Proposta" CASCADE;
DROP TABLE IF EXISTS "RateioMovimento" CASCADE;
DROP TABLE IF EXISTS "Veiculo" CASCADE;
DROP TABLE IF EXISTS "Carro" CASCADE;
DROP TABLE IF EXISTS "CarroResponsavel" CASCADE;
DROP TABLE IF EXISTS "PlanoConta" CASCADE;

-- Note: This migration intentionally does not touch data from other tables.

