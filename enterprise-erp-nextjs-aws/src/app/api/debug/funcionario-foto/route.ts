import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/debug/funcionario-foto?cpf=11111111111
 * Endpoint de debug para verificar se a foto foi salva no banco
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cpf = searchParams.get('cpf')?.replace(/\D/g, '');

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    const funcionario = await prisma.funcionario.findFirst({
      where: { cpf },
      select: {
        id: true,
        nome: true,
        cpf: true,
        fotoUrl: true,
        faceDescriptor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      funcionario: {
        ...funcionario,
        temFotoUrl: !!funcionario.fotoUrl,
        temFaceDescriptor: !!funcionario.faceDescriptor,
        faceDescriptorLength: Array.isArray(funcionario.faceDescriptor) ? funcionario.faceDescriptor.length : (typeof funcionario.faceDescriptor === 'object' && funcionario.faceDescriptor !== null ? Object.keys(funcionario.faceDescriptor).length : 0),
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar funcionário:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar funcionário' },
      { status: 500 }
    );
  }
}

