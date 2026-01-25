export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movimentoId = searchParams.get('id');
    if (!movimentoId) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }
    const logs = await prisma.auditLog.findMany({
      where: {
        resource: 'Movimento',
        resourceId: movimentoId,
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, photoUrl: true, email: true } },
      },
    });
    return NextResponse.json({
      items: logs.map(l => ({
        id: l.id,
        ts: l.timestamp,
        action: l.action,
        actor: l.user
          ? {
              id: l.user.id,
              name: l.user.name,
              email: (l as any).user?.email,
              photoUrl: l.user.photoUrl,
            }
          : null,
        details: l.details,
        success: l.success,
        error: l.error,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}
