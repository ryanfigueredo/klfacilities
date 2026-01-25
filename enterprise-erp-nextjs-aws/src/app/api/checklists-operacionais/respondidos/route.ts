import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { ChecklistRespostaStatus } from '@prisma/client';

/**
 * GET /api/checklists-operacionais/respondidos
 * Buscar checklists respondidos (CONCLUIDO) com filtro por role:
 * - SUPERVISOR, LAVAGEM: apenas seus próprios checklists
 * - MASTER, OPERACIONAL, ADMIN: todos os checklists
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser(request);
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role, 'checklists', 'list')) {
      return NextResponse.json(forbiddenPayload('checklists', 'list'), {
        status: 403,
      });
    }

    // Construir filtro de where
    const where: any = {
      status: ChecklistRespostaStatus.CONCLUIDO,
    };

    // SUPERVISOR e LAVAGEM veem apenas seus próprios checklists
    if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
      where.supervisorId = me.id;
    }
    // MASTER, OPERACIONAL e ADMIN veem todos os checklists

    // Buscar checklists respondidos
    const respostas = await prisma.checklistResposta.findMany({
      where,
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
            mapeamentos: {
              where: { ativo: true },
              select: {
                grupo: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
              take: 1,
            },
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
        escopo: {
          select: {
            id: true,
            ativo: true,
          },
        },
        confirmacoesRelatorio: {
          select: {
            id: true,
            confirmado: true,
            confirmadoEm: true,
            clienteFinal: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          submittedAt: 'desc',
        },
        {
          updatedAt: 'desc',
        },
      ],
      take: 100, // Limitar a 100 resultados
    });

    // Usar o grupo atual da unidade (do mapeamento) ao invés do grupo salvo na resposta
    const respostasFormatadas = respostas.map(r => {
      const grupoAtual = r.unidade.mapeamentos[0]?.grupo || r.grupo;

      return {
        id: r.id,
        template: r.template,
        unidade: {
          id: r.unidade.id,
          nome: r.unidade.nome,
        },
        grupo: grupoAtual ? {
          id: grupoAtual.id,
          nome: grupoAtual.nome,
        } : null,
        supervisor: r.supervisor,
        observacoes: r.observacoes,
        protocolo: r.protocolo,
        status: r.status,
        escopoId: r.escopoId,
        submittedAt: r.submittedAt?.toISOString() || r.createdAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        confirmacoes: r.confirmacoesRelatorio.map(c => ({
          id: c.id,
          confirmado: c.confirmado,
          confirmadoEm: c.confirmadoEm?.toISOString() || null,
          clienteFinal: c.clienteFinal,
        })),
      };
    });

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[respondidos] Buscando checklists respondidos para ${me.role} ${me.id}, encontrados: ${respostas.length}`);
    }

    return NextResponse.json({
      respostas: respostasFormatadas,
    });
  } catch (error: any) {
    console.error('Erro ao buscar checklists respondidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar checklists respondidos' },
      { status: 500 }
    );
  }
}
