import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const ADIANTAMENTO_MATCH_TERMS = ['adiant', 'vale'] as const;

export const AdiantamentoFilterSchema = z.object({
  start: z.string(),
  end: z.string(),
  unidadeIds: z.array(z.string()).optional(),
  grupoIds: z.array(z.string()).optional(),
  responsavel: z.string().optional(),
  q: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

type Filters = z.infer<typeof AdiantamentoFilterSchema>;

function adiantamentoWhere(f: Filters) {
  const orMatcher = [
    { categoria: { contains: 'adiant', mode: 'insensitive' as const } },
    { subcategoria: { contains: 'adiant', mode: 'insensitive' as const } },
    { descricao: { contains: 'adiant', mode: 'insensitive' as const } },
    { descricao: { contains: 'vale', mode: 'insensitive' as const } },
  ];
  const where: any = {
    tipo: 'DESPESA',
    deletedAt: null,
    dataLanc: { gte: new Date(f.start), lte: new Date(f.end) },
    OR: orMatcher,
  };
  if (f.unidadeIds?.length) where.unidadeId = { in: f.unidadeIds };
  if (f.grupoIds?.length) where.grupoId = { in: f.grupoIds };
  if (f.responsavel)
    where.responsavel = { contains: f.responsavel, mode: 'insensitive' };
  if (f.q)
    where.OR = [
      ...orMatcher,
      { documento: { contains: f.q, mode: 'insensitive' } },
      { descricao: { contains: f.q, mode: 'insensitive' } },
    ];
  return where;
}

export async function listAdiantamentos(f: Filters) {
  const where = adiantamentoWhere(f);

  const [items, totalCount, sumAgg] = await Promise.all([
    prisma.movimento.findMany({
      where,
      include: { unidade: true, grupo: true },
      orderBy: { dataLanc: 'desc' },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.movimento.count({ where }),
    prisma.movimento.aggregate({ _sum: { valorAssinado: true }, where }),
  ]);

  const totalPositivo = Math.abs(Number(sumAgg._sum.valorAssinado ?? 0));
  return { items, totalCount, totalPositivo };
}

export async function groupByResponsavel(f: Filters) {
  const where = adiantamentoWhere(f);
  const rows = await prisma.movimento.groupBy({
    by: ['responsavel', 'unidadeId'],
    where,
    _sum: { valorAssinado: true },
  });
  const unidadeIds = Array.from(
    new Set(rows.map(r => r.unidadeId).filter(Boolean))
  ) as string[];
  const unidades = await prisma.unidade.findMany({
    where: { id: { in: unidadeIds } },
  });
  const mapU = new Map(unidades.map(u => [u.id, u.nome] as const));

  return rows.map(r => ({
    responsavel: r.responsavel ?? '—',
    unidadeId: r.unidadeId,
    unidade: r.unidadeId ? (mapU.get(r.unidadeId) ?? '—') : '—',
    total: Math.abs(Number(r._sum.valorAssinado ?? 0)),
    count: (r as any)._count?.id ?? undefined,
  }));
}

export async function groupByUnidade(f: Filters) {
  const where = adiantamentoWhere(f);
  const rows = await prisma.movimento.groupBy({
    by: ['unidadeId'],
    where,
    _sum: { valorAssinado: true },
  });
  const unidadeIds = rows.map(r => r.unidadeId).filter(Boolean) as string[];
  const unidades = await prisma.unidade.findMany({
    where: { id: { in: unidadeIds } },
  });
  const mapU = new Map(unidades.map(u => [u.id, u.nome] as const));
  return rows.map(r => ({
    unidadeId: r.unidadeId,
    unidade: r.unidadeId ? (mapU.get(r.unidadeId) ?? '—') : '—',
    total: Math.abs(Number(r._sum.valorAssinado ?? 0)),
  }));
}
