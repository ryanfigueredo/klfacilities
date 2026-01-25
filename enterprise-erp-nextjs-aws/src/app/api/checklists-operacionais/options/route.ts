import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getSupervisorScope,
  supervisorHasAccessToUnidade,
} from '@/lib/supervisor-scope';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const isSupervisor = me.role === 'SUPERVISOR' || me.role === 'LAVAGEM';
  
  // Buscar scope do supervisor em paralelo com outras queries
  const [supervisorScope, grupos, unidades] = await Promise.all([
    isSupervisor ? getSupervisorScope(me.id) : Promise.resolve(null),
    prisma.grupo.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        ativo: true,
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.unidade.findMany({
      where: { ativa: true },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        ativa: true,
        mapeamentos: {
          where: { ativo: true },
          select: {
            grupoId: true,
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    }),
  ]);

  const accessibleUnidades = unidades.filter(unidade => {
    if (!isSupervisor) return true;
    return supervisorHasAccessToUnidade(unidade.id, supervisorScope?.unidadeIds ?? []);
  });

  // Filtrar grupos para supervisor:
  // Grupos podem vir de duas fontes:
  // 1. Grupos diretamente vinculados ao supervisor (via SupervisorScope com grupoId)
  // 2. Grupos das unidades vinculadas ao supervisor (para permitir filtro no formulário)
  let accessibleGrupos: typeof grupos = [];
  
  if (isSupervisor) {
    // Usar os grupos retornados pelo getSupervisorScope
    // Isso inclui grupos diretos E grupos das unidades vinculadas
    if (supervisorScope?.grupoIds && supervisorScope.grupoIds.length > 0) {
      accessibleGrupos = grupos.filter(grupo => 
        supervisorScope.grupoIds.includes(grupo.id)
      );
    } else {
      // Se não tem grupos, não deve ver nenhum grupo
      accessibleGrupos = [];
    }
  } else {
    accessibleGrupos = grupos;
  }

  // Filtrar templates para supervisor: apenas os que têm escopos ativos nas unidades acessíveis
  const templates = await prisma.checklistTemplate.findMany({
    where: {
      ativo: true,
      ...(isSupervisor && supervisorScope?.unidadeIds.length
        ? {
            escopos: {
              some: {
                ativo: true,
                unidadeId: { in: supervisorScope.unidadeIds },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      escopos: {
        select: {
          id: true,
          unidadeId: true,
          ativo: true,
        },
      },
    },
    orderBy: { titulo: 'asc' },
  });

  return NextResponse.json({
    grupos: accessibleGrupos,
    unidades: accessibleUnidades.map(unidade => ({
      id: unidade.id,
      nome: unidade.nome,
      cidade: unidade.cidade,
      estado: unidade.estado,
      grupos: unidade.mapeamentos.map(mapping => ({
        id: mapping.grupo?.id,
        nome: mapping.grupo?.nome,
      })),
    })),
    templates: templates.map(template => ({
      id: template.id,
      titulo: template.titulo,
      descricao: template.descricao,
      escopos: template.escopos,
    })),
  });
}


