export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { marcarPagoSchema } from '@/server/schemas/provisionamento.schema';
import { marcarComoPago } from '@/server/services/provisionamento.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.user?.role;
    if (role !== 'ADMIN')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const json = await request.json().catch(() => ({}));
    const parsed = marcarPagoSchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    const userId = (session as any)?.user?.id as string | undefined;
    const mov = await marcarComoPago(params.id, parsed.data, userId);
    return NextResponse.json(mov, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 400 });
  }
}
