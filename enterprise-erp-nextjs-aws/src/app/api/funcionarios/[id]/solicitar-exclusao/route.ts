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

    // MASTER, RH e ADMIN podem excluir diretamente; outros não têm acesso
    const userRole = (session.user as any).role;
    if (!['MASTER', 'RH', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Apenas MASTER, RH e Administrador podem excluir colaboradores' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const motivo = body.motivo || null;

    // Verificar se o funcionário existe
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: params.id },
      include: { grupo: true, unidade: true },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe solicitação pendente
    let solicitacaoExistente = null;
    try {
      solicitacaoExistente =
        await prisma.solicitacaoExclusaoColaborador.findFirst({
          where: {
            funcionarioId: params.id,
            status: 'PENDENTE',
          },
        });
    } catch (error) {
      if (!isMissingSolicitacaoTable(error)) {
        throw error;
      }
      // Se a tabela não existe ainda, tratamos como se não houvesse solicitação
    }

    if (solicitacaoExistente) {
      return NextResponse.json(
        {
          error:
            'Já existe uma solicitação de exclusão pendente para este colaborador',
        },
        { status: 400 }
      );
    }

    // RH, MASTER e ADMIN excluem diretamente (sem aprovação). Soft delete: registros preservados.
    if (['MASTER', 'RH', 'ADMIN'].includes(userRole)) {
      try {
        const resultado = await prisma.$transaction(async tx => {
          const solicitacao = await tx.solicitacaoExclusaoColaborador.create({
            data: {
              funcionarioId: params.id,
              solicitadoPorId: (session.user as any).id,
              motivo,
              status: 'APROVADA',
              aprovadoPorId: (session.user as any).id,
              aprovadoEm: new Date(),
            },
          });

          await tx.funcionario.update({
            where: { id: params.id },
            data: { ativo: false, excluidoEm: new Date() },
          });

          return solicitacao;
        });

        return NextResponse.json({
          ok: true,
          message: 'Colaborador excluído. Ele permanece na lista de inativos/demitidos e os registros de ponto são preservados.',
          solicitacaoId: resultado.id,
        });
      } catch (error) {
        if (isMissingSolicitacaoTable(error)) {
          try {
            await prisma.funcionario.update({
              where: { id: params.id },
              data: { ativo: false, excluidoEm: new Date() },
            });
          } catch (updateError) {
            if (!(updateError instanceof PrismaClientKnownRequestError && updateError.code === 'P2025')) {
              throw updateError;
            }
          }
          return NextResponse.json({
            ok: true,
            message:
              'Colaborador excluído com sucesso. Registre as migrações do banco para habilitar o histórico de solicitações.',
            warning:
              'Tabela Solicitação de Exclusão ausente. Execute `pnpm prisma migrate deploy` para criar a estrutura.',
          });
        }
        throw error;
      }
    }

    // Fallback: criar solicitação pendente (não deve chegar aqui com as roles atuais)
    try {
      const solicitacao = await prisma.solicitacaoExclusaoColaborador.create({
        data: {
          funcionarioId: params.id,
          solicitadoPorId: (session.user as any).id,
          motivo,
          status: 'PENDENTE',
        },
        include: {
          funcionario: {
            select: {
              id: true,
              nome: true,
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
        },
      });

      return NextResponse.json({
        ok: true,
        message: 'Solicitação de exclusão criada. Aguarde aprovação do MASTER.',
        solicitacao,
      });
    } catch (error) {
      if (isMissingSolicitacaoTable(error)) {
        return NextResponse.json(
          {
            error:
              'Não foi possível registrar a solicitação. Execute `pnpm prisma migrate deploy` para criar a tabela de solicitações e tente novamente.',
          },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Erro ao solicitar exclusão:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao solicitar exclusão' },
      { status: 500 }
    );
  }
}
