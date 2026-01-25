'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authz';
import { revalidatePath } from 'next/cache';

const grupoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ativo: z.boolean().default(true),
});

export async function listGrupos() {
  await requireRole(['list'], 'grupos');

  return await prisma.grupo.findMany({
    orderBy: { nome: 'asc' },
  });
}

export async function createGrupo(data: z.infer<typeof grupoSchema>) {
  await requireRole(['create'], 'grupos');

  const validated = grupoSchema.parse(data);

  // Verificar se já existe
  const existing = await prisma.grupo.findUnique({
    where: { nome: validated.nome },
  });

  if (existing) {
    throw new Error('Grupo já existe');
  }

  const grupo = await prisma.grupo.create({
    data: validated,
  });

  revalidatePath('/config/grupos');
  return grupo;
}

export async function updateGrupo(
  id: string,
  data: z.infer<typeof grupoSchema>
) {
  await requireRole(['update'], 'grupos');

  const validated = grupoSchema.parse(data);

  // Verificar se já existe outro com o mesmo nome
  const existing = await prisma.grupo.findFirst({
    where: {
      nome: validated.nome,
      id: { not: id },
    },
  });

  if (existing) {
    throw new Error('Grupo já existe');
  }

  const grupo = await prisma.grupo.update({
    where: { id },
    data: validated,
  });

  revalidatePath('/config/grupos');
  return grupo;
}

export async function toggleGrupo(id: string) {
  await requireRole(['toggle'], 'grupos');

  const grupo = await prisma.grupo.findUnique({
    where: { id },
  });

  if (!grupo) {
    throw new Error('Grupo não encontrado');
  }

  const updated = await prisma.grupo.update({
    where: { id },
    data: { ativo: !grupo.ativo },
  });

  revalidatePath('/config/grupos');
  return updated;
}
