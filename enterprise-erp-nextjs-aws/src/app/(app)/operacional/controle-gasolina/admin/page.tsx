import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth';
import {
  CONTROLE_GASOLINA_ALLOWED_ROLES,
  requireControleGasolinaAdmin,
} from '@/lib/controle-gasolina/auth';

import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function ControleGasolinaAdminPage() {
  const me = await getCurrentUser();

  if (!me?.id) {
    redirect('/login');
  }

  if (!CONTROLE_GASOLINA_ALLOWED_ROLES.includes(me.role as Role)) {
    redirect('/unauthorized');
  }

  // Ensure admin access (throws if role não permitido)
  await requireControleGasolinaAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-12 md:p-8">
      <AdminClient />
    </div>
  );
}

