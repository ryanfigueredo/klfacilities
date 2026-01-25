import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const approveSchema = z.object({
  aprovado: z.boolean(),
  observacoes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas MASTER pode aprovar/rejeitar
    if (session.user.role !== 'MASTER') {
      return NextResponse.json(
        { error: 'Apenas MASTER pode aprovar solicitações de exclusão' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = approveSchema.parse(body);

    const solicitacao = await prisma.solicitacaoExclusaoConfig.findUnique({
      where: { id },
    });

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

    // Atualizar status
    const updated = await prisma.solicitacaoExclusaoConfig.update({
      where: { id },
      data: {
        status: validated.aprovado ? 'APROVADA' : 'REJEITADA',
        aprovadoPorId: session.user.id,
        aprovadoEm: new Date(),
        observacoes: validated.observacoes,
      },
    });

    // Se aprovado, executar a exclusão
    if (validated.aprovado) {
      try {
        if (solicitacao.tipo === 'GRUPO') {
          // Verificar se está sendo referenciado
          const grupo = await prisma.grupo.findUnique({
            where: { id: solicitacao.resourceId },
            include: {
              _count: {
                select: {
                  movimentos: true,
                },
              },
            },
          });

          if (!grupo) {
            throw new Error('Grupo não encontrado');
          }

          if (grupo._count.movimentos > 0) {
            // Reverter aprovação
            await prisma.solicitacaoExclusaoConfig.update({
              where: { id },
              data: {
                status: 'REJEITADA',
                observacoes: `Não foi possível excluir: grupo está sendo utilizado em ${grupo._count.movimentos} movimento(s)`,
              },
            });
            return NextResponse.json({
              error: 'Não foi possível excluir: grupo está sendo utilizado',
              details: `O grupo está sendo utilizado em ${grupo._count.movimentos} movimento(s)`,
            }, { status: 400 });
          }

          await prisma.grupo.delete({
            where: { id: solicitacao.resourceId },
          });

          await logAudit({
            action: 'grupo.deleted',
            resource: 'Grupo',
            resourceId: solicitacao.resourceId,
            success: true,
            ip: '127.0.0.1',
            userAgent: 'api',
            method: 'PATCH',
            url: `/api/config/solicitacoes-exclusao/${id}`,
            metadata: {
              solicitacaoId: id,
              aprovadoPor: session.user.id,
            },
          });
        } else if (solicitacao.tipo === 'UNIDADE') {
          // Verificar se está sendo referenciada
          const unidade = await prisma.unidade.findUnique({
            where: { id: solicitacao.resourceId },
            include: {
              _count: {
                select: {
                  movimentos: true,
                  mapeamentos: true,
                },
              },
            },
          });

          if (!unidade) {
            throw new Error('Unidade não encontrada');
          }

          if (unidade._count.movimentos > 0 || unidade._count.mapeamentos > 0) {
            // Reverter aprovação
            await prisma.solicitacaoExclusaoConfig.update({
              where: { id },
              data: {
                status: 'REJEITADA',
                observacoes: `Não foi possível excluir: unidade está sendo utilizada em ${unidade._count.movimentos} movimento(s) e ${unidade._count.mapeamentos} mapeamento(s)`,
              },
            });
            return NextResponse.json({
              error: 'Não foi possível excluir: unidade está sendo utilizada',
              details: `A unidade está sendo utilizada em ${unidade._count.movimentos} movimento(s) e ${unidade._count.mapeamentos} mapeamento(s)`,
            }, { status: 400 });
          }

          await prisma.unidade.delete({
            where: { id: solicitacao.resourceId },
          });

          await logAudit({
            action: 'unidade.deleted',
            resource: 'Unidade',
            resourceId: solicitacao.resourceId,
            success: true,
            ip: '127.0.0.1',
            userAgent: 'api',
            method: 'PATCH',
            url: `/api/config/solicitacoes-exclusao/${id}`,
            metadata: {
              solicitacaoId: id,
              aprovadoPor: session.user.id,
            },
          });
        } else if (solicitacao.tipo === 'SUPERVISOR_SCOPE') {
          await prisma.supervisorScope.delete({
            where: { id: solicitacao.resourceId },
          });

          await logAudit({
            action: 'supervisor.scope.deleted',
            resource: 'SupervisorScope',
            resourceId: solicitacao.resourceId,
            success: true,
            ip: '127.0.0.1',
            userAgent: 'api',
            method: 'PATCH',
            url: `/api/config/solicitacoes-exclusao/${id}`,
            metadata: {
              solicitacaoId: id,
              aprovadoPor: session.user.id,
            },
          });
        }
      } catch (error: any) {
        // Reverter aprovação em caso de erro
        await prisma.solicitacaoExclusaoConfig.update({
          where: { id },
          data: {
            status: 'REJEITADA',
            observacoes: `Erro ao excluir: ${error.message}`,
          },
        });
        throw error;
      }
    }

    await logAudit({
      action: 'solicitacao.exclusao.processed',
      resource: 'SolicitacaoExclusaoConfig',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PATCH',
      url: `/api/config/solicitacoes-exclusao/${id}`,
      metadata: {
        aprovado: validated.aprovado,
        observacoes: validated.observacoes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao processar solicitação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

