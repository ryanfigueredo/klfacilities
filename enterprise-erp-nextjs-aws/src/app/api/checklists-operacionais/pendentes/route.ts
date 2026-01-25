import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { ensureDefaultChecklistsForAllUnits } from '@/lib/checklists-operacionais/defaults';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  // Executar ensureDefaultChecklistsForAllUnits em background (não bloqueia a resposta)
  // A função foi otimizada para usar batch operations, então é muito mais rápida
  ensureDefaultChecklistsForAllUnits().catch(console.error);

  let unidadeIds: string[] | undefined;

  // Apenas SUPERVISOR e LAVAGEM devem ter filtro por scope
  // MASTER, ADMIN e OPERACIONAL veem todos os checklists
  if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.length) {
      return NextResponse.json({ escopos: [] });
    }
    unidadeIds = scope.unidadeIds;
  }

  const escopos = await prisma.checklistEscopo.findMany({
    where: {
      ativo: true,
      ...(unidadeIds ? { unidadeId: { in: unidadeIds } } : {}),
      template: {
        ativo: true,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      templateId: true,
      unidadeId: true,
      grupoId: true,
      ativo: true,
      ultimoEnvioEm: true,
      ultimoSupervisorId: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
        },
      },
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      grupo: {
        select: {
          id: true,
          nome: true,
        },
      },
      respostas: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          observacoes: true,
          createdAt: true,
          submittedAt: true,
          supervisorId: true,
        },
      },
    },
  });

  return NextResponse.json({
    escopos: escopos.map(escopo => ({
      id: escopo.id,
      ativo: escopo.ativo,
      ultimoEnvioEm: escopo.ultimoEnvioEm,
      ultimoSupervisorId: escopo.ultimoSupervisorId,
      createdAt: escopo.createdAt,
      updatedAt: escopo.updatedAt,
      template: escopo.template,
      unidade: escopo.unidade,
      grupo: escopo.grupo,
      respostasRecentes: escopo.respostas,
    })),
  });
}

