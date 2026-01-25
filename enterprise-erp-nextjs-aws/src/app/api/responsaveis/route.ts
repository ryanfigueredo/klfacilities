import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const responsavelSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ativo: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const sessionAny = (await getServerSession(authOptions as any)) as any;
    const role = sessionAny?.user?.role;
    if (!can(role as any, 'responsaveis', 'list')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'list'), {
        status: 403,
      });
    }
    if (!sessionAny?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // RBAC: MASTER e ADMIN podem visualizar
    assertRole(sessionAny.user.role as 'MASTER' | 'ADMIN' | 'RH' | 'SUPERVISOR' | undefined, ['MASTER', 'ADMIN']);

    const responsaveis = await prisma.responsavel.findMany({
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(responsaveis);
  } catch (error) {
    console.error('Erro ao buscar responsáveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionAny = (await getServerSession(authOptions as any)) as any;
    const role = sessionAny?.user?.role;
    if (!can(role as any, 'responsaveis', 'create')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'create'), {
        status: 403,
      });
    }
    if (!sessionAny?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // RBAC: Apenas ADMIN pode criar
    assertRole(sessionAny.user.role as 'ADMIN' | 'RH' | 'SUPERVISOR' | undefined, ['ADMIN']);

    const body = await request.json();
    const validatedData = responsavelSchema.parse(body);

    const responsavel = await prisma.responsavel.create({
      data: validatedData,
    });

    // Log audit
    await logAudit({
      action: 'responsavel.created',
      resource: 'Responsavel',
      resourceId: responsavel.id,
      metadata: validatedData,
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/responsaveis',
    });

    return NextResponse.json(responsavel, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar responsável:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
