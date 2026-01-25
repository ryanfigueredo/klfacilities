export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.user?.role;
    if (role !== 'ADMIN')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await _request.json().catch(() => ({}));
    const motivo = String(body?.motivo || '');
    const updated = await prisma.provisionamento.update({
      where: { id: params.id },
      data: {
        status: 'CANCELADO',
        canceladoEm: new Date(),
        motivoCancelamento: motivo || null,
      },
    } as any);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 400 });
  }
}
