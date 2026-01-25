import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { scopeIds } = body;

    if (!Array.isArray(scopeIds) || scopeIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs inválida' },
        { status: 400 }
      );
    }

    // Validar que todos os IDs são strings válidas
    const validIds = scopeIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum ID válido fornecido' },
        { status: 400 }
      );
    }

    // Deletar múltiplos scopes em uma transação
    const result = await prisma.supervisorScope.deleteMany({
      where: {
        id: { in: validIds },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Erro ao deletar múltiplos scopes:', error);
    return NextResponse.json(
      { error: 'Erro ao remover vínculos' },
      { status: 500 }
    );
  }
}

