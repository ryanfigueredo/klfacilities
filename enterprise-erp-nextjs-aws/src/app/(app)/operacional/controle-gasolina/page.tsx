import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  CONTROLE_GASOLINA_ALLOWED_ROLES,
  ensureRoleAccess,
  ADMIN_ROLES,
} from '@/lib/controle-gasolina/auth';
import { DashboardClient } from './_components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ControleGasolinaPage() {
  const me = await getCurrentUser();

  if (!me?.id) {
    redirect('/login');
  }

  if (!ensureRoleAccess(me.role as Role)) {
    redirect('/unauthorized');
  }

  const assignment = await prisma.vehicleUser.findFirst({
    where: { usuarioId: me.id, ativo: true },
    include: {
      veiculo: {
        select: { id: true, placa: true, modelo: true },
      },
    },
  });

  const initialVehicle = assignment
    ? {
        id: assignment.veiculo.id,
        placa: assignment.veiculo.placa,
        modelo: assignment.veiculo.modelo,
      }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-12 md:p-8">
      <DashboardClient
        initialVehicle={initialVehicle}
        canRegisterRoute
        canViewAdmin={ADMIN_ROLES.includes(me.role as Role)}
      />
    </div>
  );
}

