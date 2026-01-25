import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const unidadeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
  lat: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      // Converter string com vírgula para número
      if (typeof val === 'string') {
        const normalized = val.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
      }
      return typeof val === 'number' ? val : null;
    },
    z.union([z.number(), z.null()]).optional()
  ),
  lng: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      // Converter string com vírgula para número
      if (typeof val === 'string') {
        const normalized = val.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
      }
      return typeof val === 'number' ? val : null;
    },
    z.union([z.number(), z.null()]).optional()
  ),
  radiusM: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
      if (isNaN(num) || num <= 0) return null;
      return Math.floor(num);
    },
    z.union([z.number().int().positive(), z.null()]).optional()
  ),
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

    if (!can(session.user.role as any, 'unidades', 'update')) {
      return NextResponse.json(forbiddenPayload('unidades', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = unidadeSchema.parse(body);

    // Verificar se existe
    const existing = await prisma.unidade.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe outra unidade com o mesmo nome
    const duplicate = await prisma.unidade.findFirst({
      where: {
        nome: validatedData.nome,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe uma unidade com este nome' },
        { status: 400 }
      );
    }

    const unidade = await prisma.unidade.update({
      where: { id },
      data: validatedData,
    });

    // Log audit
    await logAudit({
      action: 'unidade.updated',
      resource: 'Unidade',
      resourceId: unidade.id,
      metadata: validatedData,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: `/api/unidades/${id}`,
    });

    return NextResponse.json(unidade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de validação ao atualizar unidade:', error.issues);
      return NextResponse.json(
        { 
          error: 'Dados inválidos', 
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar unidade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { error: errorMessage },
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

    if (!can(session.user.role as any, 'unidades', 'delete')) {
      return NextResponse.json(forbiddenPayload('unidades', 'delete'), {
        status: 403,
      });
    }

    // Verificar se existe
    const existing = await prisma.unidade.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            movimentos: true,
            mapeamentos: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se está sendo referenciada
    if (existing._count.movimentos > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível excluir esta unidade',
          details: `A unidade está sendo utilizada em ${existing._count.movimentos} movimento(s)`,
        },
        { status: 400 }
      );
    }

    // Verificar se está sendo referenciada em mapeamentos
    if (existing._count.mapeamentos > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível excluir esta unidade',
          details: `A unidade está sendo utilizada em ${existing._count.mapeamentos} mapeamento(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.unidade.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      action: 'unidade.deleted',
      resource: 'Unidade',
      resourceId: id,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: `/api/unidades/${id}`,
    });

    return NextResponse.json({ message: 'Unidade excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
