import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireControleGasolinaUser();

    if (!['MASTER', 'ADMIN'].includes(me.role as string)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { kmSaida } = await req.json();
    const { id } = params;

    if (!kmSaida || Number.isNaN(Number(kmSaida))) {
      return NextResponse.json(
        { error: 'Quilometragem inválida' },
        { status: 400 }
      );
    }

    const rotaAtualizada = await prisma.rotaRecord.update({
      where: { id },
      data: { kmSaida: Number(kmSaida) },
    });

    return NextResponse.json({ success: true, rota: rotaAtualizada });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar rota:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
