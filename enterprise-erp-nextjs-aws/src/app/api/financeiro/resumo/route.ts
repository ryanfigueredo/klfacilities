import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit/log';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mesParam = url.searchParams.get('mes');
  const today = new Date();

  const year = mesParam ? Number(mesParam.split('-')[0]) : today.getFullYear();
  const month = mesParam
    ? Number(mesParam.split('-')[1]) - 1
    : today.getMonth();

  const inicio = new Date(year, month, 1);
  const fim = new Date(year, month + 1, 0, 23, 59, 59, 999);

  try {
    const catAgg = await prisma.movimento.groupBy({
      by: ['categoria'],
      where: {
        tipo: 'DESPESA',
        deletedAt: null,
        dataLanc: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    });

    const grpAgg = await prisma.movimento.groupBy({
      by: ['grupoId'],
      where: {
        tipo: 'DESPESA',
        deletedAt: null,
        dataLanc: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    });

    const grupos = await Promise.all(
      grpAgg.map(async g => {
        const nome = g.grupoId
          ? (await prisma.grupo.findUnique({ where: { id: g.grupoId } }))?.nome
          : 'SEM GRUPO';
        return { grupo: nome ?? 'SEM GRUPO', valor: Number(g._sum.valor ?? 0) };
      })
    );

    const categorias = catAgg.map(c => ({
      categoria: c.categoria ?? 'SEM CATEGORIA',
      valor: Number(c._sum.valor ?? 0),
    }));

    await logAudit({
      action: 'resumo.read',
      resource: 'Movimento',
      success: true,
      metadata: { month: month + 1, year },
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/financeiro/resumo',
    });
    return NextResponse.json({ categorias, grupos });
  } catch (e: any) {
    await logAudit({
      action: 'resumo.read',
      resource: 'Movimento',
      success: false,
      error: String(e),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/financeiro/resumo',
    });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
