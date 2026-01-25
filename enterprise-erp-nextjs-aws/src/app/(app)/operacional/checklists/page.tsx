import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/auth/policy';

import { ChecklistsDashboardClient } from './_components/ChecklistsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function OperacionalChecklistsPage() {
  const me = await getCurrentUser();

  if (!me?.id) {
    redirect('/login');
  }

  if (!can(me.role, 'checklists', 'list')) {
    redirect('/unauthorized');
  }

  // Apenas MASTER pode gerenciar templates
  const canManageTemplates = me.role === 'MASTER';

  return (
    <ChecklistsDashboardClient
      canManageTemplates={canManageTemplates}
      isSupervisor={me.role === 'SUPERVISOR' || me.role === 'LAVAGEM'}
    />
  );
}

