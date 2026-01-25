import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function POST(req: NextRequest) {
  try {
    await requireControleGasolinaAdmin();

    const { userId, vehicleId } = await req.json();

    if (!userId || !vehicleId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const [usuario, veiculo] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } }),
    ]);

    if (!usuario || !veiculo) {
      return NextResponse.json(
        { error: 'Usuário ou veículo não encontrado' },
        { status: 404 }
      );
    }

    await prisma.vehicleUser.updateMany({
      where: { usuarioId: userId },
      data: { ativo: false },
    });

    const existing = await prisma.vehicleUser.findFirst({
      where: { usuarioId: userId, veiculoId: vehicleId },
    });

    if (existing) {
      await prisma.vehicleUser.update({
        where: { id: existing.id },
        data: { ativo: true },
      });
    } else {
      await prisma.vehicleUser.create({
        data: {
          usuarioId: userId,
          veiculoId: vehicleId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
