import { NextRequest, NextResponse } from 'next/server';
import { ChecklistRespostaStatus } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Apenas OPERACIONAL, MASTER e ADMIN podem ver checklists pendentes de aprovação
  if (
    me.role !== 'OPERACIONAL' &&
    me.role !== 'MASTER' &&
    me.role !== 'ADMIN'
  ) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const unidadeId = searchParams.get('unidadeId');
  const grupoId = searchParams.get('grupoId');

  const respostas = await prisma.checklistResposta.findMany({
    where: {
      status: ChecklistRespostaStatus.PENDENTE_APROVACAO,
      ...(unidadeId ? { unidadeId } : {}),
      ...(grupoId ? { grupoId } : {}),
    },
    orderBy: {
      submittedAt: 'desc',
    },
    include: {
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
      supervisor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    respostas: respostas.map(resposta => ({
      id: resposta.id,
      template: resposta.template,
      unidade: resposta.unidade,
      grupo: resposta.grupo,
      supervisor: resposta.supervisor,
      status: resposta.status,
      observacoes: resposta.observacoes,
      protocolo: resposta.protocolo,
      submittedAt: resposta.submittedAt,
      createdAt: resposta.createdAt,
    })),
  });
}
