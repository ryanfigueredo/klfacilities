import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaAdmin,
} from '@/lib/controle-gasolina/auth';

interface CreateUserBody {
  name: string;
  email: string;
  role: Role;
  vehicleId?: string | null;
  password: string;
}

export async function GET() {
  try {
    await requireControleGasolinaAdmin();
    const users = await prisma.user.findMany({
      where: {
        role: 'SUPERVISOR',
        ativo: true, // Apenas supervisores ativos
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        vehicleAssignments: {
          where: { ativo: true },
          include: {
            veiculo: {
              select: { id: true, placa: true, modelo: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vehicles: user.vehicleAssignments.map(assignment => ({
        id: assignment.veiculo.id,
        placa: assignment.veiculo.placa,
        modelo: assignment.veiculo.modelo,
      })),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireControleGasolinaAdmin();
    const body = (await req.json()) as CreateUserBody;
    const { name, email, role, vehicleId, password } = body;

    if (!email || !role || !password || !name) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'E-mail já cadastrado.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
      },
    });

    if (vehicleId) {
      await prisma.vehicleUser.create({
        data: {
          usuarioId: user.id,
          veiculoId: vehicleId,
        },
      });
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
