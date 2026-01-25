import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhere } from '../_where';
import { percent } from '@/lib/utils/analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = AnalyticsFiltersSchema.parse({
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      grupoId: searchParams.getAll('grupoId'),
      unidadeId: searchParams.getAll('unidadeId'),
      categoria: searchParams.getAll('categoria'),
      tipo: searchParams.getAll('tipo') as any,
      search: searchParams.get('search') || undefined,
    });

    const where = buildWhere(filters);

    // Buscar dados por unidade
    const unidadesData = await prisma.movimento.groupBy({
      by: ['unidadeId'],
      where,
      _sum: {
        valorAssinado: true,
      },
      _count: true,
    });

    // Buscar dados por unidade e categoria
    const unidadesCategoriasData = await prisma.movimento.groupBy({
      by: ['unidadeId', 'categoria'],
      where,
      _sum: {
        valorAssinado: true,
      },
      _count: true,
    });

    // Calcular total geral
    const totalGeral = unidadesData.reduce((sum, u) => sum + Math.abs(Number(u._sum.valorAssinado || 0)), 0);

    // Buscar nomes das unidades
    const unidades = await prisma.unidade.findMany({
      where: {
        id: { in: unidadesData.map(u => u.unidadeId!).filter(Boolean) },
      },
      select: { id: true, nome: true },
    });

    // Processar dados
    const unidadesProcessadas = unidadesData.map(unidade => {
      const unidadeNome = unidades.find(u => u.id === unidade.unidadeId)?.nome || 'Sem unidade';
      const total = Math.abs(Number(unidade._sum.valorAssinado || 0));
      const percentual = percent(total, totalGeral);

      // Buscar children (categorias) desta unidade
      const children = unidadesCategoriasData
        .filter(uc => uc.unidadeId === unidade.unidadeId)
        .map(uc => {
          const categoria = uc.categoria || 'Sem categoria';
          const categoriaTotal = Math.abs(Number(uc._sum.valorAssinado || 0));
          const categoriaPercentual = percent(categoriaTotal, total);

          return {
            categoria,
            total: categoriaTotal,
            percentual: categoriaPercentual,
            count: uc._count,
          };
        })
        .sort((a, b) => b.total - a.total);

      return {
        unidade: unidadeNome,
        total,
        percentual,
        count: unidade._count,
        children,
      };
    }).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      unidades: unidadesProcessadas,
      totalGeral,
    });
  } catch (error) {
    console.error('Erro ao buscar dados por unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
