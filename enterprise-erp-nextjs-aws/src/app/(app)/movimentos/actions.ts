'use server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireRole } from '@/lib/authz';
import { getCurrentUser } from '@/lib/session';

const CreateSchema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA']),
  dataLanc: z.coerce.date(),
  descricao: z.string().min(1),
  valor: z.number().positive(),
  grupoId: z.string().optional(),
  unidadeId: z.string().optional(),
  categoria: z.string().optional(),
  subcategoria: z.string().optional(),
  centroCusto: z.string().optional(),
  responsavel: z.string().optional(),
});

export async function createMovimento(input: unknown) {
  await requireRole(['create'], 'movimentos');
  const user = await getCurrentUser();
  const data = CreateSchema.parse(input);
  const result = await prisma.movimento.create({
    data: {
      ...data,
      competencia: new Date(
        data.dataLanc.getFullYear(),
        data.dataLanc.getMonth(),
        1
      ),
      valorAssinado: data.tipo === 'DESPESA' ? -data.valor : data.valor,
      criadoPorId: user!.id,
    },
  });
  return result;
}

const UpdateSchema = CreateSchema.extend({ id: z.string() });
export async function updateMovimento(input: unknown) {
  await requireRole(['update'], 'movimentos');
  const data = UpdateSchema.parse(input);
  const before = await prisma.movimento.findUnique({
    where: { id: data.id, deletedAt: null },
  });
  if (!before) throw new Error('Movimento não encontrado/arquivado');
  const result = await prisma.movimento.update({
    where: { id: data.id },
    data: {
      ...data,
      competencia: new Date(
        data.dataLanc.getFullYear(),
        data.dataLanc.getMonth(),
        1
      ),
      valorAssinado: data.tipo === 'DESPESA' ? -data.valor : data.valor,
    },
  });
  return { before, result };
}

const DeleteSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
});
export async function deleteMovimento(input: unknown) {
  await requireRole(['update'], 'movimentos');
  const user = await getCurrentUser();
  const { id, reason } = DeleteSchema.parse(input);
  const before = await prisma.movimento.findUnique({
    where: { id },
    include: { grupo: true, unidade: true },
  });
  if (!before) throw new Error('Movimento não encontrado');
  const result = await prisma.movimento.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: user!.id,
      deletedReason: reason ?? null,
    },
  });
  return { before, result };
}

const RestoreSchema = z.object({ id: z.string() });
export async function restoreMovimento(input: unknown) {
  await requireRole(['update'], 'movimentos');
  const { id } = RestoreSchema.parse(input);
  const before = await prisma.movimento.findUnique({ where: { id } });
  if (!before || !before.deletedAt) throw new Error('Movimento não arquivado');
  const result = await prisma.movimento.update({
    where: { id },
    data: { deletedAt: null, deletedById: null, deletedReason: null },
  });
  return { before, result };
}
