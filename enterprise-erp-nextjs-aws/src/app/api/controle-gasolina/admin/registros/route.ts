import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET(req: NextRequest) {
  await requireControleGasolinaAdmin();

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  const registros: Array<{
    id: string;
    tipo: 'KM' | 'ABASTECIMENTO';
    placa: string;
    usuario: string;
    valor: number;
    km: number;
    imagem: string;
    data: Date;
  }> = [];

  if (!tipo || tipo === 'KM') {
    const km = await prisma.kmRecord.findMany({
      include: { usuario: true, veiculo: true },
      orderBy: { createdAt: 'desc' },
    });

    registros.push(
      ...km.map(r => ({
        id: r.id,
        tipo: 'KM' as const,
        placa: r.veiculo?.placa ?? '—',
        usuario: r.usuario?.email ?? '—',
        valor: 0,
        km: r.km,
        imagem: r.photoUrl ?? '',
        data: r.createdAt,
      }))
    );
  }

  if (!tipo || tipo === 'ABASTECIMENTO') {
    const fuel = await prisma.fuelRecord.findMany({
      include: { usuario: true, veiculo: true },
      orderBy: { createdAt: 'desc' },
    });

    registros.push(
      ...fuel.map(r => ({
        id: r.id,
        tipo: 'ABASTECIMENTO' as const,
        placa: r.veiculo?.placa ?? '—',
        usuario: r.usuario?.email ?? '—',
        valor: r.valor,
        km: r.kmAtual,
        imagem: r.photoUrl ?? '',
        data: r.createdAt,
      }))
    );
  }

  return NextResponse.json(registros);
}
