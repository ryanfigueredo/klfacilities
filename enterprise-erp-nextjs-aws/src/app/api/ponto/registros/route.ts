import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';

// Função helper para converter BigInt para string recursivamente
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

function slugify(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me?.id)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || '';
  const unidadeId = searchParams.get('unidadeId') || undefined;
  const funcionarioId = searchParams.get('funcionarioId') || undefined;
  const unidadeSlug = searchParams.get('unidadeSlug') || undefined;
  const cpf = searchParams.get('cpf') || undefined;
  const supervisorId = searchParams.get('supervisorId') || undefined;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'month inválido (YYYY-MM)' },
      { status: 400 }
    );
  }
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

  const where: any = {
    timestamp: { gte: start, lt: end },
  };

  let allowedUnidades: string[] | null = null;
  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    allowedUnidades = scope.unidadeIds;
    if (!allowedUnidades.length) {
      return NextResponse.json({ ok: true, data: [] });
    }
  }

  // Se foi especificado supervisorId, buscar unidades do supervisor
  let unidadesDoSupervisor: string[] | null = null;
  if (supervisorId) {
    const scope = await getSupervisorScope(supervisorId);
    unidadesDoSupervisor = scope.unidadeIds;
    if (!unidadesDoSupervisor.length) {
      return NextResponse.json({ ok: true, data: [] });
    }
  }

  if (unidadeId) where.unidadeId = unidadeId;
  if (funcionarioId) where.funcionarioId = funcionarioId;
  if (unidadeSlug && !unidadeId) {
    const list = await prisma.unidade.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
    });
    const match = list.find(u => slugify(u.nome) === unidadeSlug);
    if (match) where.unidadeId = match.id;
  }
  if (cpf && !funcionarioId) {
    const f = await prisma.funcionario.findFirst({
      where: { cpf },
      select: { id: true },
    });
    if (f) where.funcionarioId = f.id;
  }

  // Aplicar filtros de unidades permitidas (supervisor logado)
  if (allowedUnidades) {
    if (where.unidadeId) {
      const unit = typeof where.unidadeId === 'string' ? where.unidadeId : null;
      if (unit && !allowedUnidades.includes(unit)) {
        return NextResponse.json({ ok: true, data: [] });
      }
      if (!unit && where.unidadeId?.in) {
        const filtered = where.unidadeId.in.filter((id: string) => allowedUnidades!.includes(id));
        if (!filtered.length) {
          return NextResponse.json({ ok: true, data: [] });
        }
        where.unidadeId.in = filtered;
      }
    } else {
      where.unidadeId = { in: allowedUnidades };
    }

    if (where.funcionarioId) {
      const funcionario = await prisma.funcionario.findUnique({
        where: { id: where.funcionarioId },
        select: { unidadeId: true },
      });
      if (funcionario?.unidadeId && !allowedUnidades.includes(funcionario.unidadeId)) {
        return NextResponse.json({ ok: true, data: [] });
      }
    }
  }

  // Aplicar filtros de unidades do supervisor selecionado
  if (unidadesDoSupervisor) {
    if (where.unidadeId) {
      const unit = typeof where.unidadeId === 'string' ? where.unidadeId : null;
      if (unit && !unidadesDoSupervisor.includes(unit)) {
        return NextResponse.json({ ok: true, data: [] });
      }
      if (!unit && where.unidadeId?.in) {
        const filtered = where.unidadeId.in.filter((id: string) => unidadesDoSupervisor!.includes(id));
        if (!filtered.length) {
          return NextResponse.json({ ok: true, data: [] });
        }
        where.unidadeId.in = filtered;
      } else if (!unit) {
        where.unidadeId = { in: unidadesDoSupervisor };
      }
    } else {
      where.unidadeId = { in: unidadesDoSupervisor };
    }

    if (where.funcionarioId) {
      const funcionario = await prisma.funcionario.findUnique({
        where: { id: where.funcionarioId },
        select: { unidadeId: true },
      });
      if (funcionario?.unidadeId && !unidadesDoSupervisor.includes(funcionario.unidadeId)) {
        return NextResponse.json({ ok: true, data: [] });
      }
    }
  }

  const rows = await prisma.registroPonto.findMany({
    where,
    orderBy: [{ timestamp: 'asc' }],
    include: {
      unidade: { select: { id: true, nome: true } },
      funcionario: { select: { id: true, nome: true } },
      qrcode: false,
    },
  });

  // Serializar BigInt recursivamente antes de retornar JSON
  const serializedRows = serializeBigInt(rows);

  return NextResponse.json({ ok: true, data: serializedRows });
}
