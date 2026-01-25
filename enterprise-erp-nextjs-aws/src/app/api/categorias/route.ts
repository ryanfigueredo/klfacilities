import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { logAudit, logCategoriaCreated } from '@/lib/audit/log';

function normalizeCategoriaName(nome: string): string {
  return (nome || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const me = await getCurrentUser();

    if (!me?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!can(me.role as any, 'categorias', 'list')) {
      return NextResponse.json(forbiddenPayload('categorias', 'list'), {
        status: 403,
      });
    }

    const categorias = await prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });

    await logAudit({
      action: 'categorias.list',
      resource: 'Categoria',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/categorias',
    });
    return NextResponse.json(Array.isArray(categorias) ? categorias : []);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    await logAudit({
      action: 'categorias.list',
      resource: 'Categoria',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'GET',
      url: '/api/categorias',
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

    if (!can(me.role as any, 'categorias', 'create')) {
      return NextResponse.json(forbiddenPayload('categorias', 'create'), {
        status: 403,
      });
    }

    const body = await request.json();
    const { nome, tipo } = body;

    if (!nome || !tipo) {
      return NextResponse.json(
        { error: 'Nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Bloquear duplicidade por normalização de nome (case/acento/espaços/hífens)
    const allSameTipo = await prisma.categoria.findMany({
      where: { tipo, ativo: true },
      select: { id: true, nome: true },
    });
    const desired = normalizeCategoriaName(String(nome));
    const dup = allSameTipo.find(
      c => normalizeCategoriaName(c.nome) === desired
    );
    if (dup) {
      return NextResponse.json(
        { error: 'Categoria (considerando variações de escrita) já existe' },
        { status: 409 }
      );
    }

    const categoria = await prisma.categoria.create({
      data: {
        nome,
        tipo,
      },
    });

    // Log de auditoria mais descritivo
    await logCategoriaCreated(
      categoria.id,
      {
        nome: categoria.nome,
        tipo: categoria.tipo,
      },
      me.id,
      me.email!,
      me.role as any,
      '127.0.0.1',
      'api'
    );

    return NextResponse.json({ success: true, data: categoria });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    await logAudit({
      action: 'categoria.create',
      resource: 'Categoria',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/categorias',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
