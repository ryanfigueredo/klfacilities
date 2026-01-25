'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authz';
import { revalidatePath } from 'next/cache';

const unidadeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ativa: z.boolean().default(true),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export async function listUnidades() {
  await requireRole(['list'], 'unidades');

  return await prisma.unidade.findMany({
    orderBy: { nome: 'asc' },
  });
}

export async function createUnidade(data: z.infer<typeof unidadeSchema>) {
  await requireRole(['create'], 'unidades');

  const validated = unidadeSchema.parse(data);

  // Verificar se já existe
  const existing = await prisma.unidade.findUnique({
    where: { nome: validated.nome },
  });

  if (existing) {
    throw new Error('Unidade já existe');
  }

  const unidade = await prisma.unidade.create({
    data: validated,
  });

  revalidatePath('/config/unidades');
  return unidade;
}

export async function updateUnidade(
  id: string,
  data: z.infer<typeof unidadeSchema>
) {
  await requireRole(['update'], 'unidades');

  const validated = unidadeSchema.parse(data);

  // Verificar se já existe outro com o mesmo nome
  const existing = await prisma.unidade.findFirst({
    where: {
      nome: validated.nome,
      id: { not: id },
    },
  });

  if (existing) {
    throw new Error('Unidade já existe');
  }

  const unidade = await prisma.unidade.update({
    where: { id },
    data: validated,
  });

  revalidatePath('/config/unidades');
  return unidade;
}

export async function toggleUnidade(id: string) {
  await requireRole(['toggle'], 'unidades');

  const unidade = await prisma.unidade.findUnique({
    where: { id },
  });

  if (!unidade) {
    throw new Error('Unidade não encontrada');
  }

  const updated = await prisma.unidade.update({
    where: { id },
    data: { ativa: !unidade.ativa },
  });

  revalidatePath('/config/unidades');
  return updated;
}

const CreateUnitSchema = z.object({
  nome: z.string().min(2),
  grupoId: z.string().min(1),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
});

export async function createUnidadeWithMapping(input: unknown) {
  await requireRole(['create'], 'unidades');
  const { nome, grupoId, cidade, estado } = CreateUnitSchema.parse(input);

  // 1) cria (ou atualiza) a unidade
  const unidade = await prisma.unidade.upsert({
    where: { nome },
    update: {
      cidade: cidade || null,
      estado: estado || null,
    },
    create: {
      nome,
      cidade: cidade || null,
      estado: estado || null,
    },
  });

  // 2) busca ou cria um responsável padrão
  let responsavelPadrao = await prisma.responsavel.findFirst({
    where: { nome: 'Sem Responsável' },
  });

  if (!responsavelPadrao) {
    responsavelPadrao = await prisma.responsavel.create({
      data: { nome: 'Sem Responsável', ativo: true },
    });
  }

  // 3) cria o vínculo no mapeamento (grupo ↔ unidade ↔ responsável padrão)
  await prisma.mapeamentoGrupoUnidadeResponsavel.upsert({
    where: {
      grupoId_unidadeId_responsavelId: {
        grupoId,
        unidadeId: unidade.id,
        responsavelId: responsavelPadrao.id,
      },
    },
    update: { ativo: true },
    create: {
      grupoId,
      unidadeId: unidade.id,
      responsavelId: responsavelPadrao.id,
      ativo: true,
    },
  });

  revalidatePath('/config/unidades');
  return { unidade };
}
