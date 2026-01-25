import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [grupos, unidades, responsaveis, categorias] = await Promise.all([
      prisma.grupo.findMany({ select: { id: true, nome: true, ativo: true } }),
      prisma.unidade.findMany({
        select: { id: true, nome: true, ativa: true },
      }),
      prisma.responsavel.findMany({
        select: { id: true, nome: true, ativo: true },
      }),
      prisma.categoria.findMany({ select: { id: true, nome: true } }),
    ]);

    return NextResponse.json({
      grupos: Array.isArray(grupos) ? grupos : [],
      unidades: Array.isArray(unidades) ? unidades : [],
      responsaveis: Array.isArray(responsaveis) ? responsaveis : [],
      categorias: Array.isArray(categorias) ? categorias : [],
    });
  } catch (e) {
    console.error('catalogos error', e);
    return NextResponse.json({
      grupos: [],
      unidades: [],
      responsaveis: [],
      categorias: [],
    });
  }
}
