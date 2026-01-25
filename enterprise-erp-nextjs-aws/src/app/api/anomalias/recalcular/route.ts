export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { recalcAll } from '@/server/anomalyService';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      scope?: 'all' | 'duplicates' | 'no_category' | 'outliers';
    };
    const res = await recalcAll(body?.scope);
    return NextResponse.json({ success: true, ...res });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Erro' },
      { status: 500 }
    );
  }
}
