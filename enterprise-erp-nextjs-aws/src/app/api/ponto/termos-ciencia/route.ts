import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();

    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas JURIDICO, MASTER, ADMIN e OPERACIONAL podem ver
    if (!['JURIDICO', 'MASTER', 'ADMIN', 'OPERACIONAL'].includes(me.role)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Você não tem permissão para visualizar termos de ciência' },
        { status: 403 }
      );
    }

    const termos = await prisma.termoCienciaPonto.findMany({
      orderBy: { assinadoEm: 'desc' },
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
            unidade: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: termos,
    });
  } catch (error) {
    console.error('Erro ao buscar termos de ciência:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

