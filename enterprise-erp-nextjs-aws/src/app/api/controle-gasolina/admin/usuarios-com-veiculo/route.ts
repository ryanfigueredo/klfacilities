import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET() {
  try {
    await requireControleGasolinaAdmin();

    const users = await prisma.user.findMany({
      include: {
        vehicleAssignments: {
          where: { ativo: true },
          include: {
            veiculo: {
              select: { id: true, placa: true, modelo: true },
            },
          },
        },
        fuelRecords: {
          select: { valor: true },
        },
      },
    });

    const resultado = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      vehicles: user.vehicleAssignments.map(assignment => ({
        id: assignment.veiculo.id,
        placa: assignment.veiculo.placa,
        modelo: assignment.veiculo.modelo,
      })),
      totalAbastecido: user.fuelRecords.reduce(
        (acc, fuelRecord) => acc + fuelRecord.valor,
        0
      ),
      ativo: true,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[GET /controle-gasolina/admin/usuarios-com-veiculo]', error);
    return new Response('Erro ao buscar usuários', { status: 500 });
  }
}
