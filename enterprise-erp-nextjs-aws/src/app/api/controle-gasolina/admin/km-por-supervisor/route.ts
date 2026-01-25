import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export async function GET(req: NextRequest) {
  try {
    await requireControleGasolinaAdmin();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const periodFilter: { gte?: Date; lt?: Date } = {};
    const hasExplicitPeriod = startDate || endDate;
    if (startDate) periodFilter.gte = new Date(startDate + 'T00:00:00');
    if (endDate) {
      const end = new Date(endDate + 'T00:00:00');
      periodFilter.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    // Não aplicar período padrão - buscar todos os registros se nenhum período for especificado
    // if (!startDate && !endDate) {
    //   periodFilter.gte = startOfCurrentMonth;
    //   periodFilter.lt = startOfNextMonth;
    // }

    // Buscar todos os supervisores ativos
    const supervisores = await prisma.user.findMany({
      where: {
        role: 'SUPERVISOR',
        ativo: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // Buscar todos os veículos com seus assignments para mapear supervisores
    const veiculos = await prisma.vehicle.findMany({
      include: {
        usuarios: {
          where: { ativo: true },
          include: {
            usuario: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Criar mapa: veiculoId -> supervisorIds vinculados
    const veiculoSupervisorMap = new Map<string, Set<string>>();
    veiculos.forEach(veiculo => {
      veiculo.usuarios.forEach(assignment => {
        if (assignment.usuario.role === 'SUPERVISOR') {
          if (!veiculoSupervisorMap.has(veiculo.id)) {
            veiculoSupervisorMap.set(veiculo.id, new Set());
          }
          veiculoSupervisorMap.get(veiculo.id)!.add(assignment.usuario.id);
        }
      });
    });

    // Buscar todos os KmRecords dos veículos vinculados aos supervisores
    const veiculoIdsVinculados = Array.from(veiculoSupervisorMap.keys());

    console.log('[km-por-supervisor] Veículos vinculados:', veiculoIdsVinculados.length);
    console.log('[km-por-supervisor] IDs dos veículos:', veiculoIdsVinculados.slice(0, 5), '...');

    // Debug: verificar quantos KmRecords existem no total
    const totalKmRecords = await prisma.kmRecord.count();
    console.log('[km-por-supervisor] Total de KmRecords no banco:', totalKmRecords);

    // Buscar alguns KmRecords para ver quais veículos têm registros
    const sampleKmRecords = await prisma.kmRecord.findMany({
      take: 10,
      select: {
        id: true,
        veiculoId: true,
        km: true,
        createdAt: true,
      },
    });
    console.log('[km-por-supervisor] Amostra de KmRecords (primeiros 10):', sampleKmRecords.map(r => ({
      veiculoId: r.veiculoId,
      km: r.km,
      createdAt: r.createdAt,
    })));

    const kmRecordsAll = veiculoIdsVinculados.length > 0
      ? await prisma.kmRecord.findMany({
          where: {
            veiculoId: { in: veiculoIdsVinculados },
          },
          select: {
            id: true,
            veiculoId: true,
            km: true,
            createdAt: true,
          },
        })
      : [];

    console.log('[km-por-supervisor] KmRecords encontrados para veículos vinculados:', kmRecordsAll.length);
    if (kmRecordsAll.length > 0) {
      console.log('[km-por-supervisor] Exemplo de KmRecords encontrados:', kmRecordsAll.slice(0, 3).map(r => ({
        veiculoId: r.veiculoId,
        km: r.km,
        createdAt: r.createdAt,
      })));
    }

    // Filtrar por período apenas se explicitamente especificado
    // Os KmRecords têm createdAt como meio-termo entre dois abastecimentos,
    // então o filtro pode não ser exato, mas vamos usar mesmo assim
    const kmRecords = hasExplicitPeriod && (periodFilter.gte || periodFilter.lt)
      ? kmRecordsAll.filter(record => {
          const recordDate = record.createdAt;
          if (periodFilter.gte && recordDate < periodFilter.gte) return false;
          if (periodFilter.lt && recordDate >= periodFilter.lt) return false;
          return true;
        })
      : kmRecordsAll;

    console.log('[km-por-supervisor] KmRecords após filtro de período:', kmRecords.length, 'hasExplicitPeriod:', hasExplicitPeriod);

    // Calcular KM por supervisor
    const kmPorSupervisor = supervisores.map(supervisor => {
      let totalKm = 0;
      let qtdRegistros = 0;
      
      // Buscar todos os registros de KM dos veículos vinculados ao supervisor
      kmRecords.forEach(record => {
        const supervisorIds = veiculoSupervisorMap.get(record.veiculoId);
        if (supervisorIds && supervisorIds.has(supervisor.id)) {
          totalKm += record.km;
          qtdRegistros++;
        }
      });

      if (qtdRegistros > 0) {
        console.log(`[km-por-supervisor] Supervisor ${supervisor.name}: ${qtdRegistros} registros, ${totalKm} km`);
      }

      return {
        supervisor: {
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email,
        },
        kmDiretos: 0, // KM diretos não são relevantes pois são criados automaticamente
        kmVeiculos: totalKm,
        totalKm,
        qtdRegistros,
      };
    });

    console.log('[km-por-supervisor] Total de supervisores processados:', kmPorSupervisor.length);
    console.log('[km-por-supervisor] Supervisores com KM > 0:', kmPorSupervisor.filter(s => s.totalKm > 0).length);

    // Filtrar apenas supervisores com veículos vinculados
    const supervisoresComVeiculos = kmPorSupervisor.filter(item => {
      // Verificar se o supervisor tem veículos vinculados no mapa
      const temVeiculos = Array.from(veiculoSupervisorMap.values()).some(supervisorIds =>
        supervisorIds.has(item.supervisor.id)
      );
      return temVeiculos;
    });

    // Ordenar por total KM (maior primeiro)
    supervisoresComVeiculos.sort((a, b) => b.totalKm - a.totalKm);

    return NextResponse.json({
      periodo: {
        inicio: periodFilter.gte,
        fim: periodFilter.lt,
      },
      kmPorSupervisor: supervisoresComVeiculos,
    });
  } catch (error) {
    console.error('Erro ao calcular KM por supervisor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
