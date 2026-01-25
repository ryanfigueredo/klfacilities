export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { provisionamentoUpdateSchema } from '@/server/schemas/provisionamento.schema';
import {
  deleteProvisionamento,
  updateProvisionamento,
} from '@/server/services/provisionamento.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    const role = me?.role as any;
    if (!can(role as any, 'provisionamentos', 'update')) {
      return NextResponse.json(forbiddenPayload('provisionamentos', 'update'), {
        status: 403,
      });
    }
    const json = await request.json();
    const parsed = provisionamentoUpdateSchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    const updated = await updateProvisionamento(params.id, parsed.data as any);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    const role = me?.role as any;
    if (!can(role as any, 'provisionamentos', 'delete')) {
      return NextResponse.json(forbiddenPayload('provisionamentos', 'delete'), {
        status: 403,
      });
    }
    await deleteProvisionamento(params.id);
    return NextResponse.json({}, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 400 });
  }
}
