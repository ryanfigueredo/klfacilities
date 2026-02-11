import { NextRequest, NextResponse } from 'next/server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'usuarios', 'update')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'update'), {
        status: 403,
      });
    }

    // Verificar se existe
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Reativar o usuário
    const usuario = await prisma.user.update({
      where: { id },
      data: {
        ativo: true,
      },
    });

    // Log audit
    await logAudit({
      action: 'usuario.activated',
      resource: 'User',
      resourceId: id,
      metadata: {
        email: usuario.email,
        name: usuario.name,
      },
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PATCH',
      url: `/api/usuarios/${id}/ativar`,
    });

    return NextResponse.json({ 
      message: 'Usuário reativado com sucesso',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        ativo: usuario.ativo,
      },
    });
  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
