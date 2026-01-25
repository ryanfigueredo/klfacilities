import { MovimentoNotification } from '@/components/dashboard/MovimentoNotification';
import { LookerStudioEmbed } from '@/components/dashboard/LookerStudioEmbed';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

// Revalidação controlada abaixo junto com `dynamic`

async function getLastMovimentoId() {
  const ultimoMovimento = await prisma.movimento.findFirst({
    where: {
      deletedAt: { equals: null },
    },
    select: {
      id: true,
    },
    orderBy: {
      dataLanc: 'desc',
    },
  });

  return ultimoMovimento?.id || null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Proteção: Apenas MASTER e ADMIN podem acessar dashboard
  if (!session?.user?.role || !['MASTER', 'ADMIN'].includes(session.user.role)) {
    // Redirecionar para páginas apropriadas baseado no role
    const role = session?.user?.role;
    if (role === 'RH' || role === 'OPERACIONAL') {
    redirect('/ponto/admin');
    } else if (role === 'JURIDICO') {
      redirect('/rh/processos');
    } else if (role === 'SUPERVISOR') {
      redirect('/checklist-admin');
    } else {
      redirect('/login');
    }
  }

  const lastMovimentoId = await getLastMovimentoId();

  return (
    <div className="space-y-6 sm:space-y-8 mx-auto w-full max-w-[390px] sm:max-w-none sm:mx-0">
      <MovimentoNotification lastMovimentoId={lastMovimentoId || undefined} />

      <div className="w-full h-full">
        <LookerStudioEmbed />
      </div>
    </div>
  );
}
