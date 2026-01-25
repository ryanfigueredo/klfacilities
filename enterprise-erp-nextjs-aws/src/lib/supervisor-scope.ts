import { prisma } from '@/lib/prisma';

export interface SupervisorScopeResult {
  grupoIds: string[];
  unidadeIds: string[];
}

export async function getSupervisorScope(supervisorId: string): Promise<SupervisorScopeResult> {
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

  // Separar grupos e unidades diretas
  assignments.forEach(item => {
    if (item.grupoId) grupoIdsDiretos.add(item.grupoId);
    if (item.unidadeId) unidadeIdsDiretas.add(item.unidadeId);
  });

  const grupoIds = new Set<string>(grupoIdsDiretos);
  const unidadeIds = new Set<string>(unidadeIdsDiretas);

  // Se o supervisor tem grupos vinculados, buscar unidades desses grupos
  if (grupoIds.size > 0) {
    const mappings = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: {
        grupoId: { in: Array.from(grupoIds) },
        ativo: true,
      },
      select: { unidadeId: true },
    });
    mappings.forEach(map => unidadeIds.add(map.unidadeId));
  }

  // Se o supervisor tem unidades específicas vinculadas, buscar os grupos dessas unidades
  // Isso permite que ele veja os grupos para filtrar as unidades no formulário
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
          select: {
            grupoId: true,
          },
        },
      },
    });

    unidadesComGrupos.forEach(unidade => {
      unidade.mapeamentos.forEach(mapping => {
        if (mapping.grupoId) {
          grupoIds.add(mapping.grupoId);
        }
      });
    });
  }

  return {
    grupoIds: Array.from(grupoIds),
    unidadeIds: Array.from(unidadeIds),
  };
}

export async function getSupervisorUnidadeIds(supervisorId: string): Promise<string[]> {
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
    const intersection = where.unidadeId.in.filter((id: string) => unidadeIds.includes(id));
    if (!intersection.length) {
      return { ...where, unidadeId: '___NO_MATCH___' };
    }
    return { ...where, unidadeId: { in: intersection } };
  }

  return { ...where, unidadeId: { in: unidadeIds } };
}

export function supervisorHasAccessToUnidade(unidadeId: string | null | undefined, unidadeIds: string[]): boolean {
  if (!unidadeId) return false;
  return unidadeIds.includes(unidadeId);
}
