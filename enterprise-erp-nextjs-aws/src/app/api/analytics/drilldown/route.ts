import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DrilldownSchema } from '../_schemas';
import { buildWhere } from '../_where';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = DrilldownSchema.parse({
      dimension: searchParams.get('dimension') as any,
      filters: {
        start: searchParams.get('start') || undefined,
        end: searchParams.get('end') || undefined,
        grupoId: searchParams.getAll('grupoId'),
        unidadeId: searchParams.getAll('unidadeId'),
        categoria: searchParams.getAll('categoria'),
        tipo: searchParams.getAll('tipo') as any,
        search: searchParams.get('search') || undefined,
      },
    });

    const where = buildWhere(params.filters);

    // Determinar campos para groupBy baseado na dimensão
    let groupByFields: string[] = [];
    let selectFields: any = {};

    switch (params.dimension) {
      case 'grupo':
        groupByFields = ['grupoId'];
        selectFields = { grupo: { select: { nome: true } } };
        break;
      case 'unidade':
        groupByFields = ['unidadeId'];
        selectFields = { unidade: { select: { nome: true } } };
        break;
      case 'categoria':
        groupByFields = ['categoria'];
        break;
      case 'subcategoria':
        groupByFields = ['subcategoria'];
        break;
      case 'centroCusto':
        groupByFields = ['centroCusto'];
        break;
      default:
        return NextResponse.json(
          { error: 'Dimensão inválida' },
          { status: 400 }
        );
    }

    // Buscar dados agregados
    const aggregatedData = await prisma.movimento.groupBy({
      by: groupByFields as any,
      where,
      _sum: {
        valorAssinado: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          valorAssinado: 'desc',
        },
      },
    });

    // Buscar lançamentos recentes para cada dimensão
    const recentMovements = await Promise.all(
      aggregatedData.slice(0, 10).map(async (item) => {
        const dimensionValue = item[params.dimension as keyof typeof item];
        
        const recentWhere = {
          ...where,
          [params.dimension]: dimensionValue,
        };

        const recent = await prisma.movimento.findMany({
          where: recentWhere,
          include: {
            grupo: { select: { nome: true } },
            unidade: { select: { nome: true } },
            categoriaRel: { select: { nome: true } },
          },
          orderBy: {
            dataLanc: 'desc',
          },
          take: 20,
        });

        return {
          dimension: dimensionValue || 'Sem valor',
          total: Math.abs(Number(item._sum.valorAssinado || 0)),
          count: item._count,
          recent: recent.map(m => ({
            id: m.id,
            descricao: m.descricao,
            dataLanc: m.dataLanc,
            valor: Number(m.valor),
            valorAssinado: Number(m.valorAssinado),
            tipo: m.tipo,
            grupo: m.grupo?.nome,
            unidade: m.unidade?.nome,
            categoria: m.categoriaRel?.nome || m.categoria,
          })),
        };
      })
    );

    return NextResponse.json({
      dimension: params.dimension,
      data: recentMovements,
    });
  } catch (error) {
    console.error('Erro ao buscar drilldown:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
