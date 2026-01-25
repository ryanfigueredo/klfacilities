import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';

function normalizeCategoriaName(nome: string): string {
  return (nome || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const me = await getCurrentUser();

    if (!me?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'categorias', 'update')) {
      return NextResponse.json(forbiddenPayload('categorias', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const { nome, tipo, ativo } = body;

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome.trim();
    if (tipo !== undefined) updateData.tipo = tipo;
    if (ativo !== undefined) updateData.ativo = ativo;

    // Se nome ou tipo forem alterados, checar duplicidade normalizada para mesmo tipo
    if (updateData.nome !== undefined || updateData.tipo !== undefined) {
      const current = await prisma.categoria.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        );
      }
      const nextTipo = (updateData.tipo ?? current.tipo) as any;
      const nextNome = (updateData.nome ?? current.nome) as string;
      const desired = normalizeCategoriaName(nextNome);
      const allSameTipo = await prisma.categoria.findMany({
        where: { tipo: nextTipo, ativo: true },
        select: { id: true, nome: true },
      });
      const dup = allSameTipo.find(
        c => c.id !== id && normalizeCategoriaName(c.nome) === desired
      );
      if (dup) {
        return NextResponse.json(
          { error: 'Categoria (considerando variações de escrita) já existe' },
          { status: 409 }
        );
      }
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      action: 'categoria.update',
      resource: 'Categoria',
      resourceId: categoria.id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PATCH',
      url: `/api/categorias/${id}`,
    });

    return NextResponse.json(categoria);
  } catch (error: any) {
    console.error('Erro ao atualizar categoria:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Categoria já existe para este tipo' },
        { status: 409 }
      );
    }

    await logAudit({
      action: 'categoria.update',
      resource: 'Categoria',
      resourceId: id,
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PATCH',
      url: `/api/categorias/${id}`,
    });

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
  const { id } = await params;

  try {
    const me = await getCurrentUser();

    if (!me?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'categorias', 'delete')) {
      return NextResponse.json(forbiddenPayload('categorias', 'delete'), {
        status: 403,
      });
    }

    // Verificar se há movimentos usando esta categoria
    const movimentosCount = await prisma.movimento.count({
      where: { categoriaId: id },
    });

    if (movimentosCount > 0) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir categoria que possui movimentos associados',
        },
        { status: 400 }
      );
    }

    await prisma.categoria.delete({ where: { id } });

    await logAudit({
      action: 'categoria.delete',
      resource: 'Categoria',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/categorias/${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar categoria:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    await logAudit({
      action: 'categoria.delete',
      resource: 'Categoria',
      resourceId: id,
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/categorias/${id}`,
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
