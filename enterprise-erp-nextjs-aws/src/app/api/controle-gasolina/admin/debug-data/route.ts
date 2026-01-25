import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    await requireControleGasolinaAdmin();

    const [kmRecords, fuelRecords, rotaRecords, vehicles, users] =
      await Promise.all([
        prisma.kmRecord.findMany({
          take: 5,
          include: { usuario: true, veiculo: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.fuelRecord.findMany({
          take: 5,
          include: { usuario: true, veiculo: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.rotaRecord.findMany({
          take: 5,
          include: { usuario: true, veiculo: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.vehicle.findMany({
          take: 5,
          include: {
            usuarios: {
              include: {
                usuario: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findMany({
          take: 5,
          include: {
            vehicleAssignments: {
              where: { ativo: true },
              include: { veiculo: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const [totalKm, totalFuel, totalRotas, totalVehicles, totalUsers] =
      await Promise.all([
        prisma.kmRecord.count(),
        prisma.fuelRecord.count(),
        prisma.rotaRecord.count(),
        prisma.vehicle.count(),
        prisma.user.count(),
      ]);

    return NextResponse.json({
      totals: {
        kmRecords: totalKm,
        fuelRecords: totalFuel,
        rotaRecords: totalRotas,
        vehicles: totalVehicles,
        users: totalUsers,
      },
      samples: {
        kmRecords,
        fuelRecords,
        rotaRecords,
        vehicles,
        users,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados de debug:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
