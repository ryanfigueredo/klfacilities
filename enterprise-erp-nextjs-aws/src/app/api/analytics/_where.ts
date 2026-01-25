import { Prisma } from '@prisma/client';
import { AnalyticsFilters } from './_schemas';

export const buildWhere = (
  f: AnalyticsFilters
): Prisma.MovimentoWhereInput => ({
  deletedAt: null,
  parentId: null, // Excluir filhos para não somar duas vezes
  ...(f.start || f.end
    ? {
        competencia: (() => {
          const start = f.start ? new Date(f.start) : undefined;
          const end = f.end ? new Date(f.end) : undefined;
          const endExclusive = end
            ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
            : undefined;
          return {
            gte: start,
            lt: endExclusive,
          } as Prisma.DateTimeFilter;
        })(),
      }
    : {}),
  ...(f.grupoId?.length ? { grupoId: { in: f.grupoId } } : {}),
  ...(f.unidadeId?.length ? { unidadeId: { in: f.unidadeId } } : {}),
  ...(f.categoria?.length ? { categoria: { in: f.categoria } } : {}),
  ...(f.tipo?.length ? { tipo: { in: f.tipo as any } } : {}),
  ...(f.search
    ? { descricao: { contains: f.search, mode: 'insensitive' } }
    : {}),
});

export const buildWhereWithDataLanc = (
  f: AnalyticsFilters
): Prisma.MovimentoWhereInput => ({
  deletedAt: null,
  parentId: null,
  ...(f.start || f.end
    ? {
        dataLanc: (() => {
          const start = f.start ? new Date(f.start) : undefined;
          const end = f.end ? new Date(f.end) : undefined;
          const endExclusive = end
            ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
            : undefined;
          return {
            gte: start,
            lt: endExclusive,
          } as Prisma.DateTimeFilter;
        })(),
      }
    : {}),
  ...(f.grupoId?.length ? { grupoId: { in: f.grupoId } } : {}),
  ...(f.unidadeId?.length ? { unidadeId: { in: f.unidadeId } } : {}),
  ...(f.categoria?.length ? { categoria: { in: f.categoria } } : {}),
  ...(f.tipo?.length ? { tipo: { in: f.tipo as any } } : {}),
  ...(f.search
    ? { descricao: { contains: f.search, mode: 'insensitive' } }
    : {}),
});
