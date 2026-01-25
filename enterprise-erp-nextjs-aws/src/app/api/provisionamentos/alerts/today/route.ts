export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getProvisionamentoAlertsToday } from '@/server/services/provisionamento.service';

export async function GET(_req: NextRequest) {
  try {
    const result = await getProvisionamentoAlertsToday();
    return NextResponse.json(result);
  } catch (e: any) {
    // Fallback seguro para não quebrar o dashboard em produção
    console.error('alerts/today error', e);
    return NextResponse.json({ vencidos: 0, venceHoje: 0, items: [] });
  }
}
