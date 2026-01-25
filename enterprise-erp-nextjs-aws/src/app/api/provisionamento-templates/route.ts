export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import {
  provisionamentoTemplateCreateSchema,
  provisionamentoTemplateFilterSchema,
} from '@/server/schemas/provisionamento-template.schema';
import {
  createProvisionamentoTemplate,
  listProvisionamentoTemplates,
} from '@/server/services/provisionamento-template.service';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    const role = me?.role as any;
    if (!can(role as any, 'provisionamentos', 'list')) {
      return NextResponse.json(
        forbiddenPayload('provisionamentos', 'list'),
        { status: 403 }
      );
    }
    const url = new URL(request.url);
    const params: any = Object.fromEntries(url.searchParams.entries());
    const parsed = provisionamentoTemplateFilterSchema.safeParse(params);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    const data = await listProvisionamentoTemplates(parsed.data);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}

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
    const json = await request.json();
    const parsed = provisionamentoTemplateCreateSchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    const created = await createProvisionamentoTemplate(parsed.data as any);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}

