import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { serializeTemplate, templateFullInclude } from '@/lib/checklists-operacionais/serializer';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

const payloadSchema = z.object({
  unidadeIds: z.array(z.string().min(1)).optional(),
  supervisorIds: z.array(z.string().min(1)).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'update')) {
    return NextResponse.json(forbiddenPayload('checklists', 'update'), {
      status: 403,
    });
  }

  const { id } = await params;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'validation_error',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // Se unidadeIds for um array vazio, buscar todas as unidades ativas
  let unidadeIdsResolved: Set<string>;
  
  if (payload.unidadeIds && payload.unidadeIds.length === 0) {
    // Array vazio = ativar para todas as unidades ativas
    const todasUnidades = await prisma.unidade.findMany({
      where: { ativa: true },
      select: { id: true },
    });
    unidadeIdsResolved = new Set(todasUnidades.map(u => u.id));
  } else {
    unidadeIdsResolved = new Set<string>(payload.unidadeIds ?? []);
  }

  if (payload.supervisorIds?.length) {
    const scopes = await Promise.all(
      payload.supervisorIds.map(supervisorId =>
        getSupervisorScope(supervisorId)
      )
    );
    scopes.forEach(scope => {
      scope.unidadeIds.forEach(id => unidadeIdsResolved.add(id));
    });
  }

  const unidadeIdsArray = Array.from(unidadeIdsResolved);

  try {
    const existingEscopos = await prisma.checklistEscopo.findMany({
      where: { templateId: id },
      select: {
        id: true,
        unidadeId: true,
        ativo: true,
      },
    });

    const unidadeIdsSet = new Set(unidadeIdsArray);
    const existingMap = new Map(
      existingEscopos.map(escopo => [escopo.unidadeId, escopo])
    );

    const toDeactivate = existingEscopos.filter(
      escopo => escopo.ativo && !unidadeIdsSet.has(escopo.unidadeId)
    );

    const unidadesInfo = unidadeIdsArray.length
      ? await prisma.unidade.findMany({
          where: { id: { in: unidadeIdsArray } },
          select: {
            id: true,
            mapeamentos: {
              where: { ativo: true },
              select: { grupoId: true },
              take: 1,
            },
          },
        })
      : [];

    const unidadeGroupMap = new Map<string, string | null>();
    unidadesInfo.forEach(unidade => {
      const grupoId = unidade.mapeamentos[0]?.grupoId ?? null;
      unidadeGroupMap.set(unidade.id, grupoId);
    });

    const operations = [];

    for (const escopo of toDeactivate) {
      operations.push(
        prisma.checklistEscopo.update({
          where: { id: escopo.id },
          data: { ativo: false },
        })
      );
    }

    for (const unidadeId of unidadeIdsArray) {
      const existing = existingMap.get(unidadeId);
      const grupoId = unidadeGroupMap.get(unidadeId) ?? null;

      if (existing) {
        operations.push(
          prisma.checklistEscopo.update({
            where: { id: existing.id },
            data: {
              ativo: true,
              grupoId,
            },
          })
        );
      } else {
        operations.push(
          prisma.checklistEscopo.create({
            data: {
              templateId: id,
              unidadeId,
              grupoId,
            },
          })
        );
      }
    }

    if (operations.length) {
      await prisma.$transaction(operations);
    }

    const updatedTemplate = await prisma.checklistTemplate.findUniqueOrThrow({
      where: { id },
      include: templateFullInclude,
    });

    return NextResponse.json({
      template: serializeTemplate(updatedTemplate),
    });
  } catch (error) {
    console.error('Erro ao atualizar escopos de checklist operacional:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível atualizar os escopos do checklist.',
      },
      { status: 500 }
    );
  }
}

