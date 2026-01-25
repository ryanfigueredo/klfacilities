export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as {
      anomalyId: string;
      action: 'MERGE' | 'KEEP' | 'IGNORE' | 'SET_CATEGORY';
      payload?: {
        keepId?: string;
        deleteIds?: string[];
        categoriaId?: string;
        note?: string;
      };
    };
    const { anomalyId, action, payload } = body;
    if (!anomalyId || !action)
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });

    const res = await prisma.$transaction(async tx => {
      const an = await tx.anomalia.findUnique({ where: { id: anomalyId } });
      if (!an) throw new Error('Anomalia não encontrada');

      if (action === 'MERGE') {
        const keepId = payload?.keepId;
        const del = (payload?.deleteIds ?? []).filter(x => x && x !== keepId);
        if (!keepId || !del.length)
          throw new Error('keepId/deleteIds inválidos');
        const now = new Date();
        await tx.movimento.updateMany({
          where: { id: { in: del } },
          data: { deletedAt: now },
        });
        await tx.anomalia.update({
          where: { id: anomalyId },
          data: {
            status: 'RESOLVED' as any,
            resolvedAt: now,
            notes: payload?.note ?? null,
          },
        });
        return { merged: del.length };
      }

      if (action === 'KEEP' || action === 'IGNORE') {
        const now = new Date();
        await tx.anomalia.update({
          where: { id: anomalyId },
          data: {
            status: 'IGNORED' as any,
            resolvedAt: now,
            notes: payload?.note ?? null,
          },
        });
        return { ignored: true };
      }

      if (action === 'SET_CATEGORY') {
        const cat = payload?.categoriaId;
        if (!cat) throw new Error('categoriaId obrigatório');
        const ids = an.movimentoIds || [];
        if (!ids.length) throw new Error('Sem movimentos');
        await tx.movimento.updateMany({
          where: { id: { in: ids } },
          data: { categoriaId: cat },
        });
        await tx.anomalia.update({
          where: { id: anomalyId },
          data: {
            status: 'RESOLVED' as any,
            resolvedAt: new Date(),
            notes: payload?.note ?? null,
          },
        });
        return { categorized: ids.length };
      }

      throw new Error('Ação inválida');
    });

    return NextResponse.json({ success: true, data: res });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Erro' },
      { status: 500 }
    );
  }
}
