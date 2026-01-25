import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET(req: NextRequest) {
  await requireControleGasolinaAdmin();

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const usuario = searchParams.get('usuario');
  const veiculo = searchParams.get('veiculo');

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const periodFilter: { gte?: Date; lt?: Date } = {};
  if (startDate) periodFilter.gte = new Date(startDate + 'T00:00:00');
  if (endDate) {
    const end = new Date(endDate + 'T00:00:00');
    periodFilter.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  if (!startDate && !endDate) {
    periodFilter.gte = startOfCurrentMonth;
    periodFilter.lt = startOfNextMonth;
  }

  const filtros: {
    createdAt?: typeof periodFilter;
    usuarioId?: string;
    veiculoId?: string;
  } = {};

  if (Object.keys(periodFilter).length) filtros.createdAt = periodFilter;
  if (usuario) filtros.usuarioId = usuario;
  if (veiculo) filtros.veiculoId = veiculo;

  const [km, fuel, semParar] = await Promise.all([
    prisma.kmRecord.findMany({ where: filtros, include: { usuario: true } }),
    prisma.fuelRecord.findMany({ where: filtros, include: { usuario: true } }),
    prisma.semPararRegistro.findMany({
      where: {
        ...(periodFilter.gte || periodFilter.lt
          ? { data: periodFilter }
          : undefined),
        ...(veiculo ? { veiculoId: veiculo } : undefined),
      },
    }),
  ]);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonthExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const filtrosMesAnterior: typeof filtros = {
    createdAt: { gte: startOfLastMonth, lt: endOfLastMonthExclusive },
  };
  if (usuario) filtrosMesAnterior.usuarioId = usuario;
  if (veiculo) filtrosMesAnterior.veiculoId = veiculo;

  const [kmAnterior, fuelAnterior, semPararAnterior] = await Promise.all([
    prisma.kmRecord.findMany({ where: filtrosMesAnterior }),
    prisma.fuelRecord.findMany({ where: filtrosMesAnterior }),
    prisma.semPararRegistro.findMany({
      where: {
        data: filtrosMesAnterior.createdAt,
        ...(veiculo ? { veiculoId: veiculo } : undefined),
      },
    }),
  ]);

  const totalKm = km.reduce((acc, r) => acc + r.km, 0);
  const totalValorAbastecimentos = fuel.reduce((acc, r) => acc + r.valor, 0);
  const totalValorSemParar = semParar.reduce(
    (acc, r) => acc + Number(r.valor),
    0
  );
  // Valor abastecido inclui tanto abastecimentos quanto Sem Parar
  const totalValorAbastecido = totalValorAbastecimentos + totalValorSemParar;

  const totalPorTipo = {
    KM: km.length,
    ABASTECIMENTO: fuel.length,
    SEM_PARAR: semParar.length,
  };

  const kmPorData: Record<string, number> = {};
  km.forEach(record => {
    const dia = record.createdAt.toISOString().split('T')[0];
    kmPorData[dia] = (kmPorData[dia] ?? 0) + record.km;
  });

  const abastecimentoPorVeiculo: Record<string, number> = {};
  fuel.forEach(record => {
    const key = record.veiculoId ?? 'desconhecido';
    abastecimentoPorVeiculo[key] =
      (abastecimentoPorVeiculo[key] ?? 0) + record.valor;
  });
  semParar.forEach(record => {
    const key = record.veiculoId ?? 'desconhecido';
    abastecimentoPorVeiculo[key] =
      (abastecimentoPorVeiculo[key] ?? 0) + Number(record.valor);
  });

  const abastecimentoPorDataPorUsuario: Record<
    string,
    Record<string, number>
  > = {};
  fuel.forEach(record => {
    const dia = record.createdAt.toISOString().split('T')[0];
    const email = record.usuario?.email ?? 'desconhecido';
    if (!abastecimentoPorDataPorUsuario[dia]) {
      abastecimentoPorDataPorUsuario[dia] = {};
    }
    abastecimentoPorDataPorUsuario[dia][email] =
      (abastecimentoPorDataPorUsuario[dia][email] ?? 0) + record.valor;
  });

  const historicoComparativo = {
    kmAnterior: kmAnterior.reduce((acc, r) => acc + r.km, 0),
    valorAbastecidoAnterior: fuelAnterior.reduce(
      (acc, r) => acc + r.valor,
      0
    ) + semPararAnterior.reduce((acc, r) => acc + Number(r.valor), 0),
    valorSemPararAnterior: semPararAnterior.reduce(
      (acc, r) => acc + Number(r.valor),
      0
    ),
    qtdKmAnterior: kmAnterior.length,
    qtdAbastecimentoAnterior: fuelAnterior.length,
    qtdSemPararAnterior: semPararAnterior.length,
  };

  return NextResponse.json({
    totalKm,
    totalValorAbastecido,
    totalValorSemParar,
    totalGeral: totalValorAbastecido + totalValorSemParar,
    totalPorTipo,
    kmPorData,
    abastecimentoPorVeiculo,
    abastecimentoPorDataPorUsuario,
    historicoComparativo,
  });
}
