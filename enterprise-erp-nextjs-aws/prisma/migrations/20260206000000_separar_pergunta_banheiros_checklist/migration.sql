-- Separa a pergunta sobre banheiros da pergunta "Faça um resumo das condições das seguintes áreas"
-- que hoje mistura Banheiros, Mercearia, FLV e Detalhes. Cria pergunta específica para banheiros.

-- 1) Atualizar a pergunta existente para remover "Banheiros" do título/descrição
UPDATE "ChecklistPerguntaTemplate" p
SET
  "descricao" = TRIM(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(p."descricao", ''), E'Banheiros\\s*\\n?', '', 'g'), E'\\n\\n+', E'\n', 'g')),
  "titulo" = TRIM(REGEXP_REPLACE(p."titulo", '\\s*[,\\s]*[Bb]anheiros\\s*', ' ', 'g'))
FROM "ChecklistGrupoTemplate" g
WHERE p."grupoId" = g.id
  AND g."titulo" = 'Avaliação das Áreas da Loja'
  AND (p."descricao" LIKE '%Banheiros%' OR p."titulo" LIKE '%resumo%' AND p."titulo" LIKE '%áreas%');

-- 2) Inserir nova pergunta "Resumo das condições dos banheiros" no mesmo grupo
INSERT INTO "ChecklistPerguntaTemplate" (
  id,
  "grupoId",
  titulo,
  descricao,
  tipo,
  obrigatoria,
  ordem,
  instrucoes,
  opcoes,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  g.id,
  'Resumo das condições dos banheiros (sinalização e demais)',
  'Descreva as condições dos banheiros e sinalização.',
  'TEXTO',
  true,
  (SELECT COALESCE(MAX(p2.ordem), -1) + 1 FROM "ChecklistPerguntaTemplate" p2 WHERE p2."grupoId" = g.id),
  NULL,
  '{}',
  NOW(),
  NOW()
FROM "ChecklistGrupoTemplate" g
WHERE g."titulo" = 'Avaliação das Áreas da Loja'
  AND EXISTS (
    SELECT 1 FROM "ChecklistPerguntaTemplate" p
    WHERE p."grupoId" = g.id
      AND (p."descricao" LIKE '%Mercearia%' OR p."titulo" LIKE '%resumo%')
  );
