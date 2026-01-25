import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parentId = params.id;
    const list = await prisma.movimento.findMany({
      where: { parentId, deletedAt: null },
      select: {
        id: true,
        descricao: true,
        dataLanc: true,
        valor: true,
      },
      orderBy: { dataLanc: 'asc' },
    });
    return NextResponse.json({
      success: true,
      data: list.map(x => ({
        ...x,
        dataLanc: x.dataLanc.toISOString(),
        valor: Number(x.valor as any),
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Erro ao carregar filhos' },
      { status: 500 }
    );
  }
}
