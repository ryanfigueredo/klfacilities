import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Listar categorias de urgência ativas (público, sem autenticação)
export async function GET(request: NextRequest) {
  try {
    const categorias = await prisma.categoriaUrgenciaChamado.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
      select: {
        id: true,
        urgenciaNivel: true,
        nome: true,
        prazoHoras: true,
        descricao: true,
        ordem: true,
      },
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    );
  }
}

