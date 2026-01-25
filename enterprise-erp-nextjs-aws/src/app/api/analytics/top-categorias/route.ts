import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TopCategoriasSchema } from '../_schemas';
import { buildWhere } from '../_where';
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
    const params = TopCategoriasSchema.parse({
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 10,
      includeSparkline: searchParams.get('includeSparkline') === 'true',
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

    // Estratégia: combinar duas agregações
    // 1) por nome textual (movimento.categoria)
    const byName = await prisma.movimento.groupBy({
      by: ['categoria'],
      where: { ...where, categoria: { not: null } },
      _sum: { valorAssinado: true },
      _count: true,
    });

    // 2) por categoriaId quando não há nome textual
    const byId = await prisma.movimento.groupBy({
      by: ['categoriaId'],
      where: { ...where, categoriaId: { not: null }, categoria: null },
      _sum: { valorAssinado: true },
      _count: true,
    });

    // Enriquecer ids com nomes da tabela Categoria
    const ids = byId.map(r => r.categoriaId!).filter(Boolean) as string[];
    const categoriasDb = ids.length
      ? await prisma.categoria.findMany({ where: { id: { in: ids } } })
      : [];
    const idToNome = new Map(categoriasDb.map(c => [c.id, c.nome] as const));

    // Normalizar
    const rowsFromName = byName.map(cat => ({
      categoria: cat.categoria || 'Sem categoria',
      total: Math.abs(Number(cat._sum.valorAssinado || 0)),
      count: cat._count as number,
    }));
    const rowsFromId = byId.map(cat => ({
      categoria: idToNome.get(cat.categoriaId!) || 'Sem categoria',
      total: Math.abs(Number(cat._sum.valorAssinado || 0)),
      count: cat._count as number,
    }));

    // Merge por nome
    const merged = new Map<
      string,
      { categoria: string; total: number; count: number }
    >();
    const addRow = (r: { categoria: string; total: number; count: number }) => {
      const key = r.categoria || 'Sem categoria';
      const prev = merged.get(key);
      if (!prev) merged.set(key, { ...r });
      else
        merged.set(key, {
          categoria: key,
          total: prev.total + r.total,
          count: (prev.count || 0) + (r.count || 0),
        });
    };
    rowsFromName.forEach(addRow);
    rowsFromId.forEach(addRow);

    const combined = Array.from(merged.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, params.limit);

    // Processar dados
    const categorias = await Promise.all(
      combined.map(async row => {
        let sparkline: number[] = [];
        if (params.includeSparkline) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const sparklineData = await prisma.movimento.groupBy({
            by: ['competencia'],
            where: {
              ...where,
              OR: [
                { categoria: row.categoria },
                {
                  AND: [
                    { categoria: null },
                    {
                      categoriaId: {
                        in: ids.filter(
                          id => idToNome.get(id) === row.categoria
                        ),
                      },
                    },
                  ],
                },
              ],
              competencia: { gte: sixMonthsAgo },
            },
            _sum: { valorAssinado: true },
            orderBy: { competencia: 'asc' },
          });
          sparkline = sparklineData.map(d =>
            Math.abs(Number(d._sum.valorAssinado || 0))
          );
        }
        return { ...row, sparkline };
      })
    );

    return NextResponse.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar top categorias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
