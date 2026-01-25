-- Normalizar todos os CPFs de funcionários removendo formatação (pontos, traços e espaços)
-- Esta migração apenas remove formatação, preservando todos os CPFs

-- Normalizar CPFs removendo todos os caracteres não numéricos
-- Apenas atualiza CPFs que têm formatação (pontos, traços, espaços)
UPDATE "Funcionario"
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL
  AND cpf != REGEXP_REPLACE(cpf, '[^0-9]', '', 'g');
