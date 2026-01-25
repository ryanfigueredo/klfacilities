import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { computeChecklistDashboardMetrics } from '@/lib/checklists-operacionais/metrics';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser();

  if (!me?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const grupoIds = searchParams.getAll('grupoId').filter(Boolean);
  const unidadeId = searchParams.get('unidadeId') || null;

  const metrics = await computeChecklistDashboardMetrics({
    grupoIds: grupoIds.length > 0 ? grupoIds : undefined,
    unidadeId: unidadeId || undefined,
  });

  return NextResponse.json({ metrics });
}


