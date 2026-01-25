-- Script de normalização de CPFs
-- Execute este script manualmente se a migração automática falhar
-- Este script apenas remove formatação, preservando todos os CPFs

-- Normalizar CPFs removendo formatação (pontos, traços e espaços)
UPDATE "Funcionario"
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL
  AND cpf != REGEXP_REPLACE(cpf, '[^0-9]', '', 'g');

-- Verificar resultado
-- SELECT COUNT(*) as total, COUNT(cpf) as com_cpf FROM "Funcionario";

