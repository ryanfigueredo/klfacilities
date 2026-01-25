import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhereWithDataLanc } from '../_where';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(req: Request) {
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
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const parsed = AnalyticsFiltersSchema.safeParse({
      ...params,
      grupoId: url.searchParams.getAll('grupoId'),
      unidadeId: url.searchParams.getAll('unidadeId'),
      categoria: url.searchParams.getAll('categoria'),
      tipo: url.searchParams.getAll('tipo'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const where = buildWhereWithDataLanc(parsed.data);

    const [receitas, despesas, count] = await Promise.all([
      prisma.movimento.aggregate({
        _sum: { valor: true },
        where: { ...where, tipo: 'RECEITA' },
      }),
      prisma.movimento.aggregate({
        _sum: { valor: true },
        where: { ...where, tipo: 'DESPESA' },
      }),
      prisma.movimento.count({ where }),
    ]);

    const resultadoAgg = await prisma.movimento.aggregate({
      _sum: { valorAssinado: true },
      where,
    });

    const qtdDespesas = await prisma.movimento.count({
      where: { ...where, tipo: 'DESPESA' },
    });

    const ticketMedioDespesa =
      qtdDespesas > 0 ? Number(despesas._sum.valor ?? 0) / qtdDespesas : 0;

    return NextResponse.json({
      receitas: Number(receitas._sum.valor ?? 0),
      despesas: Number(despesas._sum.valor ?? 0),
      resultado: Number(resultadoAgg._sum.valorAssinado ?? 0),
      qtdMovimentos: count,
      ticketMedioDespesa,
      variacoes: {
        receitas: 0,
        despesas: 0,
        resultado: 0,
        qtdMovimentos: 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
