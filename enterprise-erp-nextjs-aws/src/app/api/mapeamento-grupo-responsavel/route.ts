import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assertRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const mapeamentoSchema = z.object({
  grupoId: z.string().min(1, 'Grupo é obrigatório'),
  responsavelId: z.string().min(1, 'Responsável é obrigatório'),
  // Se não enviado, servidor utilizará a unidade "default"
  unidadeId: z.string().min(1).optional(),
  ativo: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(session.user.role as any, 'responsaveis', 'list')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'list'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');

    const where: any = {};
    if (grupoId) {
      where.grupoId = grupoId;
    }

    const mapeamentos = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany(
      {
        where,
        include: {
          grupo: true,
          responsavel: true,
          unidade: true,
        },
        orderBy: [{ grupo: { nome: 'asc' } }, { responsavel: { nome: 'asc' } }],
      }
    );

    // Deduplicar por par (grupoId, responsavelId) para não repetir o mesmo responsável
    // em múltiplas unidades na listagem desta página
    const uniqueByPair = new Map<string, (typeof mapeamentos)[number]>();
    for (const m of mapeamentos) {
      const key = `${m.grupoId}::${m.responsavelId}`;
      if (!uniqueByPair.has(key)) uniqueByPair.set(key, m);
    }

    return NextResponse.json(Array.from(uniqueByPair.values()));
  } catch (error) {
    console.error('Erro ao buscar mapeamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(session.user.role as any, 'responsaveis', 'create')) {
      return NextResponse.json(forbiddenPayload('responsaveis', 'create'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = mapeamentoSchema.parse(body);

    // Se unidadeId não for fornecida, utilizar a unidade 'default'
    let unidadeId = validatedData.unidadeId;
    if (!unidadeId) {
      const defaultUnidade = await prisma.unidade.findFirst({
        where: { nome: 'default' },
      });
      if (!defaultUnidade) {
        return NextResponse.json(
          { error: 'Unidade padrão não encontrada' },
          { status: 500 }
        );
      }
      unidadeId = defaultUnidade.id;
    } else {
      // valida a unidade fornecida
      const exists = await prisma.unidade.findUnique({
        where: { id: unidadeId },
      });
      if (!exists) {
        return NextResponse.json(
          { error: 'Unidade informada é inválida' },
          { status: 400 }
        );
      }
    }

    // Verificar se já existe (mesmo grupo + responsável + unidade)
    const existing = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
      where: {
        grupoId: validatedData.grupoId,
        responsavelId: validatedData.responsavelId,
        unidadeId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Este responsável já está vinculado a este grupo e unidade' },
        { status: 400 }
      );
    }

    const mapeamento = await prisma.mapeamentoGrupoUnidadeResponsavel.create({
      data: {
        grupoId: validatedData.grupoId,
        responsavelId: validatedData.responsavelId,
        unidadeId,
        ativo: validatedData.ativo,
      },
      include: {
        grupo: true,
        responsavel: true,
        unidade: true,
      },
    });

    // Log audit
    await logAudit({
      action: 'mapeamento.created',
      resource: 'MapeamentoGrupoUnidadeResponsavel',
      resourceId: mapeamento.id,
      metadata: { ...validatedData, unidadeId },
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/mapeamento-grupo-responsavel',
    });

    return NextResponse.json(mapeamento, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar mapeamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
