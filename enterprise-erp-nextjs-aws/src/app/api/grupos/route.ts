export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logAudit, logGrupoCreated } from '@/lib/audit/log';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const me = await getCurrentUser();

    // Se não estiver autenticado, retornar apenas lista simples de grupos ativos (público)
    if (!me?.email) {
      const grupos = await prisma.grupo.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          ativo: true,
        },
      });

      return NextResponse.json({
        data: grupos,
      });
    }

    // Se autenticado, verificar permissões e retornar dados completos
    if (!can(me.role as any, 'grupos', 'list')) {
      return NextResponse.json(forbiddenPayload('grupos', 'list'), {
        status: 403,
      });
    }

    const grupos = await prisma.grupo.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { movimentos: true } },
        mapeamentos: {
          select: { unidadeId: true },
        },
      },
    });

    await logAudit({
      action: 'grupos.list',
      resource: 'Grupo',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/grupos',
    });
    return NextResponse.json({
      data: grupos.map(g => {
        // Contar unidades únicas através dos mapeamentos
        const unidadesUnicas = new Set(
          g.mapeamentos?.map(m => m.unidadeId) ?? []
        ).size;
        
        return {
          id: g.id,
          nome: g.nome,
          _count: {
            movimentos: g._count?.movimentos ?? 0,
            unidades: unidadesUnicas,
          },
        };
      }),
    });
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    await logAudit({
      action: 'grupos.list',
      resource: 'Grupo',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/grupos',
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

    if (!can(me.role as any, 'grupos', 'create')) {
      return NextResponse.json(forbiddenPayload('grupos', 'create'), {
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

    // Verificar se já existe um grupo com o mesmo nome
    const existingGrupo = await prisma.grupo.findUnique({
      where: { nome },
    });

    if (existingGrupo) {
      return NextResponse.json(
        { error: 'Já existe um grupo com este nome' },
        { status: 400 }
      );
    }

    const grupo = await prisma.grupo.create({
      data: {
        nome,
      },
    });

    // Log de auditoria mais descritivo
    await logGrupoCreated(
      grupo.id,
      {
        nome: grupo.nome,
      },
      me.id,
      me.email!,
      me.role as any,
      '127.0.0.1',
      'api'
    );

    return NextResponse.json({ success: true, data: grupo });
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    await logAudit({
      action: 'grupo.create',
      resource: 'Grupo',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/grupos',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
