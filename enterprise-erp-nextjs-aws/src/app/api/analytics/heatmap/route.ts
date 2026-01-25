import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhereWithDataLanc } from '../_where';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const where = buildWhereWithDataLanc(parsed.data);

    const rows = await prisma.movimento.findMany({
      where,
      select: { dataLanc: true, tipo: true, valorAssinado: true },
    });

    // Agregar por dia e hora
    const dailyMap = new Map<string, { receitas: number; despesas: number }>();
    const heatMap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows) {
      const d = r.dataLanc as Date;
      const dayKey = d.toISOString().slice(0, 10);
      const hour = d.getUTCHours();
      const dow = d.getUTCDay(); // 0-dom ... 6-sab
      const abs = Math.abs(Number(r.valorAssinado || 0));
      if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { receitas: 0, despesas: 0 });
      const entry = dailyMap.get(dayKey)!;
      if (r.tipo === 'RECEITA') entry.receitas += abs; else entry.despesas += abs;
      heatMap[dow][hour] += abs;
    }
    const daily = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ daily, heatMap });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}


