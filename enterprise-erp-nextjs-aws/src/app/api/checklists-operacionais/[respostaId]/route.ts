import { NextRequest, NextResponse } from 'next/server';
import { ChecklistRespostaStatus } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!can(me.role, 'checklists', 'list')) {
      return NextResponse.json(forbiddenPayload('checklists', 'list'), {
        status: 403,
      });
    }

    const { respostaId } = await params;

    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
      include: {
        template: {
          include: {
            grupos: {
              orderBy: { ordem: 'asc' },
              include: {
                perguntas: {
                  orderBy: { ordem: 'asc' },
                },
              },
            },
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
        respostas: {
          include: {
            pergunta: true,
          },
        },
      },
    });

    if (!resposta) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      resposta: {
        id: resposta.id,
        templateId: resposta.templateId,
        escopoId: resposta.escopoId,
        unidadeId: resposta.unidadeId,
        grupoId: resposta.grupoId,
        supervisorId: resposta.supervisorId,
        status: resposta.status,
        observacoes: resposta.observacoes,
        protocolo: resposta.protocolo,
        assinaturaFotoUrl: resposta.assinaturaFotoUrl,
        startedAt: resposta.startedAt,
        submittedAt: resposta.submittedAt,
        createdAt: resposta.createdAt,
        updatedAt: resposta.updatedAt,
        template: resposta.template,
        unidade: resposta.unidade,
        grupo: resposta.grupo,
        supervisor: resposta.supervisor,
      },
      template: resposta.template,
      respostas: resposta.respostas,
    });
  } catch (error) {
    console.error('Erro ao buscar resposta:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível buscar a resposta',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { respostaId } = await params;

    // Verificar se a resposta existe
    const resposta = await prisma.checklistResposta.findUnique({
      where: { id: respostaId },
    });

    if (!resposta) {
      return NextResponse.json(
        { error: 'Checklist não encontrado' },
        { status: 404 }
      );
    }

    // MASTER pode deletar qualquer checklist
    // SUPERVISOR e LAVAGEM podem deletar apenas seus próprios rascunhos
    if (me.role !== 'MASTER') {
      if (resposta.status !== ChecklistRespostaStatus.RASCUNHO) {
        return NextResponse.json(
          { error: 'Apenas rascunhos podem ser excluídos por supervisores' },
          { status: 403 }
        );
      }
      
      if (resposta.supervisorId !== me.id) {
        return NextResponse.json(
          { error: 'Você só pode excluir seus próprios rascunhos' },
          { status: 403 }
        );
      }
    }

    // Deletar a resposta (cascade vai deletar relacionamentos)
    await prisma.checklistResposta.delete({
      where: { id: respostaId },
    });

    return NextResponse.json({
      success: true,
      message: 'Rascunho excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir checklist:', error);
    return NextResponse.json(
      {
        error: 'Erro ao excluir checklist',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

