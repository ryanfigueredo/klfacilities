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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // MASTER, RH e Administrador podem aprovar solicitações de exclusão
    if (!['MASTER', 'RH', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Apenas MASTER, RH e Administrador podem aprovar exclusões' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const aprovado = body.aprovado !== false; // Default true
    const observacoes = body.observacoes || null;

    // Buscar solicitação
    let solicitacao = null;
    try {
      solicitacao = await prisma.solicitacaoExclusaoColaborador.findUnique({
        where: { id: params.id },
        include: {
          funcionario: true,
        },
      });
    } catch (error) {
      if (isMissingSolicitacaoTable(error)) {
        return NextResponse.json(
          {
            error:
              'Tabela de solicitações indisponível. Execute `pnpm prisma migrate deploy` para processar exclusões.',
          },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!solicitacao) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      );
    }

    if (solicitacao.status !== 'PENDENTE') {
      return NextResponse.json(
        { error: 'Solicitação já foi processada' },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async tx => {
      if (aprovado) {
        // Aprovar e marcar como inativo (soft-delete: registros preservados para uso jurídico)
        await tx.solicitacaoExclusaoColaborador.update({
          where: { id: params.id },
          data: {
            status: 'APROVADA',
            aprovadoPorId: session.user.id,
            aprovadoEm: new Date(),
            observacoes,
          },
        });

        await tx.funcionario.update({
          where: { id: solicitacao.funcionarioId },
          data: { ativo: false, excluidoEm: new Date() },
        });

        return { aprovado: true, message: 'Colaborador excluído com sucesso' };
      } else {
        // Rejeitar
        await tx.solicitacaoExclusaoColaborador.update({
          where: { id: params.id },
          data: {
            status: 'REJEITADA',
            aprovadoPorId: session.user.id,
            aprovadoEm: new Date(),
            observacoes,
          },
        });

        return { aprovado: false, message: 'Solicitação rejeitada' };
      }
    });

    return NextResponse.json({ ok: true, ...resultado });
  } catch (error: any) {
    console.error('Erro ao processar aprovação:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar aprovação' },
      { status: 500 }
    );
  }
}
