import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ensureRoleAccess } from '@/lib/controle-gasolina/auth';
import { NovaRotaForm } from './NovaRotaForm';

export const dynamic = 'force-dynamic';

export default async function NovaRotaPage() {
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
      veiculo: { select: { id: true, placa: true, modelo: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-4 pb-12 md:p-8">
      <NovaRotaForm
        vehicle={
          assignment
            ? {
                id: assignment.veiculo.id,
                placa: assignment.veiculo.placa,
                modelo: assignment.veiculo.modelo,
              }
            : null
        }
      />
    </div>
  );
}

