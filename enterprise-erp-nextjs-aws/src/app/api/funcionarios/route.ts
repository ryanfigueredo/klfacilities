import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normName } from '@/lib/utils/currency';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  const url = new URL(req.url);
  const q = normName(url.searchParams.get('q') || '');
  const unidadeId = url.searchParams.get('unidadeId') || undefined;
  const grupoId = url.searchParams.get('grupoId') || undefined;
  const inativos = url.searchParams.get('inativos') === 'true'; // lista demitidos/excluídos
  const sortBy = url.searchParams.get('sortBy') || 'nome'; // nome, grupo, unidade
  const sortOrder = url.searchParams.get('sortOrder') || 'asc'; // asc, desc

  const where: any = {};
  // Por padrão só ativos; ?inativos=true traz apenas inativos (para seção demitidos)
  where.ativo = inativos ? false : true;
  if (q) {
    where.nome = { contains: q };
  }
  if (grupoId) {
    where.grupoId = grupoId;
  }
  if (unidadeId) {
    if (unidadeId === '__none') {
      where.unidadeId = null;
    } else {
      where.unidadeId = unidadeId;
    }
  }

  // Filtrar por SupervisorScope se for SUPERVISOR
  if (me?.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (scope.unidadeIds.length > 0) {
      // Se já tem filtro de unidade, verificar se está no scope
      if (unidadeId && unidadeId !== '__none' && !scope.unidadeIds.includes(unidadeId)) {
        return NextResponse.json({ rows: [] });
      }
      // Se não tem filtro de unidade, aplicar scope
      if (!unidadeId) {
        where.unidadeId = { in: scope.unidadeIds };
      }
    } else {
      // Supervisor sem unidades atribuídas - retornar vazio
      return NextResponse.json({ rows: [] });
    }
  }

  const orderBy: any = {};
  if (sortBy === 'nome') {
    orderBy.nome = sortOrder;
  } else if (sortBy === 'grupo') {
    orderBy.grupo = { nome: sortOrder };
  } else if (sortBy === 'unidade') {
    orderBy.unidade = { nome: sortOrder };
  } else {
    orderBy.nome = 'asc';
  }

  const rows = await prisma.funcionario.findMany({
    where,
    include: {
      grupo: true,
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      unidadesPermitidas: {
        include: {
          unidade: { select: { id: true, nome: true } },
        },
      },
    },
    orderBy,
  });

  return NextResponse.json({
    rows: rows.map(r => {
      const idsPermitidos = r.unidadesPermitidas.length
        ? r.unidadesPermitidas.map(u => u.unidadeId)
        : r.unidadeId
          ? [r.unidadeId]
          : [];
      const nomesPermitidos = r.unidadesPermitidas.length
        ? r.unidadesPermitidas.map(u => u.unidade.nome)
        : r.unidade
          ? [r.unidade.nome]
          : [];
      return {
        id: r.id,
        nome: r.nome,
        cpf: r.cpf,
        grupo: r.grupo.nome,
        grupoId: r.grupoId,
        unidadeId: r.unidadeId,
        unidadeNome: r.unidade?.nome || null,
        unidadeIds: idsPermitidos,
        unidadeNomes: nomesPermitidos,
        fotoUrl: r.fotoUrl || null,
        temFotoFacial: !!(r.fotoUrl && r.faceDescriptor),
        temCracha: r.temCracha || false,
        fotoCracha: r.fotoCracha || null,
        cargo: r.cargo || null,
        diaFolga: r.diaFolga ?? null,
        ativo: r.ativo,
        excluidoEm: r.excluidoEm ? r.excluidoEm.toISOString() : null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nomeRaw: string = body?.nome || '';
    const nome = nomeRaw.trim();
    const cpf: string | null = body?.cpf
      ? String(body.cpf).replace(/\D/g, '').trim()
      : null;
    const codigo: number | null = body?.codigo
      ? Number(body.codigo)
      : null;
    const grupoId: string = body?.grupoId;
    const unidadeId: string | null = body?.unidadeId || null;
    const cargo: string | null = body?.cargo || null;
    let diaFolga: number | null = null;
    if (body?.diaFolga !== undefined && body?.diaFolga !== null && body?.diaFolga !== '') {
      const parsed = Number(body.diaFolga);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
        diaFolga = parsed;
      }
    }
    const temCracha: boolean = body?.temCracha || false;

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }
    if (!grupoId) {
      return NextResponse.json(
        { error: 'Grupo é obrigatório' },
        { status: 400 }
      );
    }

    // Se CPF informado, checa duplicidade
    if (cpf) {
      const exists = await prisma.funcionario.findFirst({ where: { cpf } });
      if (exists) {
        return NextResponse.json(
          { error: 'CPF já cadastrado para outro colaborador' },
          { status: 409 }
        );
      }
    }

    const created = await prisma.$transaction(async tx => {
      const func = await tx.funcionario.create({
        data: {
          nome,
          cpf: cpf || null,
          codigo: codigo || null,
          grupoId,
          unidadeId,
          cargo: cargo || null,
          diaFolga: diaFolga !== null && diaFolga >= 0 && diaFolga <= 6 ? diaFolga : null,
          temCracha: temCracha || false,
        },
      });
      if (unidadeId) {
        await tx.funcionarioUnidade.create({
          data: { funcionarioId: func.id, unidadeId },
        });
      }
      return func;
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    // Trata violação de unique de forma amigável
    if (err?.code === 'P2002') {
      const target = Array.isArray(err?.meta?.target)
        ? err.meta.target.join(', ')
        : 'campo único';
      return NextResponse.json(
        { error: `Já existe colaborador com o mesmo ${target}` },
        { status: 409 }
      );
    }
    const message = err?.message || 'Erro ao criar colaborador';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
