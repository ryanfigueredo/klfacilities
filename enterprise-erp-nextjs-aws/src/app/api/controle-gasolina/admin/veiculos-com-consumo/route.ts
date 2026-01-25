import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    await requireControleGasolinaAdmin();

    const veiculos = await prisma.vehicle.findMany({
      include: {
        kmRegistros: { select: { km: true } },
        abastecimentos: { select: { valor: true } },
      },
    });

    const formatado = veiculos.map(veiculo => ({
      id: veiculo.id,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      totalKm:
        veiculo.kmRegistros?.reduce((acc, registro) => acc + (registro.km ?? 0), 0) ??
        0,
      totalCombustivel:
        veiculo.abastecimentos?.reduce(
          (acc, registro) => acc + (registro.valor ?? 0),
          0
        ) ?? 0,
    }));

    return NextResponse.json(formatado);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    return new Response('Erro interno', { status: 500 });
  }
}
