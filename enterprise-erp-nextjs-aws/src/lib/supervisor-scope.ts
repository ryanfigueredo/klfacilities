import { prisma } from '@/lib/prisma';

export interface SupervisorScopeResult {
  grupoIds: string[];
  unidadeIds: string[];
}

export async function getSupervisorScope(
  supervisorId: string
): Promise<SupervisorScopeResult> {
  const assignments = await prisma.supervisorScope.findMany({
    where: { supervisorId },
    select: {
      grupoId: true,
      unidadeId: true,
    },
  });

  if (!assignments.length) {
    return { grupoIds: [], unidadeIds: [] };
  }

  const grupoIdsDiretos = new Set<string>();
  const unidadeIdsDiretas = new Set<string>();

  // Separar grupos e unidades diretas (vinculação em /config/supervisores)
  assignments.forEach(item => {
    if (item.grupoId) grupoIdsDiretos.add(item.grupoId);
    if (item.unidadeId) unidadeIdsDiretas.add(item.unidadeId);
  });

  // Unidades: apenas as explicitamente vinculadas + unidades de grupos vinculados diretamente.
  // Se o supervisor tem só unidades vinculadas (ex.: 8 lojas do Spani), NÃO expandir para
  // todas as unidades do grupo — mostrar só as 8 lojas.
  const unidadeIds = new Set<string>(unidadeIdsDiretas);
  if (grupoIdsDiretos.size > 0) {
    const mappings = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: {
        grupoId: { in: Array.from(grupoIdsDiretos) },
        ativo: true,
      },
      select: { unidadeId: true },
    });
    mappings.forEach(map => unidadeIds.add(map.unidadeId));
  }

  // Grupos: para o dropdown (grupo selecionado → unidades filtradas). Inclui grupos
  // vinculados diretamente e grupos das unidades vinculadas.
  const grupoIds = new Set<string>(grupoIdsDiretos);
  if (unidadeIdsDiretas.size > 0) {
    const unidadesComGrupos = await prisma.unidade.findMany({
      where: {
        id: { in: Array.from(unidadeIdsDiretas) },
        ativa: true,
      },
      select: {
        id: true,
        mapeamentos: {
          where: { ativo: true },
          select: { grupoId: true },
        },
      },
    });
    unidadesComGrupos.forEach(unidade => {
      unidade.mapeamentos.forEach(mapping => {
        if (mapping.grupoId) grupoIds.add(mapping.grupoId);
      });
    });
  }

  return {
    grupoIds: Array.from(grupoIds),
    unidadeIds: Array.from(unidadeIds),
  };
}

export async function getSupervisorUnidadeIds(
  supervisorId: string
): Promise<string[]> {
  const { unidadeIds } = await getSupervisorScope(supervisorId);
  return unidadeIds;
}

export function filterWhereByUnidades(where: any, unidadeIds: string[]): any {
  if (!unidadeIds.length) {
    return { ...where, unidadeId: '___NO_MATCH___' };
  }

  if (!where.unidadeId) {
    return { ...where, unidadeId: { in: unidadeIds } };
  }

  if (typeof where.unidadeId === 'string') {
    if (!unidadeIds.includes(where.unidadeId)) {
      return { ...where, unidadeId: '___NO_MATCH___' };
    }
    return where;
  }

  if (where.unidadeId?.in) {
    const intersection = where.unidadeId.in.filter((id: string) =>
      unidadeIds.includes(id)
    );
    if (!intersection.length) {
      return { ...where, unidadeId: '___NO_MATCH___' };
    }
    return { ...where, unidadeId: { in: intersection } };
  }

  return { ...where, unidadeId: { in: unidadeIds } };
}

export function supervisorHasAccessToUnidade(
  unidadeId: string | null | undefined,
  unidadeIds: string[]
): boolean {
  if (!unidadeId) return false;
  return unidadeIds.includes(unidadeId);
}
