export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Lista distinta de users que criaram ou editaram movimentos
    const created = await prisma.movimento.findMany({
      where: { deletedAt: null },
      select: { criadoPorId: true },
      distinct: ['criadoPorId'],
    });
    const updated = await prisma.movimento.findMany({
      where: { deletedAt: null, updatedById: { not: null } },
      select: { updatedById: true },
      distinct: ['updatedById'],
    });
    const ids = Array.from(
      new Set([
        ...created.map(x => x.criadoPorId).filter(Boolean),
        ...updated.map(x => x.updatedById as string).filter(Boolean),
      ])
    );
    const users = await prisma.user.findMany({
      where: { 
        id: { in: ids },
        ativo: true, // Apenas usuários ativos
      },
      select: { id: true, name: true, photoUrl: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}
