import { ChecklistPerguntaTipo } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type DefaultTemplateDefinition = {
  titulo: string;
  descricao?: string;
  grupos: Array<{
    titulo: string;
    descricao?: string;
    perguntas: Array<{
      titulo: string;
      descricao?: string;
      tipo: ChecklistPerguntaTipo;
      obrigatoria?: boolean;
      instrucoes?: string;
      opcoes?: string[];
    }>;
  }>;
};

const defaultTemplates: DefaultTemplateDefinition[] = [
  {
    titulo: 'Checklist de Limpeza',
    descricao:
      'Avaliação padrão de limpeza da unidade (salas administrativas, banheiros e áreas comuns).',
    grupos: [
      {
        titulo: 'Salas e áreas comuns',
        perguntas: [
          {
            titulo: 'Ambientes limpos e organizados?',
            tipo: 'BOOLEANO',
            obrigatoria: true,
          },
          {
            titulo: 'Houve recolhimento adequado do lixo?',
            tipo: 'BOOLEANO',
            obrigatoria: true,
          },
          {
            titulo: 'Observações gerais da limpeza',
            tipo: 'TEXTO',
            obrigatoria: false,
          },
        ],
      },
      {
        titulo: 'Registro fotográfico',
        perguntas: [
          {
            titulo: 'Anexar foto após a limpeza',
            tipo: 'FOTO',
            obrigatoria: false,
            instrucoes:
              'Capture uma foto que demonstre o estado final do ambiente após a limpeza.',
          },
        ],
      },
    ],
  },
];

export async function ensureDefaultChecklistTemplates(): Promise<
  Record<string, string>
> {
  const existing = await prisma.checklistTemplate.findMany({
    where: {
      titulo: { in: defaultTemplates.map(def => def.titulo) },
    },
    select: { id: true, titulo: true },
  });

  const existingMap = new Map(existing.map(item => [item.titulo, item.id]));
  const templateIds: Record<string, string> = {};

  for (const definition of defaultTemplates) {
    if (existingMap.has(definition.titulo)) {
      templateIds[definition.titulo] = existingMap.get(definition.titulo)!;
      continue;
    }

    const created = await prisma.checklistTemplate.create({
      data: {
        titulo: definition.titulo,
        descricao: definition.descricao,
        ativo: true,
        criadoPorId: null,
        atualizadoPorId: null,
        grupos: {
          create: definition.grupos.map((grupo, grupoIndex) => ({
            titulo: grupo.titulo,
            descricao: grupo.descricao,
            ordem: grupoIndex,
            perguntas: {
              create: grupo.perguntas.map((pergunta, perguntaIndex) => ({
                titulo: pergunta.titulo,
                descricao: pergunta.descricao,
                tipo: pergunta.tipo,
                obrigatoria: pergunta.obrigatoria ?? false,
                ordem: perguntaIndex,
                instrucoes: pergunta.instrucoes,
                opcoes: pergunta.opcoes ?? [],
              })),
            },
          })),
        },
      },
      select: { id: true, titulo: true },
    });

    templateIds[created.titulo] = created.id;
  }

  return templateIds;
}

export async function ensureDefaultChecklistsForAllUnits() {
  const templateIds = await ensureDefaultChecklistTemplates();

  const unidades = await prisma.unidade.findMany({
    select: {
      id: true,
      mapeamentos: {
        where: { ativo: true },
        select: { grupoId: true },
        take: 1,
      },
    },
  });

  // Buscar todos os escopos existentes de uma vez
  const templateIdArray = Object.values(templateIds);
  const unidadeIdArray = unidades.map(u => u.id);
  
  const existingEscopos = await prisma.checklistEscopo.findMany({
    where: {
      templateId: { in: templateIdArray },
      unidadeId: { in: unidadeIdArray },
    },
    select: {
      templateId: true,
      unidadeId: true,
    },
  });

  // Criar um Set para lookup rápido
  const existingEscoposSet = new Set(
    existingEscopos.map(e => `${e.templateId}:${e.unidadeId}`)
  );

  // Preparar todos os escopos que precisam ser criados
  const escoposToCreate: Array<{
    templateId: string;
    unidadeId: string;
    grupoId: string | null;
  }> = [];

  for (const unidade of unidades) {
    for (const templateId of templateIdArray) {
      const key = `${templateId}:${unidade.id}`;
      if (!existingEscoposSet.has(key)) {
        escoposToCreate.push({
          templateId,
          unidadeId: unidade.id,
          grupoId: unidade.mapeamentos[0]?.grupoId ?? null,
        });
      }
    }
  }

  // Criar todos os escopos em batch usando createMany
  if (escoposToCreate.length > 0) {
    await prisma.checklistEscopo.createMany({
      data: escoposToCreate,
      skipDuplicates: true,
    });
  }
}

// Removido: não precisamos mais de usuário system para criar templates
// Templates podem ser criados sem criadoPorId (null)


