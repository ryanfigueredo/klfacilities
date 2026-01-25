import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function unaccent(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[ºª]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeDescricao(s: string): string {
  const base = unaccent((s || '').toLowerCase());
  return base.replace(/^(salario\s*[-:])\s*/i, 'salario - ');
}

function toISODate(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export async function detectDuplicates(opts?: {
  includeUnidade?: boolean;
  dateWindowDays?: number;
}) {
  const includeUnidade = opts?.includeUnidade ?? true;
  const dateWindowDays = Math.max(0, Math.min(3, opts?.dateWindowDays ?? 0));

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 18);

  const movimentos = await prisma.movimento.findMany({
    where: { deletedAt: null, dataLanc: { gte: since } },
    select: {
      id: true,
      descricao: true,
      dataLanc: true,
      valor: true,
      unidadeId: true,
    },
  });

  const buckets = new Map<string, string[]>();
  for (const m of movimentos) {
    const desc = normalizeDescricao(m.descricao);
    const baseDate = toISODate(m.dataLanc);
    const val = Number(m.valor);
    const unidadeKey = includeUnidade ? `|${m.unidadeId ?? '_'}` : '';

    const dates: string[] = [baseDate];
    for (let i = 1; i <= dateWindowDays; i++) {
      const d1 = new Date(m.dataLanc);
      d1.setUTCDate(d1.getUTCDate() - i);
      const d2 = new Date(m.dataLanc);
      d2.setUTCDate(d2.getUTCDate() + i);
      dates.push(toISODate(d1));
      dates.push(toISODate(d2));
    }

    for (const dt of dates) {
      const key = `${desc}|${dt}|${val.toFixed(2)}${unidadeKey}`;
      const arr = buckets.get(key) ?? [];
      arr.push(m.id);
      buckets.set(key, arr);
    }
  }

  let created = 0;
  for (const [key, ids] of buckets) {
    if (ids.length <= 1) continue;
    await prisma.anomalia.upsert({
      where: { hash: key } as any,
      update: {
        movimentoIds: Array.from(new Set(ids)),
        status: 'PENDING' as any,
      },
      create: {
        hash: key,
        movimentoIds: Array.from(new Set(ids)),
        type: 'DUPLICATE' as any,
        status: 'PENDING' as any,
      },
    } as any);
    created++;
  }
  return { duplicates: created };
}

export async function detectNoCategory() {
  const semCat = await prisma.movimento.findMany({
    where: { deletedAt: null, categoriaId: null },
    select: { id: true },
  });
  for (const m of semCat) {
    const key = `NO_CATEGORY|${m.id}`;
    await prisma.anomalia.upsert({
      where: { hash: key } as any,
      update: { movimentoIds: [m.id], status: 'PENDING' as any },
      create: {
        hash: key,
        movimentoIds: [m.id],
        type: 'NO_CATEGORY' as any,
        status: 'PENDING' as any,
      },
    } as any);
  }
  return { noCategory: semCat.length };
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mad(arr: number[], med: number): number {
  const dev = arr.map(v => Math.abs(v - med));
  return median(dev) * 1.4826; // consistency constant
}

export async function detectOutliers() {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 6);
  const rows = await prisma.movimento.findMany({
    where: {
      deletedAt: null,
      dataLanc: { gte: since },
      categoriaId: { not: null },
    },
    select: { id: true, valor: true, categoriaId: true, unidadeId: true },
  });
  const groups = new Map<string, { id: string; v: number }[]>();
  for (const r of rows) {
    const key = `${r.categoriaId}|${r.unidadeId ?? '_'}`;
    const arr = groups.get(key) ?? [];
    arr.push({ id: r.id, v: Number(r.valor) });
    groups.set(key, arr);
  }
  let count = 0;
  for (const [gk, arr] of groups) {
    const values = arr.map(a => a.v);
    const med = median(values);
    const m = mad(values, med) || 1e-6;
    const z = (x: number) => Math.abs((x - med) / m);
    for (const a of arr) {
      const zc = z(a.v);
      const diff = Math.abs(a.v - med) / (med || 1e-6);
      if (zc > 3 || diff > 0.3) {
        const key = `OUTLIER|${gk}|${a.id}`;
        await prisma.anomalia.upsert({
          where: { hash: key } as any,
          update: { movimentoIds: [a.id], status: 'PENDING' as any },
          create: {
            hash: key,
            movimentoIds: [a.id],
            type: 'OUTLIER' as any,
            status: 'PENDING' as any,
          },
        } as any);
        count++;
      }
    }
  }
  return { outliers: count };
}

export async function recalcAll(
  scope?: 'all' | 'duplicates' | 'no_category' | 'outliers'
) {
  const res = { duplicates: 0, noCategory: 0, outliers: 0 };
  if (!scope || scope === 'duplicates' || scope === 'all') {
    const r = await detectDuplicates();
    res.duplicates = r.duplicates;
  }
  if (!scope || scope === 'no_category' || scope === 'all') {
    const r = await detectNoCategory();
    res.noCategory = r.noCategory;
  }
  if (!scope || scope === 'outliers' || scope === 'all') {
    const r = await detectOutliers();
    res.outliers = r.outliers;
  }
  return res;
}
