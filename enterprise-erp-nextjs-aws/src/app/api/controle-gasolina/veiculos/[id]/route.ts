import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireControleGasolinaUser();

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { id: true, placa: true, modelo: true, ano: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Veículo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar veículo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
