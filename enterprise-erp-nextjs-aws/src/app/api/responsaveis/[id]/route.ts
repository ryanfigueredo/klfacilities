import { NextRequest, NextResponse } from 'next/server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const responsavelSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ativo: z.boolean().default(true),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'responsaveis', 'update')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = responsavelSchema.parse(body);

    // Verificar se existe
    const existing = await prisma.responsavel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Responsável não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe outro com o mesmo nome
    const duplicate = await prisma.responsavel.findFirst({
      where: {
        nome: validatedData.nome,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um responsável com este nome' },
        { status: 400 }
      );
    }

    const responsavel = await prisma.responsavel.update({
      where: { id },
      data: validatedData,
    });

    // Log audit
    await logAudit({
      action: 'responsavel.updated',
      resource: 'Responsavel',
      resourceId: responsavel.id,
      metadata: validatedData,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: `/api/responsaveis/${id}`,
    });

    return NextResponse.json(responsavel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar responsável:', error);
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
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'responsaveis', 'delete')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'delete'), {
        status: 403,
      });
    }

    // Verificar se existe
    const existing = await prisma.responsavel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Responsável não encontrado' },
        { status: 404 }
      );
    }

    await prisma.responsavel.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      action: 'responsavel.deleted',
      resource: 'Responsavel',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/responsaveis/${id}`,
    });

    return NextResponse.json({ message: 'Responsável excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir responsável:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
