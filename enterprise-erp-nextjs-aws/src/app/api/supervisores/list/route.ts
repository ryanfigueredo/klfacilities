import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const supervisores = await prisma.user.findMany({
    where: {
      role: { in: ['SUPERVISOR', 'LAVAGEM'] },
      ativo: true, // Apenas supervisores ativos
    },
    select: {
      id: true,
      name: true,
      email: true,
      whatsapp: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(supervisores);
}
