import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    const me = await requireControleGasolinaUser();

    const kmRecords = await prisma.kmRecord.findMany({
      where: { usuarioId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: { usuarioId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({ kmRecords, fuelRecords });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao carregar histórico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
