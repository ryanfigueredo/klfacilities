// app/api/movimentos/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { authOptions } from '@/lib/auth-server';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { movimentosSchema } from '@/lib/validations';
import {
  logAudit,
  logMovimentoCreated,
  logMovimentoDeleted,
} from '@/lib/audit/log';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

let authFn: undefined | (() => Promise<any>);
try {
  authFn = require('@/lib/auth-server')?.auth;
} catch {}

function toNumberSafe(v: any) {
  if (v == null) return v;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function serializeMov(m: any) {
  return {
    ...m,
    valor: toNumberSafe(m.valor),
    valorAssinado: toNumberSafe(m.valorAssinado),
    dataLanc: m.dataLanc ? new Date(m.dataLanc).toISOString() : null,
    competencia: m.competencia ? new Date(m.competencia).toISOString() : null,
    criadoEm: m.criadoEm ? new Date(m.criadoEm).toISOString() : null,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(me.role as any, 'movimentos', 'list')) {
      return NextResponse.json(forbiddenPayload('movimentos', 'list'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') || '1');
    const rawLimit = parseInt(searchParams.get('limit') || '25');
    const page = Number.isFinite(rawPage) && rawPage > 1 ? rawPage : 1;
    const limitUnsafe =
      Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 25;
    const limit = Math.min(Math.max(1, limitUnsafe), 500);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    const cleanList = (list: any[]) =>
      (list || [])
        .map(v => (v == null ? '' : String(v)))
        .map(s => s.trim())
        .filter(
          s =>
            s && s.toLowerCase() !== 'undefined' && s.toLowerCase() !== 'null'
        );

    const grupoId = searchParams.get('grupoId');
    const grupoIds = cleanList(searchParams.getAll('grupoId'));
    if (grupoIds && grupoIds.length > 1) where.grupoId = { in: grupoIds };
    else if (grupoId && grupoId.trim()) where.grupoId = grupoId.trim();

    const tipos = cleanList(searchParams.getAll('tipo'));
    if (tipos && tipos.length > 0) where.tipo = { in: tipos };

    const unidadesCsv = searchParams.get('unidades');
    const unidadesList = unidadesCsv
      ? cleanList(unidadesCsv.split(','))
      : cleanList(searchParams.getAll('unidadeId'));
    if (unidadesList && unidadesList.length > 0) {
      where.unidadeId = { in: unidadesList };
    }

    const categoriasCsv = searchParams.get('categorias');
    const categoriasList = categoriasCsv
      ? cleanList(categoriasCsv.split(','))
      : cleanList(searchParams.getAll('categoriaId'));
    if (categoriasList && categoriasList.length > 0) {
      where.categoriaId = { in: categoriasList };
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      where.dataLanc = {};
      if (from) where.dataLanc.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.dataLanc.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const q = (searchParams.get('q') || searchParams.get('search') || '')
      .toString()
      .trim();
    if (q) {
      const orText: any[] = [
        { descricao: { contains: q, mode: 'insensitive' } },
        { documento: { contains: q, mode: 'insensitive' } },
        { categoria: { contains: q, mode: 'insensitive' } },
        { subcategoria: { contains: q, mode: 'insensitive' } },
        { centroCusto: { contains: q, mode: 'insensitive' } },
      ];
      where.OR = orText;
    }

    const author = searchParams.get('author');
    const authorIdParam = searchParams.get('authorId');
    const authorId = author === 'me' ? me.id : authorIdParam || null;
    if (authorId) {
      where.AND = [...(where.AND || []), { criadoPorId: authorId }];
    }

    const [total, movimentos] = await Promise.all([
      prisma.movimento.count({ where }),
      prisma.movimento.findMany({
        where,
        orderBy: { dataLanc: 'desc' },
        select: {
          id: true,
          tipo: true,
          dataLanc: true,
          competencia: true,
          descricao: true,
          grupoId: true,
          unidadeId: true,
          categoriaId: true,
          categoria: true,
          subcategoria: true,
          centroCusto: true,
          documento: true,
          formaPagamento: true,
          valor: true,
          valorAssinado: true,
          criadoEm: true,
          grupo: { select: { nome: true } },
          unidade: { select: { nome: true } },
        },
        skip,
        take: limit,
      }),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    try {
      await logAudit({
        action: 'movimentos.list',
        resource: 'Movimento',
        success: true,
        ip: '127.0.0.1',
        userAgent: 'api',
        method: 'GET',
        url: '/api/movimentos',
      });
    } catch {}
    return NextResponse.json({
      success: true,
      movimentos: movimentos.map(serializeMov),
      total,
      pages,
      currentPage: page,
    });
  } catch (error) {
    console.error('[MOVIMENTOS_API][GET]', error);
    try {
      await logAudit({
        action: 'movimentos.list',
        resource: 'Movimento',
        success: false,
        error: String(error),
        ip: '127.0.0.1',
        userAgent: 'api',
        method: 'GET',
        url: '/api/movimentos',
      });
    } catch {}
    const isDev = process.env.NODE_ENV !== 'production';
    const debug = new URL(request.url).searchParams.get('debug') === '1';
    return NextResponse.json(
      {
        success: false,
        error: isDev || debug ? String(error) : 'Internal error',
        code: 'MOV_LIST',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!can(session.user.role as any, 'movimentos', 'create')) {
      return NextResponse.json(forbiddenPayload('movimentos', 'create'), {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = movimentosSchema.parse(body);

    // RH só pode DESPESA
    if (session.user.role === 'RH' && validatedData.tipo !== 'DESPESA') {
      return NextResponse.json(
        { error: 'RH só pode lançar DESPESA' },
        { status: 403 }
      );
    }

    const parsed = new Date(validatedData.data);
    const dataLanc = new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        12,
        0,
        0,
        0
      )
    );
    const competencia = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1, 12, 0, 0, 0)
    );

    const movimento = await prisma.movimento.create({
      data: {
        tipo: validatedData.tipo,
        dataLanc,
        competencia,
        descricao: validatedData.descricao,
        valor: validatedData.valor,
        valorAssinado:
          validatedData.tipo === 'DESPESA'
            ? -validatedData.valor
            : validatedData.valor,
        unidadeId: validatedData.unidadeId || null,
        grupoId: validatedData.grupoId || null,
        responsavel: validatedData.responsavelId || null,
        formaPagamento: validatedData.formaPagamento || null,
        categoriaId: validatedData.categoriaId || null,
        criadoPorId: session.user.id,
      },
      include: { categoriaRel: true },
    });

    await logMovimentoCreated(
      movimento.id,
      {
        descricao: movimento.descricao,
        valor: movimento.valor,
        tipo: movimento.tipo,
        unidadeId: movimento.unidadeId,
        grupoId: movimento.grupoId,
      },
      session.user.id,
      session.user.email,
      session.user.role,
      '127.0.0.1',
      'api'
    );

    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return NextResponse.json({ success: true, data: movimento });
  } catch (error) {
    console.error('Erro ao criar movimento:', error);
    await logAudit({
      action: 'movimento.create',
      resource: 'Movimento',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'POST',
      url: '/api/movimentos',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!can(session.user.role as any, 'movimentos', 'update')) {
      return NextResponse.json(forbiddenPayload('movimentos', 'update'), {
        status: 403,
      });
    }

    const body = await request.json();
    const IdSchema = movimentosSchema
      .partial()
      .extend({ id: (z as any).string?.() ?? require('zod').z.string() });
    const validated = IdSchema.parse(body);

    const {
      id,
      data: dataStr,
      tipo,
      descricao,
      valor,
      unidadeId,
      grupoId,
      responsavelId,
      formaPagamento,
      categoriaId,
    } = validated as any;
    if (!id)
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const before = await prisma.movimento.findUnique({ where: { id } });
    if (!before)
      return NextResponse.json(
        { error: 'Movimento não encontrado' },
        { status: 404 }
      );

    const dataLanc = dataStr
      ? new Date(
          Date.UTC(
            new Date(dataStr).getUTCFullYear(),
            new Date(dataStr).getUTCMonth(),
            new Date(dataStr).getUTCDate(),
            12,
            0,
            0,
            0
          )
        )
      : undefined;
    const competencia = dataLanc
      ? new Date(
          Date.UTC(
            dataLanc.getUTCFullYear(),
            dataLanc.getUTCMonth(),
            1,
            12,
            0,
            0,
            0
          )
        )
      : undefined;

    const updated = await prisma.movimento.update({
      where: { id },
      data: {
        ...(tipo ? { tipo } : {}),
        ...(dataLanc ? { dataLanc } : {}),
        ...(competencia ? { competencia } : {}),
        ...(typeof descricao === 'string' ? { descricao } : {}),
        ...(typeof valor === 'number'
          ? {
              valor,
              valorAssinado: tipo
                ? tipo === 'DESPESA'
                  ? -valor
                  : valor
                : undefined,
            }
          : {}),
        ...(typeof formaPagamento === 'string' ? { formaPagamento } : {}),
        ...(typeof categoriaId === 'string'
          ? { categoriaId: (categoriaId || '').trim() || null }
          : {}),
        ...(typeof unidadeId === 'string'
          ? { unidadeId: (unidadeId || '').trim() || null }
          : {}),
        ...(typeof grupoId === 'string'
          ? { grupoId: (grupoId || '').trim() || null }
          : {}),
        ...(typeof responsavelId === 'string'
          ? { responsavel: responsavelId }
          : {}),
        updatedById: session.user.id,
      },
      include: { categoriaRel: true },
    });

    // Audit diff
    try {
      await (async () => {
        const { logMovimentoUpdated } = await import('@/lib/audit/log');
        await logMovimentoUpdated(
          id,
          {
            descricao: before.descricao,
            valor: Number(before.valor as any),
            tipo: before.tipo,
            unidadeId: before.unidadeId,
            grupoId: before.grupoId,
          },
          {
            descricao: updated.descricao,
            valor: Number(updated.valor as any),
            tipo: updated.tipo,
            unidadeId: updated.unidadeId,
            grupoId: updated.grupoId,
          },
          session.user.id,
          session.user.email!,
          session.user.role as any,
          '127.0.0.1',
          'api'
        );
      })();
    } catch {}

    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao atualizar movimento:', error);
    await logAudit({
      action: 'movimento.update',
      resource: 'Movimento',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'PUT',
      url: '/api/movimentos',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!can(session.user.role as any, 'movimentos', 'delete')) {
      return NextResponse.json(forbiddenPayload('movimentos', 'delete'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const before = await prisma.movimento.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json(
        { error: 'Movimento não encontrado' },
        { status: 404 }
      );
    }

    await prisma.movimento.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.user.id,
        deletedReason: null,
        updatedById: session.user.id,
      },
    });

    await logMovimentoDeleted(
      id,
      {
        descricao: before.descricao,
        valor: before.valor,
        tipo: before.tipo,
      },
      session.user.id,
      session.user.email,
      session.user.role,
      '127.0.0.1',
      'api'
    );

    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MOVIMENTOS_API][DELETE]', error);
    await logAudit({
      action: 'movimento.softDelete',
      resource: 'Movimento',
      success: false,
      error: String(error),
      ip: '127.0.0.1',
      userAgent: 'api',
      method: 'DELETE',
      url: '/api/movimentos',
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
