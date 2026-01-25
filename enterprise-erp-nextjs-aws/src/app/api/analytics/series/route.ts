import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhereWithDataLanc } from '../_where';
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

    const where = buildWhereWithDataLanc(filters);

    // Buscar série por data de lançamento e consolidar por mês em memória
    const seriesData = await prisma.movimento.groupBy({
      by: ['dataLanc', 'tipo'],
      where,
      _sum: {
        valorAssinado: true,
      },
      orderBy: {
        dataLanc: 'asc',
      },
    });

    // Agrupar por competência
    const seriesByMonth = seriesData.reduce(
      (acc, item) => {
        const d = item.dataLanc as unknown as Date;
        const competenciaDate = new Date(d.getFullYear(), d.getMonth(), 1);
        const competencia = competenciaDate.toISOString().split('T')[0];

        if (!acc[competencia]) {
          acc[competencia] = {
            competencia,
            receitas: 0,
            despesas: 0,
            resultado: 0,
          };
        }

        const absol = Math.abs(Number(item._sum.valorAssinado || 0));
        if (item.tipo === 'RECEITA') acc[competencia].receitas = absol;
        else if (item.tipo === 'DESPESA') acc[competencia].despesas = absol;
        acc[competencia].resultado += Number(item._sum.valorAssinado || 0);

        return acc;
      },
      {} as Record<
        string,
        {
          competencia: string;
          receitas: number;
          despesas: number;
          resultado: number;
        }
      >
    );

    // Converter para array e ordenar
    const series = Object.values(seriesByMonth).sort(
      (a, b) =>
        new Date(a.competencia).getTime() - new Date(b.competencia).getTime()
    );

    return NextResponse.json(series);
  } catch (error) {
    console.error('Erro ao buscar série temporal:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
