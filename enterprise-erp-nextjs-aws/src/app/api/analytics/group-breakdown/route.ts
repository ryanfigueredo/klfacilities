import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWhere, buildWhereWithDataLanc } from '../_where';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

type GroupBreakdownResponse = {
  meta: {
    groupId: string;
    groupName: string;
    total: number;
    currency: 'BRL';
    appliedFilters: Record<string, any>;
  };
  pie: Array<{
    categoriaId: string | null;
    categoria: string;
    total: number;
    pct: number;
  }>;
  table: Array<{
    categoriaId: string | null;
    categoria: string;
    unidadeId: string | null;
    unidade: string;
    grupoId: string;
    grupo: string;
    total: number;
    pct: number;
  }>;
};

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
    const groupId = searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId é obrigatório' },
        { status: 400 }
      );
    }

    // Filtros globais já existentes (compatível com /api/analytics)
    const start = searchParams.get('start') || undefined; // competencia
    const end = searchParams.get('end') || undefined; // competencia
    const unidadeId = searchParams.getAll('unidadeId');
    const categoriaNames = searchParams.getAll('categoria');
    const tipos =
      (searchParams.getAll('tipo') as ('RECEITA' | 'DESPESA')[]) || [];
    const search = searchParams.get('search') || undefined;

    // Novos nomes aceitos por compatibilidade com a especificação
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const competenciaFrom = searchParams.get('competenciaFrom') || undefined;
    const competenciaTo = searchParams.get('competenciaTo') || undefined;
    const unidadeIdSingle = searchParams.get('unidadeIdSingle') || undefined;
    const categoriaIdSingle = searchParams.get('categoriaId') || undefined;
    const formaPagamento = searchParams.get('formaPagamento') || undefined;

    // Construir where base respeitando filtros globais (competencia por padrão)
    const whereCompetencia = buildWhere({
      start: competenciaFrom || start || undefined,
      end: competenciaTo || end || undefined,
      grupoId: [groupId],
      unidadeId: unidadeIdSingle
        ? [unidadeIdSingle]
        : unidadeId.length
          ? unidadeId
          : undefined,
      categoria: categoriaNames.length ? categoriaNames : undefined,
      tipo: (tipos && tipos.length ? tipos : ['DESPESA']) as any, // padrão DESPESA
      search: search || undefined,
    });

    // Se houver filtro por dataLanc, aplicar junto
    const whereDataLanc =
      dateFrom || dateTo
        ? buildWhereWithDataLanc({
            start: dateFrom || undefined,
            end: dateTo || undefined,
            grupoId: [groupId],
            unidadeId: unidadeIdSingle
              ? [unidadeIdSingle]
              : unidadeId.length
                ? unidadeId
                : undefined,
            categoria: categoriaNames.length ? categoriaNames : undefined,
            tipo: (tipos && tipos.length ? tipos : ['DESPESA']) as any,
            search: search || undefined,
          })
        : undefined;

    const where = {
      ...whereCompetencia,
      ...(whereDataLanc ? { AND: [whereCompetencia, whereDataLanc] } : {}),
      ...(formaPagamento ? { formaPagamento: formaPagamento } : {}),
    } as any;

    // 1) Total do grupo
    const totalDoGrupoAgg = await prisma.movimento.aggregate({
      where,
      _sum: { valor: true },
    });
    const totalDoGrupo = Math.abs(Number(totalDoGrupoAgg._sum.valor || 0));

    // Buscar nomes auxiliares
    const grupoRecord = await prisma.grupo.findUnique({
      where: { id: groupId },
    });
    const groupName = grupoRecord?.nome || 'Sem grupo';

    // 2) Pizza por categoria
    const porCategoria = await prisma.movimento.groupBy({
      by: ['categoriaId'],
      where,
      _sum: { valor: true },
    });

    // 3) Tabela por categoria + unidade + grupo
    const porCategoriaUnidade = await prisma.movimento.groupBy({
      by: ['categoriaId', 'unidadeId', 'grupoId'],
      where,
      _sum: { valor: true },
    });

    // Buscar nomes de categoria e unidade
    const categoriaIds = porCategoria
      .map(x => x.categoriaId)
      .filter(Boolean) as string[];
    const unidadeIds = porCategoriaUnidade
      .map(x => x.unidadeId)
      .filter(Boolean) as string[];

    const [categorias, unidades, grupos] = await Promise.all([
      categoriaIds.length
        ? prisma.categoria.findMany({
            where: { id: { in: categoriaIds } },
            select: { id: true, nome: true },
          })
        : Promise.resolve([]),
      unidadeIds.length
        ? prisma.unidade.findMany({
            where: { id: { in: unidadeIds } },
            select: { id: true, nome: true },
          })
        : Promise.resolve([]),
      prisma.grupo.findMany({
        where: { id: { in: [groupId] } },
        select: { id: true, nome: true },
      }),
    ]);

    const categoriaNomeById = new Map(
      categorias.map(c => [c.id, c.nome] as const)
    );
    const unidadeNomeById = new Map(unidades.map(u => [u.id, u.nome] as const));
    const grupoNomeById = new Map(grupos.map(g => [g.id, g.nome] as const));

    const pie = porCategoria
      .map(row => {
        const total = Math.abs(Number(row._sum.valor || 0));
        const categoriaId = row.categoriaId;
        const categoria = categoriaId
          ? categoriaNomeById.get(categoriaId) || 'Sem categoria'
          : 'Sem categoria';
        const pct = totalDoGrupo > 0 ? total / totalDoGrupo : 0;
        return { categoriaId: categoriaId || null, categoria, total, pct };
      })
      .sort((a, b) => b.total - a.total);

    const table = porCategoriaUnidade
      .map(row => {
        const total = Math.abs(Number(row._sum.valor || 0));
        const categoriaId = row.categoriaId;
        const unidadeIdRow = row.unidadeId;
        const grupoIdRow = row.grupoId!;
        const categoria = categoriaId
          ? categoriaNomeById.get(categoriaId) || 'Sem categoria'
          : 'Sem categoria';
        const unidade = unidadeIdRow
          ? unidadeNomeById.get(unidadeIdRow) || 'Sem unidade'
          : 'Sem unidade';
        const grupoNome = grupoNomeById.get(grupoIdRow) || groupName;
        const pct = totalDoGrupo > 0 ? total / totalDoGrupo : 0;
        return {
          categoriaId: categoriaId || null,
          categoria,
          unidadeId: unidadeIdRow || null,
          unidade,
          grupoId: grupoIdRow,
          grupo: grupoNome,
          total,
          pct,
        };
      })
      .sort((a, b) => b.total - a.total);

    const response: GroupBreakdownResponse = {
      meta: {
        groupId,
        groupName,
        total: totalDoGrupo,
        currency: 'BRL',
        appliedFilters: Object.fromEntries(searchParams.entries()),
      },
      pie,
      table,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro no group-breakdown:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
