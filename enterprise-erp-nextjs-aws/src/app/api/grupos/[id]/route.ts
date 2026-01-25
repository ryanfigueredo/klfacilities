import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const grupoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(session.user.role as any, 'grupos', 'update')) {
      return NextResponse.json(forbiddenPayload('grupos', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = grupoSchema.parse(body);

    // Verificar se existe
    const existing = await prisma.grupo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe outro grupo com o mesmo nome
    const duplicate = await prisma.grupo.findFirst({
      where: {
        nome: validatedData.nome,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um grupo com este nome' },
        { status: 400 }
      );
    }

    const grupo = await prisma.grupo.update({
      where: { id },
      data: validatedData,
    });

    // Log audit
    await logAudit({
      action: 'grupo.updated',
      resource: 'Grupo',
      resourceId: grupo.id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: `/api/grupos/${id}`,
    });

    return NextResponse.json(grupo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar grupo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // OPERACIONAL não pode excluir diretamente, precisa criar solicitação
    if (session.user.role === 'OPERACIONAL') {
      return NextResponse.json(
        { error: 'OPERACIONAL não pode excluir diretamente. Crie uma solicitação de exclusão.' },
        { status: 403 }
      );
    }

    if (!can(session.user.role as any, 'grupos', 'delete')) {
      return NextResponse.json(forbiddenPayload('grupos', 'delete'), {
        status: 403,
      });
    }

    // Verificar se existe
    const existing = await prisma.grupo.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            movimentos: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se está sendo referenciado
    if (existing._count.movimentos > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível excluir este grupo',
          details: `O grupo está sendo utilizado em ${existing._count.movimentos} movimento(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.grupo.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      action: 'grupo.deleted',
      resource: 'Grupo',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/grupos/${id}`,
    });

    return NextResponse.json({ message: 'Grupo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir grupo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
