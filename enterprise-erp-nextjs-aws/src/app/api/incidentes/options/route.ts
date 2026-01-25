export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

interface GrupoOption {
  id: string;
  nome: string;
}

interface UnidadeOption {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  grupoIds: string[];
}

function buildUnidadeOptions(
  unidades: Array<{ id: string; nome: string; cidade: string | null; estado: string | null }>,
  mappings: Array<{ unidadeId: string; grupoId: string | null }>
): UnidadeOption[] {
  const map = new Map<string, string[]>();
  mappings.forEach(mapping => {
    if (!mapping.grupoId) return;
    const list = map.get(mapping.unidadeId) || [];
    if (!list.includes(mapping.grupoId)) {
      list.push(mapping.grupoId);
      map.set(mapping.unidadeId, list);
    }
  });

  return unidades.map(unidade => ({
    ...unidade,
    grupoIds: map.get(unidade.id) ?? [],
  }));
}

export async function GET(request: NextRequest): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'list')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'list'), {
      status: 403,
    });
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);

    if (!scope.unidadeIds.length) {
      return NextResponse.json({ grupos: [], unidades: [] });
    }

    const unidades = await prisma.unidade.findMany({
      where: { id: { in: scope.unidadeIds } },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cidade: true, estado: true },
    });

    const mappings = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany(
      {
        where: {
          unidadeId: { in: scope.unidadeIds },
          ativo: true,
        },
        select: {
          unidadeId: true,
          grupoId: true,
          grupo: {
            select: { id: true, nome: true },
          },
        },
      }
    );

    const gruposMap = new Map<string, GrupoOption>();
    mappings.forEach(mapping => {
      if (mapping.grupo) {
        gruposMap.set(mapping.grupo.id, {
          id: mapping.grupo.id,
          nome: mapping.grupo.nome,
        });
      }
    });

    // Apenas adicionar grupos do scope que têm unidades vinculadas
    // Se um grupo do scope não apareceu nos mappings, significa que não tem unidades no scope
    // Portanto, não devemos incluí-lo na lista
    if (gruposMap.size) {
      const missing = Array.from(gruposMap.entries())
        .filter(([, value]) => value.nome === 'Grupo')
        .map(([key]) => key);
      if (missing.length) {
        const filled = await prisma.grupo.findMany({
          where: { id: { in: missing } },
          select: { id: true, nome: true },
        });
        filled.forEach(g => gruposMap.set(g.id, g));
      }
    }

    const unidadesOptions = buildUnidadeOptions(
      unidades,
      mappings.map(m => ({ unidadeId: m.unidadeId, grupoId: m.grupoId }))
    );

    return NextResponse.json({
      grupos: Array.from(gruposMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome)
      ),
      unidades: unidadesOptions,
    });
  }

  const [grupos, unidades, mappings] = await Promise.all([
    prisma.grupo.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cidade: true, estado: true },
    }),
    prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: { ativo: true },
      select: { unidadeId: true, grupoId: true },
    }),
  ]);

  const unidadesOptions = buildUnidadeOptions(
    unidades,
    mappings.map(m => ({ unidadeId: m.unidadeId, grupoId: m.grupoId }))
  );

  return NextResponse.json({
    grupos,
    unidades: unidadesOptions,
  });
}

