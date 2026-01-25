import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    const me = await requireControleGasolinaUser();

    const vinculos = await prisma.vehicleUser.findMany({
      where: { usuarioId: me.id, ativo: true },
      include: {
        veiculo: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const principal = vinculos[0];

    if (!principal?.veiculo) {
      return NextResponse.json({ resumo: null, abastecimentos: [] });
    }

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: {
        usuarioId: me.id,
        veiculoId: principal.veiculoId,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalGasto = fuelRecords.reduce((sum, record) => sum + record.valor, 0);
    const totalLitros = fuelRecords.reduce(
      (sum, record) => sum + record.litros,
      0
    );
    const totalKm =
      fuelRecords.length > 1
        ? fuelRecords[fuelRecords.length - 1].kmAtual - fuelRecords[0].kmAtual
        : 0;

    const resumo = {
      totalGasto,
      abastecimentos: fuelRecords.length,
      totalKm,
      mediaPorLitro: totalLitros > 0 ? totalKm / totalLitros : 0,
      veiculo: {
        id: principal.veiculo.id,
        placa: principal.veiculo.placa,
        modelo: principal.veiculo.modelo,
      },
    };

    return NextResponse.json({
      resumo,
      abastecimentos: fuelRecords.map(record => ({
        id: record.id,
        litros: record.litros,
        valor: record.valor,
        kmAtual: record.kmAtual,
        situacaoTanque: record.situacaoTanque,
        observacao: record.observacao,
        createdAt: record.createdAt,
        photoUrl: record.photoUrl,
      })),
    });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao carregar resumo do usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
