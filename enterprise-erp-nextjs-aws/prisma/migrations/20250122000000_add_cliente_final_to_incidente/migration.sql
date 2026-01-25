-- Add clienteFinalId column to Incidente table
ALTER TABLE "Incidente" ADD COLUMN IF NOT EXISTS "clienteFinalId" TEXT;

-- Create index for clienteFinalId
CREATE INDEX IF NOT EXISTS "Incidente_clienteFinalId_idx" ON "Incidente"("clienteFinalId");

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Incidente_clienteFinalId_fkey'
    ) THEN
        ALTER TABLE "Incidente" 
        ADD CONSTRAINT "Incidente_clienteFinalId_fkey" 
        FOREIGN KEY ("clienteFinalId") 
        REFERENCES "ClienteFinal"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

