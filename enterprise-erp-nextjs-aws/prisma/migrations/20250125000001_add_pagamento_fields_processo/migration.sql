-- Adicionar campos de pagamento ao ProcessoJuridico
ALTER TABLE "ProcessoJuridico" 
  ADD COLUMN IF NOT EXISTS "custasProcessuais" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "contribuicoesPrevidenciarias" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "honorariosPericiais" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "dadosPagamento" TEXT,
  ADD COLUMN IF NOT EXISTS "contasBancarias" TEXT;

-- Adicionar campos de pagamento à ParcelaProcesso
ALTER TABLE "ParcelaProcesso"
  ADD COLUMN IF NOT EXISTS "comprovantePagamentoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "marcadoComoPagoPor" TEXT,
  ADD COLUMN IF NOT EXISTS "marcadoComoPagoEm" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "naoPago" BOOLEAN DEFAULT false;

-- Criar índice para marcadoComoPagoPor
CREATE INDEX IF NOT EXISTS "ParcelaProcesso_marcadoComoPagoPor_idx" ON "ParcelaProcesso"("marcadoComoPagoPor");

-- Adicionar foreign key para marcadoComoPagoPor (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ParcelaProcesso_marcadoComoPagoPor_fkey'
    ) THEN
        ALTER TABLE "ParcelaProcesso" 
        ADD CONSTRAINT "ParcelaProcesso_marcadoComoPagoPor_fkey" 
        FOREIGN KEY ("marcadoComoPagoPor") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;
