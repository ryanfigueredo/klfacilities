export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { gerarProvisionamentos } from '@/server/services/provisionamento-template.service';
import { addMonths } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    const role = me?.role as any;
    if (!can(role as any, 'provisionamentos', 'create')) {
      return NextResponse.json(
        forbiddenPayload('provisionamentos', 'create'),
        { status: 403 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const meses = Number(json.meses) || 3; // Padrão: 3 meses
    const ateData = addMonths(new Date(), meses);

    const resultado = await gerarProvisionamentos(ateData);
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}

