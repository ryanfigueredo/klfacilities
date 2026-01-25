import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhere } from '../_where';
import { percent } from '@/lib/utils/analytics';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão para visualizar analytics
    if (!can(user.role as any, 'relatorios', 'read')) {
      return NextResponse.json(forbiddenPayload('relatorios', 'read'), {
        status: 403,
      });
    }
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

    // Considerar apenas DESPESAS para refletir "gastos" por grupo
    const where = { ...buildWhere(filters), tipo: 'DESPESA' as const };

    // Buscar dados por grupo
    const gruposData = await prisma.movimento.groupBy({
      by: ['grupoId'],
      where,
      _sum: {
        valor: true,
      },
      _count: true,
    });

    // Buscar dados por grupo e unidade
    const gruposUnidadesData = await prisma.movimento.groupBy({
      by: ['grupoId', 'unidadeId'],
      where,
      _sum: {
        valor: true,
      },
      _count: true,
    });

    // Calcular total geral
    const totalGeral = gruposData.reduce(
      (sum, g) => sum + Math.abs(Number(g._sum.valor || 0)),
      0
    );

    // Buscar nomes dos grupos
    const grupos = await prisma.grupo.findMany({
      where: {
        id: { in: gruposData.map(g => g.grupoId!).filter(Boolean) },
      },
      select: { id: true, nome: true },
    });

    // Buscar nomes das unidades
    const unidades = await prisma.unidade.findMany({
      where: {
        id: { in: gruposUnidadesData.map(g => g.unidadeId!).filter(Boolean) },
      },
      select: { id: true, nome: true },
    });

    // Processar dados
    const gruposProcessados = gruposData
      .map(grupo => {
        const grupoNome =
          grupos.find(g => g.id === grupo.grupoId)?.nome || 'Sem grupo';
        const total = Math.abs(Number(grupo._sum.valor || 0));
        const percentual = percent(total, totalGeral);

        // Buscar children (unidades) deste grupo
        const children = gruposUnidadesData
          .filter(gu => gu.grupoId === grupo.grupoId)
          .map(gu => {
            const unidadeNome =
              unidades.find(u => u.id === gu.unidadeId)?.nome || 'Sem unidade';
            const unidadeTotal = Math.abs(Number(gu._sum.valor || 0));
            const unidadePercentual = percent(unidadeTotal, total);

            return {
              unidade: unidadeNome,
              total: unidadeTotal,
              percentual: unidadePercentual,
              count: gu._count,
            };
          })
          .sort((a, b) => b.total - a.total);

        return {
          id: grupo.grupoId ?? 'null',
          grupo: grupoNome,
          total,
          percentual,
          count: grupo._count,
          children,
        };
      })
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      grupos: gruposProcessados,
      totalGeral,
    });
  } catch (error) {
    console.error('Erro ao buscar dados por grupo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
