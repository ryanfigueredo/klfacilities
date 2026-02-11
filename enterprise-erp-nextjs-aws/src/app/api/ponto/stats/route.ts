import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { toZonedTime } from 'date-fns-tz';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar escopo de supervisor se aplicável
    let allowedUnidades: string[] | null = null;
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      allowedUnidades = scope.unidadeIds;
      if (!allowedUnidades.length) {
        return NextResponse.json({
          stats: {
            totalColaboradores: 0,
            totalRegistrosHoje: 0,
            totalRegistrosMes: 0,
            funcionariosAtivosMes: 0,
          },
          registrosRecentes: [],
        });
      }
    }

    // Estatísticas gerais (colaboradores que atuam em pelo menos uma unidade do scope)
    const whereFuncionario: any = {};
    if (allowedUnidades?.length) {
      whereFuncionario.OR = [
        { unidadeId: { in: allowedUnidades } },
        { unidadesPermitidas: { some: { unidadeId: { in: allowedUnidades } } } },
      ];
    }

    const totalColaboradores = await prisma.funcionario.count({
      where: whereFuncionario,
    });

    // Data de hoje e mês atual (horário de Brasília)
    const now = new Date();
    const brasiliaTime = toZonedTime(now, 'America/Sao_Paulo');
    const year = brasiliaTime.getFullYear();
    const month = brasiliaTime.getMonth();
    const day = brasiliaTime.getDate();

    // Início e fim do dia atual em UTC (considerando que timestamps no banco estão em UTC)
    // Usar range amplo para garantir que capture todo o dia de Brasília
    const hojeInicioUTC = new Date(Date.UTC(year, month, day - 1, 21, 0, 0, 0)); // 00:00 Brasília (UTC-3) ≈ 03:00 UTC, mas usar margem
    const hojeFimUTC = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999)); // 23:59 Brasília ≈ 02:59 UTC do dia seguinte

    // Mês atual
    const mesInicioUTC = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const mesFimUTC = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

    const whereRegistroHoje: any = {
      timestamp: { gte: hojeInicioUTC, lte: hojeFimUTC },
    };
    const whereRegistroMes: any = {
      timestamp: { gte: mesInicioUTC, lte: mesFimUTC },
    };

    if (allowedUnidades) {
      whereRegistroHoje.unidadeId = { in: allowedUnidades };
      whereRegistroMes.unidadeId = { in: allowedUnidades };
    }

    const [totalRegistrosHoje, totalRegistrosMes, funcionariosAtivosMes] =
      await Promise.all([
        prisma.registroPonto.count({ where: whereRegistroHoje }),
        prisma.registroPonto.count({ where: whereRegistroMes }),
        prisma.registroPonto.findMany({
          where: whereRegistroMes,
          select: { funcionarioId: true },
          distinct: ['funcionarioId'],
        }),
      ]);

    // Últimos 10 registros
    const whereRecentes: any = {};
    if (allowedUnidades) {
      whereRecentes.unidadeId = { in: allowedUnidades };
    }

    const registrosRecentes = await prisma.registroPonto.findMany({
      where: whereRecentes,
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        funcionario: {
          select: { id: true, nome: true, cpf: true },
        },
        unidade: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalColaboradores,
        totalRegistrosHoje,
        totalRegistrosMes,
        funcionariosAtivosMes: funcionariosAtivosMes.filter(
          r => r.funcionarioId
        ).length,
      },
      registrosRecentes: registrosRecentes.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        tipo: r.tipo,
        funcionarioNome: r.funcionario?.nome || 'N/A',
        unidadeNome: r.unidade?.nome || 'N/A',
      })),
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas do ponto:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}

