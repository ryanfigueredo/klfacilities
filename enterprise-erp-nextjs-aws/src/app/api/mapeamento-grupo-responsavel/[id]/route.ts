import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const updateSchema = z.object({
  unidadeId: z.string().min(1, 'Unidade é obrigatória'),
  ativo: z.boolean().optional(),
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

    // Apenas ADMIN pode editar vínculos
    assertRole(session.user.role as 'ADMIN' | 'RH' | 'SUPERVISOR' | undefined, ['ADMIN']);

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const map = await prisma.mapeamentoGrupoUnidadeResponsavel.findUnique({
      where: { id },
    });
    if (!map) {
      return NextResponse.json(
        { error: 'Mapeamento não encontrado' },
        { status: 404 }
      );
    }

    // valida unidade
    const unidade = await prisma.unidade.findUnique({
      where: { id: validated.unidadeId },
    });
    if (!unidade) {
      return NextResponse.json({ error: 'Unidade inválida' }, { status: 400 });
    }

    // evita duplicidade (mesmo grupo+responsável+unidade)
    const duplicate = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
      where: {
        id: { not: id },
        grupoId: map.grupoId,
        responsavelId: map.responsavelId,
        unidadeId: validated.unidadeId,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe vínculo para este grupo, responsável e unidade' },
        { status: 400 }
      );
    }

    const updated = await prisma.mapeamentoGrupoUnidadeResponsavel.update({
      where: { id },
      data: {
        unidadeId: validated.unidadeId,
        ...(validated.ativo === undefined ? {} : { ativo: validated.ativo }),
      },
      include: { grupo: true, responsavel: true, unidade: true },
    });

    await logAudit({
      action: 'mapeamento.updated',
      resource: 'MapeamentoGrupoUnidadeResponsavel',
      resourceId: id,
      metadata: { unidadeId: validated.unidadeId },
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: `/api/mapeamento-grupo-responsavel/${id}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar mapeamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
