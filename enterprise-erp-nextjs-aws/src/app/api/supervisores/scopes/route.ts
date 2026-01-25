import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

const includeRelations = {
  supervisor: { select: { id: true, name: true, email: true, whatsapp: true } },
  grupo: { select: { id: true, nome: true } },
  unidade: {
    select: { id: true, nome: true, cidade: true, estado: true },
  },
} as const;

const payloadSchema = z.object({
  supervisorId: z.string().min(1, 'supervisorId é obrigatório'),
  grupoId: z.string().optional(),
  unidadeId: z.string().optional(),
  grupoIds: z.array(z.string().min(1)).optional(),
  unidadeIds: z.array(z.string().min(1)).optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const scopes = await prisma.supervisorScope.findMany({
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
      grupo: { select: { id: true, nome: true } },
      unidade: { select: { id: true, nome: true, cidade: true, estado: true } },
    },
    orderBy: [{ supervisor: { name: 'asc' } }, { createdAt: 'asc' }],
  });

  return NextResponse.json(scopes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'payload_inválido',
        details: parsed.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const { supervisorId } = parsed.data;
  const grupoIdsInput = new Set<string>();
  const unidadeIdsInput = new Set<string>();

  // Adicionar grupos (já remove duplicatas usando Set)
  if (parsed.data.grupoId) grupoIdsInput.add(parsed.data.grupoId);
  if (parsed.data.grupoIds) {
    for (const id of parsed.data.grupoIds) {
      if (id && typeof id === 'string' && id.trim().length > 0) {
        grupoIdsInput.add(id.trim());
      }
    }
  }
  
  // Adicionar unidades (já remove duplicatas usando Set)
  if (parsed.data.unidadeId) unidadeIdsInput.add(parsed.data.unidadeId);
  if (parsed.data.unidadeIds) {
    for (const id of parsed.data.unidadeIds) {
      if (id && typeof id === 'string' && id.trim().length > 0) {
        unidadeIdsInput.add(id.trim());
      }
    }
  }

  if (!grupoIdsInput.size && !unidadeIdsInput.size) {
    return NextResponse.json(
      { error: 'Informe ao menos um grupo ou unidade.' },
      { status: 400 }
    );
  }

  const grupoIds = Array.from(grupoIdsInput);
  const unidadeIds = Array.from(unidadeIdsInput);

  const supervisor = await prisma.user.findUnique({
    where: { 
      id: supervisorId, 
      role: { in: ['SUPERVISOR', 'LAVAGEM'] }
    },
    select: { id: true },
  });

  if (!supervisor) {
    return NextResponse.json(
      { error: 'Supervisor não encontrado' },
      { status: 404 }
    );
  }

  if (grupoIds.length) {
    const grupos = await prisma.grupo.findMany({
      where: { id: { in: grupoIds } },
      select: { id: true },
    });
    if (grupos.length !== grupoIds.length) {
      return NextResponse.json({ error: 'Um ou mais grupos não existem' }, { status: 404 });
    }
  }

  if (unidadeIds.length) {
    const unidades = await prisma.unidade.findMany({
      where: { id: { in: unidadeIds } },
      select: { id: true },
    });
    if (unidades.length !== unidadeIds.length) {
      return NextResponse.json({ error: 'Uma ou mais unidades não existem' }, { status: 404 });
    }
  }

  const existingGroupScopes = grupoIds.length
    ? await prisma.supervisorScope.findMany({
        where: {
          supervisorId,
          unidadeId: null,
          grupoId: { in: grupoIds },
        },
        select: { grupoId: true },
      })
    : [];

  const existingUnitScopes = unidadeIds.length
    ? await prisma.supervisorScope.findMany({
        where: {
          supervisorId,
          grupoId: null,
          unidadeId: { in: unidadeIds },
        },
        select: { unidadeId: true },
      })
    : [];

  const existingGroupIds = new Set(existingGroupScopes.map(item => item.grupoId));
  const existingUnidadeIds = new Set(
    existingUnitScopes.map(item => item.unidadeId)
  );

  const groupIdsToCreate = grupoIds.filter(id => !existingGroupIds.has(id));
  const unidadeIdsToCreate = unidadeIds.filter(
    id => !existingUnidadeIds.has(id)
  );

  const operations = [
    ...groupIdsToCreate.map(grupoId =>
      prisma.supervisorScope.create({
        data: { supervisorId, grupoId },
        include: includeRelations,
      })
    ),
    ...unidadeIdsToCreate.map(unidadeId =>
      prisma.supervisorScope.create({
        data: { supervisorId, unidadeId },
        include: includeRelations,
      })
    ),
  ];

  const created =
    operations.length > 0 ? await prisma.$transaction(operations) : [];

  return NextResponse.json({
    created,
    skipped: {
      grupos: grupoIds.filter(id => existingGroupIds.has(id)),
      unidades: unidadeIds.filter(id => existingUnidadeIds.has(id)),
    },
  });
}
