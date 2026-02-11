-- AlterTable (usando IF NOT EXISTS para evitar erro se coluna já existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ChecklistPerguntaTemplate'
          AND column_name = 'permiteAnexarFoto'
    ) THEN
        ALTER TABLE "public"."ChecklistPerguntaTemplate" 
        ADD COLUMN "permiteAnexarFoto" BOOLEAN NOT NULL DEFAULT false;
        
        COMMENT ON COLUMN "public"."ChecklistPerguntaTemplate"."permiteAnexarFoto" IS 'Permite anexar foto em qualquer tipo de pergunta';
    END IF;
END $$;

