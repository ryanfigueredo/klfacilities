export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EXPECTED = 69509.22;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const grupo = url.searchParams.get('grupo') || 'PROFARMA';
  const competenciaStr = url.searchParams.get('competencia') || '2025-07-01';
  const competencia = new Date(`${competenciaStr}T00:00:00-03:00`);

  const grupoRow = await prisma.grupo.findFirst({
    where: { nome: { contains: grupo, mode: 'insensitive' } },
  });
  if (!grupoRow)
    return NextResponse.json(
      { error: 'Grupo não encontrado' },
      { status: 404 }
    );

  const salarioCat = await prisma.categoria.findFirst({
    where: {
      nome: { startsWith: 'SALAR', mode: 'insensitive' },
      tipo: 'DESPESA',
    },
  });
  if (!salarioCat)
    return NextResponse.json(
      { error: 'Categoria não encontrada' },
      { status: 404 }
    );

  const movs = await prisma.movimento.findMany({
    where: { grupoId: grupoRow.id, categoriaId: salarioCat.id, competencia },
  });

  const total = movs.reduce((acc, m) => acc + Number(m.valor), 0);
  const diffAbs = Math.abs(total - EXPECTED);
  const diffPct = EXPECTED ? diffAbs / EXPECTED : 0;

  const semUnidade = await prisma.funcionario.count({
    where: { grupoId: grupoRow.id, unidadeId: null },
  });
  const totalFuncs = await prisma.funcionario.count({
    where: { grupoId: grupoRow.id },
  });
  const percSemUnidade = totalFuncs ? (semUnidade / totalFuncs) * 100 : 0;

  const duplicidades = await prisma.movimento.groupBy({
    by: ['descricao', 'valor', 'funcionarioId'],
    where: { grupoId: grupoRow.id, categoriaId: salarioCat.id, competencia },
    _count: { _all: true },
    having: { _count: { _all: { gt: 1 } } },
  } as any);

  const report = {
    totalAtual: total,
    totalEsperado: EXPECTED,
    diffAbs,
    diffPct,
    percSemUnidade,
    duplicidades,
  };

  if (diffAbs > 0.01) {
    return NextResponse.json(report, { status: 409 });
  }
  return NextResponse.json(report);
}
