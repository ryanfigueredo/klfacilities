import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    const me = await requireControleGasolinaUser();

    const vinculo = await prisma.vehicleUser.findFirst({
      where: { usuarioId: me.id, ativo: true },
      include: { veiculo: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!vinculo?.veiculo) {
      return NextResponse.json(null);
    }

    return NextResponse.json(vinculo.veiculo);
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar veículo do usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
