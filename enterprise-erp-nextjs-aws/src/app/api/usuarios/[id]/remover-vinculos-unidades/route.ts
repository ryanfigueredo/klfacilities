import { NextRequest, NextResponse } from 'next/server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';

export async function DELETE(
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

    // Verificar se o usuário existe
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar todos os vínculos de unidades do usuário
    const vinculos = await prisma.supervisorScope.findMany({
      where: {
        supervisorId: id,
        unidadeId: { not: null },
      },
      select: {
        id: true,
        unidadeId: true,
        unidade: {
          select: {
            nome: true,
          },
        },
      },
    });

    // Remover todos os vínculos de unidades
    const result = await prisma.supervisorScope.deleteMany({
      where: {
        supervisorId: id,
        unidadeId: { not: null },
      },
    });

    // Log audit
    await logAudit({
      action: 'usuario.vinculos-unidades-removidos',
      resource: 'User',
      resourceId: id,
      metadata: {
        email: usuario.email,
        name: usuario.name,
        vinculosRemovidos: result.count,
        unidades: vinculos.map(v => ({
          id: v.unidadeId,
          nome: v.unidade?.nome,
        })),
      },
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/usuarios/${id}/remover-vinculos-unidades`,
    });

    return NextResponse.json({ 
      message: 'Vínculos de unidades removidos com sucesso',
      vinculosRemovidos: result.count,
      unidades: vinculos.map(v => ({
        id: v.unidadeId,
        nome: v.unidade?.nome,
      })),
    });
  } catch (error) {
    console.error('Erro ao remover vínculos de unidades:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
