import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalizado = value.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalizado);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export async function POST(req: NextRequest) {
  const me = await requireControleGasolinaAdmin();

  try {
    const body = await req.json().catch(() => ({}));
    const { vehicleId, litros, valor, kmAtual, observacao, dataHora } = body as {
      vehicleId?: string;
      litros?: number | string;
      valor?: number | string;
      kmAtual?: number | string;
      observacao?: string;
      dataHora?: string;
    };

    if (!vehicleId || litros == null || valor == null || kmAtual == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    const litrosNum = toNumber(litros);
    const valorNum = toNumber(valor);
    const kmNum = toNumber(kmAtual);

    if ([litrosNum, valorNum, kmNum].some(number => Number.isNaN(number))) {
      return NextResponse.json(
        { error: 'Valores numéricos inválidos' },
        { status: 400 }
      );
    }

    const createdAt = dataHora ? new Date(dataHora) : new Date();
    if (Number.isNaN(createdAt.getTime())) {
      return NextResponse.json({ error: 'Data/Hora inválida' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const exists = await prisma.fuelRecord.findFirst({
      where: { veiculoId: vehicle.id, createdAt },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: 'Registro duplicado para este horário' },
        { status: 409 }
      );
    }

    const registro = await prisma.fuelRecord.create({
      data: {
        litros: litrosNum,
        valor: valorNum,
        kmAtual: kmNum,
        situacaoTanque: 'CHEIO',
        photoUrl: '',
        observacao: observacao ?? 'Criado manualmente pelo administrador',
        createdAt,
        usuarioId: me.id,
        veiculoId: vehicle.id,
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (err) {
    console.error('Erro ao registrar abastecimento manual:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
