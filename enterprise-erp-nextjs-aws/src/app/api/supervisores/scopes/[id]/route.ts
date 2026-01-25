import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  // OPERACIONAL não pode excluir diretamente, precisa criar solicitação
  if (session.user.role === 'OPERACIONAL') {
    return NextResponse.json(
      { error: 'OPERACIONAL não pode excluir diretamente. Crie uma solicitação de exclusão.' },
      { status: 403 }
    );
  }

  if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const scopeId = params.id;
  if (!scopeId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  await prisma.supervisorScope.delete({
    where: { id: scopeId },
  });

  return NextResponse.json({ success: true });
}
