import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

import { prisma } from '@/lib/prisma';
import { logAudit, logUnidadeCreated } from '@/lib/audit/log';
import { listUnidades as listUnidadesTable } from '@/server/unidades.service';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const me = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // Se não estiver autenticado, retornar apenas lista simples de unidades ativas (público)
    if (!me?.email) {
      const unidades = await prisma.unidade.findMany({
        where: { ativa: true },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          ativa: true,
        },
      });

      return NextResponse.json(unidades);
    }

    // Se autenticado, verificar permissões
    if (!can(me.role as any, 'unidades', 'list')) {
      return NextResponse.json(forbiddenPayload('unidades', 'list'), {
        status: 403,
      });
    }

    // View "table": responde no formato paginado/normalizado
    if (view === 'table') {
      const q = searchParams.get('q') || undefined;
      const grupoId = searchParams.get('grupoId') || undefined;
      const responsavelId = searchParams.get('responsavelId') || undefined;
      const includeUnlinked = searchParams.get('includeUnlinked') !== 'false';
      const coordenadas = (searchParams.get('coordenadas') || 'todas') as
        | 'todas'
        | 'com'
        | 'sem';
      const status = (searchParams.get('status') || 'todas') as
        | 'ativas'
        | 'inativas'
        | 'todas';
      const cidade = searchParams.get('cidade') || undefined;
      const sort = (searchParams.get('sort') || 'unidade') as
        | 'unidade'
        | 'grupo'
        | 'cidade'
        | 'createdAt';
      const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
      const page = Number(searchParams.get('page') || '1');
      const pageSize = Number(searchParams.get('pageSize') || '25');

      const result = await listUnidadesTable({
        q,
        grupoId,
        responsavelId,
        cidade,
        includeUnlinked,
        coordenadas,
        status,
        sort,
        order,
        page,
        pageSize,
      });

      await logAudit({
        action: 'unidades.list.table',
        resource: 'Unidade',
        success: true,
        ip: '127.0.0.1',
        userAgent: 'api',
        method: 'GET',
        url: '/api/unidades?view=table',
      });

      return NextResponse.json(result);
    }

    // View default: lista simples de unidades ativas
    const unidades = await prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { movimentos: true, mapeamentos: true },
        },
        mapeamentos: {
          where: { ativo: true },
          select: {
            grupoId: true,
            grupo: {
              select: { nome: true },
            },
          },
        },
      },
    });

    await logAudit({
      action: 'unidades.list',
      resource: 'Unidade',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/unidades',
    });
    return NextResponse.json(unidades);
  } catch (error) {
    console.error('Erro ao buscar unidades:', error);
    await logAudit({
      action: 'unidades.list',
      resource: 'Unidade',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/unidades',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const me = await getCurrentUser();

    if (!me?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'unidades', 'create')) {
      return NextResponse.json(forbiddenPayload('unidades', 'create'), {
        status: 403,
      });
    }

    const body = await request.json();
    const { nome } = body;

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma unidade com o mesmo nome
    const existingUnidade = await prisma.unidade.findUnique({
      where: { nome },
    });

    if (existingUnidade) {
      return NextResponse.json(
        { error: 'Já existe uma unidade com este nome' },
        { status: 400 }
      );
    }

    const unidade = await prisma.unidade.create({
      data: {
        nome,
      },
    });

    // Log de auditoria mais descritivo
    await logUnidadeCreated(
      unidade.id,
      {
        nome: unidade.nome,
      },
      me.id,
      me.email!,
      me.role as any,
      '127.0.0.1',
      'api'
    );

    return NextResponse.json({ success: true, data: unidade });
  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    await logAudit({
      action: 'unidade.create',
      resource: 'Unidade',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/unidades',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
