import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET() {
  await requireControleGasolinaAdmin();

  const [veiculos, usuarios] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, placa: true, modelo: true },
      orderBy: { placa: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { email: 'asc' },
    }),
  ]);

  return NextResponse.json({
    veiculos,
    usuarios: usuarios.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
    })),
  });
}
