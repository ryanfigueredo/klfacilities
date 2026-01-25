import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

function isMissingSolicitacaoTable(error: unknown) {
  return (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    (error.meta?.modelName === 'SolicitacaoExclusaoColaborador' ||
      String(error.message || '').includes('SolicitacaoExclusaoColaborador'))
  );
}

// GET - Listar solicitações de exclusão
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = session.user.role;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const where: any = {};

    // RH e OPERACIONAL só vêem suas próprias solicitações
    if (userRole === 'RH' || userRole === 'OPERACIONAL') {
      where.solicitadoPorId = session.user.id;
    }

    // Filtrar por status
    if (status && status !== 'all') {
      where.status = status;
    }

    const solicitacoes = await prisma.solicitacaoExclusaoColaborador.findMany({
      where,
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            codigo: true,
            grupo: { select: { nome: true } },
            unidade: { select: { nome: true } },
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, solicitacoes });
  } catch (error: any) {
    console.error('Erro ao listar solicitações:', error);
    if (isMissingSolicitacaoTable(error)) {
      return NextResponse.json(
        {
          error:
            'Tabela de solicitações ausente. Execute `pnpm prisma migrate deploy` para concluir a configuração e tente novamente.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Erro ao listar solicitações' },
      { status: 500 }
    );
  }
}
