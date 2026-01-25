import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { ChecklistRespostaStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Verificar se o usuário pode aprovar (OPERACIONAL, MASTER, ADMIN)
    if (!['OPERACIONAL', 'MASTER', 'ADMIN'].includes(me.role)) {
      return NextResponse.json(
        { error: 'Apenas operacional, master ou admin podem aprovar checklists' },
        { status: 403 }
      );
    }

    const { respostaId } = await params;

    // Buscar resposta
    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
      include: {
        template: {
          select: {
            id: true,
            titulo: true,
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
      },
    });

    if (!resposta) {
      return NextResponse.json(
        { error: 'Resposta não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se está pendente de aprovação
    if (resposta.status !== ChecklistRespostaStatus.PENDENTE_APROVACAO) {
      return NextResponse.json(
        {
          error: 'Checklist não está pendente de aprovação',
          currentStatus: resposta.status,
        },
        { status: 400 }
      );
    }

    // Atualizar status para CONCLUIDO
    const respostaAprovada = await prisma.checklistResposta.update({
      where: { id: respostaId },
      data: {
        status: ChecklistRespostaStatus.CONCLUIDO,
      },
      include: {
        template: {
          select: {
            id: true,
            titulo: true,
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

    // Enviar relatórios para clientes finais em background
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/checklists-operacionais/${respostaId}/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(error => {
        console.error('Erro ao enviar relatórios em background após aprovação:', error);
        // Não falha o processo se o envio falhar
      });
    } catch (error) {
      console.error('Erro ao iniciar envio de relatórios após aprovação:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Checklist aprovado com sucesso. Relatórios serão enviados para os clientes finais.',
      resposta: respostaAprovada,
    });
  } catch (error) {
    console.error('Erro ao aprovar checklist:', error);
    return NextResponse.json(
      {
        error: 'Erro ao aprovar checklist',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

