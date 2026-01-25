-- Adicionar colunas observacao e editadoPorId à tabela RegistroPonto
ALTER TABLE "RegistroPonto" 
ADD COLUMN IF NOT EXISTS "observacao" TEXT,
ADD COLUMN IF NOT EXISTS "editadoPorId" TEXT;

-- Adicionar foreign key para editadoPorId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RegistroPonto_editadoPorId_fkey'
    ) THEN
        ALTER TABLE "RegistroPonto" 
        ADD CONSTRAINT "RegistroPonto_editadoPorId_fkey" 
        FOREIGN KEY ("editadoPorId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

