import { TipoCombustivel } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaAdmin,
} from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    await requireControleGasolinaAdmin();
    const veiculos = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(veiculos);
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao listar veículos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireControleGasolinaAdmin();
    const body = await req.json();
    const { placa, modelo, ano, tipoCombustivel, grupoId, unidadeId } = body as {
      placa: string;
      modelo?: string;
      ano?: number | string;
      tipoCombustivel: TipoCombustivel;
      grupoId?: string | null;
      unidadeId?: string | null;
    };

    if (!placa || !tipoCombustivel) {
      return NextResponse.json(
        { error: 'Placa e combustível são obrigatórios.' },
        { status: 400 }
      );
    }

    const placaNormalizada = placa.trim().toUpperCase();
    const exists = await prisma.vehicle.findUnique({
      where: { placa: placaNormalizada },
    });
    if (exists) {
      return NextResponse.json(
        { error: 'Placa já cadastrada.' },
        { status: 400 }
      );
    }

    const anoNumber =
      typeof ano === 'string' ? parseInt(ano, 10) : typeof ano === 'number' ? ano : undefined;

    const created = await prisma.vehicle.create({
      data: {
        placa: placaNormalizada,
        modelo,
        ano: Number.isNaN(anoNumber || NaN) ? undefined : anoNumber ?? undefined,
        tipoCombustivel,
        grupoId: grupoId || null,
        unidadeId: unidadeId || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
