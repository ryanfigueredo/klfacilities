import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Buscar todas as unidades ativas para o checklist com informações do grupo
    const unidades = await prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        ativa: true,
        whatsappLider: true,
        whatsappSupervisor: true,
        emailSupervisor: true,
        mapeamentos: {
          where: { ativo: true },
          select: {
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          take: 1, // Pega apenas o primeiro grupo (assumindo que cada unidade tem um grupo principal)
        },
        supervisorScopes: {
          select: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                whatsapp: true,
              },
            },
          },
        },
      },
    });

    const scopesPorGrupo = await prisma.supervisorScope.findMany({
      where: {
        grupoId: { not: null },
      },
      select: {
        id: true,
        grupoId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            whatsapp: true,
          },
        },
      },
    });

    const supervisorsByGroup = scopesPorGrupo.reduce<
      Record<string, Array<{ id: string; name: string; email: string; whatsapp: string | null }>>
    >((acc, scope) => {
      if (!scope.grupoId) return acc;
      if (!acc[scope.grupoId]) acc[scope.grupoId] = [];
      acc[scope.grupoId].push({
        id: scope.supervisor.id,
        name: scope.supervisor.name,
        email: scope.supervisor.email,
        whatsapp: scope.supervisor.whatsapp ?? null,
      });
      return acc;
    }, {});

    const unidadesComGrupo = unidades.map(unidade => {
      const grupos = unidade.mapeamentos
        .map(mapping => mapping.grupo)
        .filter(Boolean) as Array<{ id: string; nome: string }>;

      const supervisorsSet = new Map<
        string,
        { id: string; name: string; email: string; whatsapp: string | null; origem: 'UNIDADE' | 'GRUPO' }
      >();

      unidade.supervisorScopes.forEach(scope => {
        supervisorsSet.set(scope.supervisor.id, {
          id: scope.supervisor.id,
          name: scope.supervisor.name,
          email: scope.supervisor.email,
          whatsapp: scope.supervisor.whatsapp ?? null,
          origem: 'UNIDADE',
        });
      });

      grupos.forEach(grupo => {
        const supervisoresDoGrupo = supervisorsByGroup[grupo.id] ?? [];
        supervisoresDoGrupo.forEach(supervisor => {
          if (!supervisorsSet.has(supervisor.id)) {
            supervisorsSet.set(supervisor.id, {
              ...supervisor,
              origem: 'GRUPO',
            });
          }
        });
      });

      const supervisores = Array.from(supervisorsSet.values());

      return {
        id: unidade.id,
        nome: unidade.nome,
        ativa: unidade.ativa,
        whatsappLider: unidade.whatsappLider,
        whatsappSupervisor: unidade.whatsappSupervisor,
        emailSupervisor: unidade.emailSupervisor,
        grupoNome: grupos[0]?.nome || 'Sem Grupo',
        grupos,
        supervisores,
      };
    });

    return NextResponse.json({
      data: unidadesComGrupo,
    });
  } catch (error) {
    console.error('Erro ao buscar unidades para checklist:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
