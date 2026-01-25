export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCompetencia } from '@/lib/date/competencia';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const novaDataStr = String(body?.novaData || '');
    const novaData = new Date(novaDataStr);
    if (!novaDataStr || isNaN(+novaData))
      return NextResponse.json({ error: 'novaData inválida' }, { status: 400 });

    const updated = await prisma.provisionamento.update({
      where: { id: params.id },
      data: { dataVenc: novaData as any },
    } as any);

    return NextResponse.json({
      ...updated,
      dataVenc: (updated as any).dataVenc.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 400 });
  }
}
