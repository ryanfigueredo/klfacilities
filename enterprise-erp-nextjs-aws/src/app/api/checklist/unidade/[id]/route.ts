import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = params.id;

    // Buscar informações da unidade com o grupo
    const unidade = await prisma.unidade.findUnique({
      where: { id: unidadeId },
      select: {
        id: true,
        nome: true,
        ativa: true,
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
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    if (!unidade.ativa) {
      return NextResponse.json({ error: 'Unidade inativa' }, { status: 403 });
    }

    // Buscar estatísticas recentes (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const stats = await prisma.checklistDigital.groupBy({
      by: ['tipo'],
      _count: {
        tipo: true,
      },
      where: {
        unidadeId,
        timestamp: {
          gte: trintaDiasAtras,
        },
      },
    });

    const statsPorTipo = stats.reduce(
      (acc, stat) => {
        acc[stat.tipo] = stat._count.tipo;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        unidade: {
          id: unidade.id,
          nome: unidade.nome,
          grupoNome: unidade.mapeamentos[0]?.grupo?.nome || 'Sem Grupo',
        },
        stats: {
          ultimos30Dias: statsPorTipo,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar informações da unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
