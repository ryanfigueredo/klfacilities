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
    if (startDate) periodFilter.gte = new Date(startDate + 'T00:00:00');
    if (endDate) {
      const end = new Date(endDate + 'T00:00:00');
      periodFilter.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    if (!startDate && !endDate) {
      periodFilter.gte = startOfCurrentMonth;
      periodFilter.lt = startOfNextMonth;
    }

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

    // Buscar abastecimentos e Sem Parar no período
    const [fuelRecords, semPararRecords] = await Promise.all([
      prisma.fuelRecord.findMany({
        where: {
          ...(periodFilter.gte || periodFilter.lt
            ? { createdAt: periodFilter }
            : {}),
        },
        select: {
          id: true,
          veiculoId: true,
          usuarioId: true,
          valor: true,
          createdAt: true,
        },
      }),
      prisma.semPararRegistro.findMany({
        where: {
          ...(periodFilter.gte || periodFilter.lt
            ? { data: periodFilter }
            : {}),
        },
        select: {
          id: true,
          veiculoId: true,
          valor: true,
          data: true,
        },
      }),
    ]);

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

    // Calcular gastos por supervisor
    const gastosPorSupervisor = supervisores.map(supervisor => {
      let totalAbastecimentos = 0;
      let qtdAbastecimentos = 0;
      let totalSemParar = 0;
      let qtdSemParar = 0;

      // Abastecimentos dos veículos vinculados ao supervisor
      fuelRecords.forEach(record => {
        const supervisorIds = veiculoSupervisorMap.get(record.veiculoId);
        if (supervisorIds && supervisorIds.has(supervisor.id)) {
          totalAbastecimentos += record.valor;
          qtdAbastecimentos++;
        }
      });

      // Sem Parar dos veículos vinculados ao supervisor
      semPararRecords.forEach(record => {
        const supervisorIds = veiculoSupervisorMap.get(record.veiculoId);
        if (supervisorIds && supervisorIds.has(supervisor.id)) {
          totalSemParar += Number(record.valor || 0);
          qtdSemParar++;
        }
      });

      const totalGasto = totalAbastecimentos + totalSemParar;

      return {
        supervisor: {
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email,
        },
        totalAbastecimentos,
        totalSemParar,
        totalGasto,
        qtdAbastecimentos,
        qtdSemParar,
      };
    });

    // Filtrar apenas supervisores com veículos vinculados
    const supervisoresComVeiculos = gastosPorSupervisor.filter(item => {
      // Verificar se o supervisor tem veículos vinculados no mapa
      const temVeiculos = Array.from(veiculoSupervisorMap.values()).some(supervisorIds =>
        supervisorIds.has(item.supervisor.id)
      );
      return temVeiculos;
    });

    // Ordenar por total gasto (maior primeiro)
    supervisoresComVeiculos.sort((a, b) => b.totalGasto - a.totalGasto);

    return NextResponse.json({
      periodo: {
        inicio: periodFilter.gte,
        fim: periodFilter.lt,
      },
      gastosPorSupervisor: supervisoresComVeiculos,
    });
  } catch (error) {
    console.error('Erro ao calcular gastos por supervisor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

