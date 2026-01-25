-- Migration para remover roles LUCIANO e AUXILIAR_ADMIN
-- Atualizar enum Role removendo LUCIANO e AUXILIAR_ADMIN
-- Converter usuários com esses roles para RH ou ADMIN

-- Primeiro, atualizar usuários com roles antigas
-- Converter LUCIANO para RH
UPDATE "User" SET role = 'RH' WHERE role::text = 'LUCIANO';

-- Converter AUXILIAR_ADMIN para ADMIN (ou RH se preferir)
UPDATE "User" SET role = 'ADMIN' WHERE role::text = 'AUXILIAR_ADMIN';

-- Remover os valores do enum (isso requer recriar o enum)
-- Criar novo enum sem os valores antigos
DO $$ 
BEGIN
    -- Criar novo enum temporário
    CREATE TYPE "Role_new" AS ENUM ('MASTER', 'ADMIN', 'RH', 'SUPERVISOR', 'JURIDICO', 'OPERACIONAL');
    
    -- Remover default temporariamente para evitar erro de cast
    ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;

    -- Alterar coluna para usar novo enum
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";
    
    -- Restaurar default utilizando o novo enum
    ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'RH'::"Role_new";

    -- Remover enum antigo
    DROP TYPE "Role";
    
    -- Renomear novo enum
    ALTER TYPE "Role_new" RENAME TO "Role";
END $$;

