import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/auth/policy';

import { ChecklistsAdminClient } from './_components/ChecklistsAdminClient';

export const dynamic = 'force-dynamic';

export default async function ChecklistsAdminPage() {
  const me = await getCurrentUser();

  if (!me?.id) {
    redirect('/login');
  }

  // Verificar permissão usando o sistema de políticas
  if (!can(me.role, 'checklists', 'update')) {
    redirect('/unauthorized');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-12 md:p-8">
      <ChecklistsAdminClient />
    </div>
  );
}
