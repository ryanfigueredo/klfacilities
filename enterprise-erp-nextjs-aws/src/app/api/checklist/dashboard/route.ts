import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão
    if (!can(user.role as any, 'relatorios', 'read')) {
      return NextResponse.json(forbiddenPayload('relatorios', 'read'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const unidadeId = searchParams.get('unidadeId');
    const tipo = searchParams.get('tipo');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construir filtros
    const where: any = {};

    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (dataInicio || dataFim) {
      where.timestamp = {};
      if (dataInicio) {
        where.timestamp.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.timestamp.lte = new Date(dataFim);
      }
    }

    // Buscar checklists com ticket
    const [checklists, total] = await Promise.all([
      prisma.checklistDigital.findMany({
        where,
        include: {
          unidade: {
            select: {
              id: true,
              nome: true,
            },
          },
          ticket: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checklistDigital.count({ where }),
    ]);

    // Estatísticas gerais
    const stats = await prisma.checklistDigital.groupBy({
      by: ['tipo'],
      _count: {
        tipo: true,
      },
      where:
        dataInicio || dataFim
          ? {
              timestamp: {
                ...(dataInicio && { gte: new Date(dataInicio) }),
                ...(dataFim && { lte: new Date(dataFim) }),
              },
            }
          : {},
    });

    // Estatísticas por unidade
    const statsPorUnidade = await prisma.checklistDigital.groupBy({
      by: ['unidadeId', 'tipo'],
      _count: {
        tipo: true,
      },
      where:
        dataInicio || dataFim
          ? {
              timestamp: {
                ...(dataInicio && { gte: new Date(dataInicio) }),
                ...(dataFim && { lte: new Date(dataFim) }),
              },
            }
          : {},
    });

    // Buscar unidades para mapear IDs
    const unidades = await prisma.unidade.findMany({
      select: {
        id: true,
        nome: true,
      },
    });

    const unidadeMap = new Map(unidades.map(u => [u.id, u.nome]));

    // Processar estatísticas por unidade
    const statsUnidade = statsPorUnidade.reduce(
      (acc, stat) => {
        const unidadeNome =
          unidadeMap.get(stat.unidadeId) || 'Unidade não encontrada';
        if (!acc[unidadeNome]) {
          acc[unidadeNome] = { LIMPEZA: 0, INSUMOS: 0, SATISFACAO: 0 };
        }
        acc[unidadeNome][stat.tipo] = stat._count.tipo;
        return acc;
      },
      {} as Record<string, Record<string, number>>
    );

    // Estatísticas de tickets (PENDENTE vs CONCLUIDO)
    const ticketsStats = await prisma.ticketChecklist.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: {
        checklist: where,
      },
    });

    const ticketsByStatus = ticketsStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      },
      { PENDENTE: 0, CONCLUIDO: 0, CANCELADO: 0 } as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        checklists,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          porTipo: stats.reduce(
            (acc, stat) => {
              acc[stat.tipo] = stat._count.tipo;
              return acc;
            },
            {} as Record<string, number>
          ),
          porUnidade: statsUnidade,
          tickets: {
            total:
              ticketsByStatus.PENDENTE +
              ticketsByStatus.CONCLUIDO +
              ticketsByStatus.CANCELADO,
            pendentes: ticketsByStatus.PENDENTE,
            concluidos: ticketsByStatus.CONCLUIDO,
            cancelados: ticketsByStatus.CANCELADO,
            taxaConclusao:
              ticketsByStatus.PENDENTE + ticketsByStatus.CONCLUIDO > 0
                ? Math.round(
                    (ticketsByStatus.CONCLUIDO /
                      (ticketsByStatus.PENDENTE + ticketsByStatus.CONCLUIDO)) *
                      100
                  )
                : 0,
          },
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
