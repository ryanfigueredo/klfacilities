import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const createSchema = z.object({
  tipo: z.enum(['grupo', 'unidade', 'supervisor-scope']),
  resourceId: z.string().min(1),
  motivo: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas OPERACIONAL pode criar solicitações
    if (session.user.role !== 'OPERACIONAL') {
      return NextResponse.json(
        { error: 'Apenas usuários OPERACIONAL podem criar solicitações de exclusão' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createSchema.parse(body);

    // Mapear tipo para enum
    let tipoEnum: 'GRUPO' | 'UNIDADE' | 'SUPERVISOR_SCOPE';
    if (validated.tipo === 'grupo') {
      tipoEnum = 'GRUPO';
    } else if (validated.tipo === 'unidade') {
      tipoEnum = 'UNIDADE';
    } else {
      tipoEnum = 'SUPERVISOR_SCOPE';
    }

    // Verificar se já existe solicitação pendente para este recurso
    const existing = await prisma.solicitacaoExclusaoConfig.findFirst({
      where: {
        tipo: tipoEnum,
        resourceId: validated.resourceId,
        status: 'PENDENTE',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este recurso' },
        { status: 400 }
      );
    }

    const solicitacao = await prisma.solicitacaoExclusaoConfig.create({
      data: {
        tipo: tipoEnum,
        resourceId: validated.resourceId,
        solicitadoPorId: session.user.id,
        motivo: validated.motivo,
      },
    });

    await logAudit({
      action: 'solicitacao.exclusao.created',
      resource: 'SolicitacaoExclusaoConfig',
      resourceId: solicitacao.id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/config/solicitacoes-exclusao',
      metadata: {
        tipo: tipoEnum,
        resourceId: validated.resourceId,
      },
    });

    return NextResponse.json(solicitacao);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao criar solicitação de exclusão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // MASTER pode ver todas, OPERACIONAL apenas as suas
    const where: any = {};
    if (session.user.role !== 'MASTER') {
      where.solicitadoPorId = session.user.id;
    }

    const solicitacoes = await prisma.solicitacaoExclusaoConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        solicitadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        aprovadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(solicitacoes);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

