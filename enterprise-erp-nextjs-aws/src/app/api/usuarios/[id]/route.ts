import { NextRequest, NextResponse } from 'next/server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const usuarioUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum([
    'MASTER',
    'ADMIN',
    'RH',
    'SUPERVISOR',
    'JURIDICO',
    'OPERACIONAL',
    'LAVAGEM',
    'PLANEJAMENTO_ESTRATEGICO',
  ]),
});

const usuarioCreateSchema = usuarioUpdateSchema.extend({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
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

    if (!can(me.role as any, 'usuarios', 'update')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = usuarioUpdateSchema.parse(body);

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

    // Verificar se já existe outro usuário com o mesmo email
    const duplicate = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      );
    }

    const usuario = await prisma.user.update({
      where: { id },
      data: validatedData,
    });

    // Log audit
    await logAudit({
      action: 'usuario.updated',
      resource: 'User',
      resourceId: usuario.id,
      metadata: validatedData,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: `/api/usuarios/${id}`,
    });

    return NextResponse.json(usuario);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar usuário:', error);
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

    if (!can(me.role as any, 'usuarios', 'delete')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'delete'), {
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

    // Desativar o usuário ao invés de excluir
    // Isso mantém os dados históricos e evita problemas de foreign key
    const usuario = await prisma.user.update({
      where: { id },
      data: {
        ativo: false,
      },
    });

    // Log audit
    await logAudit({
      action: 'usuario.deactivated',
      resource: 'User',
      resourceId: id,
      metadata: {
        email: usuario.email,
        name: usuario.name,
      },
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/usuarios/${id}`,
    });

    return NextResponse.json({ 
      message: 'Usuário desativado com sucesso',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        ativo: usuario.ativo,
      },
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
