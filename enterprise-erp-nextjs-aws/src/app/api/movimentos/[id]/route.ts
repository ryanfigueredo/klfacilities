export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params.id);
    const mov = await prisma.movimento.findUnique({
      where: { id },
      include: {
        grupo: { select: { id: true, nome: true } },
        unidade: { select: { id: true, nome: true } },
        categoriaRel: { select: { id: true, nome: true } },
        criadoPor: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    } as any);

    if (!mov) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const duplicados = await prisma.movimento.count({
      where: {
        id: { not: mov.id },
        dataLanc: mov.dataLanc as any,
        valor: mov.valor as any,
        grupoId: mov.grupoId ?? undefined,
        deletedAt: null,
      },
    } as any);

    const flags = {
      duplicado: duplicados > 0,
      semCategoria: !mov.categoria && !mov.categoriaId,
      outlier: false,
    };

    return NextResponse.json({ ...mov, flags });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}
