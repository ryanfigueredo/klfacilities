import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { toZonedTime } from 'date-fns-tz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let month = searchParams.get('month') || '';
    const unidadeId = searchParams.get('unidadeId') || undefined;
    const cidade = searchParams.get('cidade') || undefined;
    const estado = searchParams.get('estado') || undefined;
    const grupoId = searchParams.get('grupoId') || undefined;
    const funcionarioId = searchParams.get('funcionarioId') || undefined;
    const supervisorId = searchParams.get('supervisorId') || undefined;

    // Se não informou mês, usar o mês atual como padrão
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    // Verificar scope do supervisor
    let allowedUnidades: string[] | null = null;
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      allowedUnidades = scope.unidadeIds;
      if (!allowedUnidades.length) {
        return NextResponse.json({
          totalHoras: 0,
          totalMinutos: 0,
          totalRegistros: 0,
          colaboradoresAtivos: 0,
          unidadesAtivas: 0,
        });
      }
    }

    // Se foi especificado supervisorId, buscar unidades do supervisor
    let unidadesDoSupervisor: string[] | null = null;
    if (supervisorId) {
      const scope = await getSupervisorScope(supervisorId);
      unidadesDoSupervisor = scope.unidadeIds;
      if (!unidadesDoSupervisor.length) {
        return NextResponse.json({
          totalHoras: 0,
          totalMinutos: 0,
          totalRegistros: 0,
          colaboradoresAtivos: 0,
          unidadesAtivas: 0,
        });
      }
    }

    // Construir filtros de unidade
    const whereUnidade: any = { ativa: true };
    if (unidadeId) {
      whereUnidade.id = unidadeId;
    }
    if (cidade) {
      whereUnidade.cidade = cidade;
    }
    if (estado) {
      whereUnidade.estado = estado;
    }

    // Se for supervisor logado, limitar às unidades do scope
    if (allowedUnidades) {
      whereUnidade.id = { in: allowedUnidades };
    }

    // Se foi especificado supervisorId, limitar às unidades do supervisor
    if (unidadesDoSupervisor) {
      if (whereUnidade.id) {
        // Se já tem filtro de unidade, fazer interseção
        const currentIds = Array.isArray(whereUnidade.id?.in)
          ? whereUnidade.id.in
          : [whereUnidade.id];
        const intersection = currentIds.filter((id: string) =>
          unidadesDoSupervisor!.includes(id)
        );
        if (intersection.length === 0) {
          return NextResponse.json({
            totalHoras: 0,
            totalMinutos: 0,
            totalRegistros: 0,
            colaboradoresAtivos: 0,
            unidadesAtivas: 0,
          });
        }
        whereUnidade.id = { in: intersection };
      } else {
        whereUnidade.id = { in: unidadesDoSupervisor };
      }
    }

    // Buscar unidades que correspondem aos filtros
    const unidadesFiltradas = await prisma.unidade.findMany({
      where: whereUnidade,
      select: { id: true },
    });

    const unidadesIds = unidadesFiltradas.map(u => u.id);

    if (unidadesIds.length === 0 && (cidade || estado || unidadeId)) {
      // Se há filtros mas nenhuma unidade corresponde, retornar zeros
      return NextResponse.json({
        totalHoras: 0,
        totalMinutos: 0,
        totalRegistros: 0,
        colaboradoresAtivos: 0,
        unidadesAtivas: 0,
      });
    }

    // Construir filtros de funcionários
    const whereFuncionario: any = {};
    if (grupoId) {
      whereFuncionario.grupoId = grupoId;
    }
    if (funcionarioId) {
      whereFuncionario.id = funcionarioId;
    }
    if (unidadesIds.length > 0) {
      whereFuncionario.unidadeId = { in: unidadesIds };
    }

    // Buscar funcionários que correspondem aos filtros
    const funcionariosFiltrados = await prisma.funcionario.findMany({
      where: whereFuncionario,
      select: { id: true },
    });

    const funcionariosIds = funcionariosFiltrados.map(f => f.id);

    if (funcionariosIds.length === 0 && (grupoId || funcionarioId)) {
      // Se há filtros de funcionário mas nenhum corresponde, retornar zeros
      return NextResponse.json({
        totalHoras: 0,
        totalMinutos: 0,
        totalRegistros: 0,
        colaboradoresAtivos: 0,
        unidadesAtivas: unidadesIds.length,
      });
    }

    // Construir filtros de registros
    const whereRegistros: any = {
      timestamp: { gte: start, lt: end },
    };

    if (unidadesIds.length > 0) {
      whereRegistros.unidadeId = { in: unidadesIds };
    }

    if (funcionariosIds.length > 0) {
      whereRegistros.funcionarioId = { in: funcionariosIds };
    }

    // Buscar todos os registros do período
    const registros = await prisma.registroPonto.findMany({
      where: whereRegistros,
      select: {
        id: true,
        funcionarioId: true,
        timestamp: true,
        tipo: true,
        unidadeId: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Agrupar por dia e funcionário para calcular horas (usando timezone de São Paulo)
    const byFuncionarioAndDay = new Map<string, Map<number, any[]>>();

    for (const registro of registros) {
      if (!registro.funcionarioId) continue;

      // Converter para timezone de São Paulo para garantir que o dia está correto
      const dt = new Date(registro.timestamp as any);
      const dtSp = toZonedTime(dt, 'America/Sao_Paulo');
      const dia = dtSp.getDate();
      const mes = dtSp.getMonth() + 1;
      const ano = dtSp.getFullYear();
      
      // Verificar se o registro pertence ao mês correto
      if (mes === m && ano === y) {
        const key = registro.funcionarioId;

        if (!byFuncionarioAndDay.has(key)) {
          byFuncionarioAndDay.set(key, new Map());
        }

        const dias = byFuncionarioAndDay.get(key)!;
        if (!dias.has(dia)) {
          dias.set(dia, []);
        }

        dias.get(dia)!.push(registro);
      }
    }

    // Calcular totais
    let totalMinutos = 0;
    const funcionariosAtivos = new Set<string>();

    for (const [funcionarioId, dias] of byFuncionarioAndDay.entries()) {
      funcionariosAtivos.add(funcionarioId);

      for (const [dia, pontos] of dias.entries()) {
        // Ordenar pontos por timestamp
        const pontosOrdenados = pontos.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Separar por tipo
        const entradas = pontosOrdenados.filter(p => p.tipo === 'ENTRADA');
        const saidas = pontosOrdenados.filter(p => p.tipo === 'SAIDA');
        const intervalosIni = pontosOrdenados.filter(
          p => p.tipo === 'INTERVALO_INICIO'
        );
        const intervalosFim = pontosOrdenados.filter(
          p => p.tipo === 'INTERVALO_FIM'
        );

        if (entradas.length > 0 && saidas.length > 0) {
          const entrada = new Date(entradas[0].timestamp);
          const saida = new Date(saidas[saidas.length - 1].timestamp);

          let minutos = (saida.getTime() - entrada.getTime()) / (1000 * 60);

          // Descontar intervalos APENAS se tiver TANTO início quanto fim
          // Se não tiver início, NÃO desconta nada (mesma lógica da folha)
          if (intervalosIni.length > 0 && intervalosFim.length > 0) {
            const intervaloInicio = new Date(intervalosIni[0].timestamp);
            const intervaloFim = new Date(intervalosFim[0].timestamp);
            // Garantir que o fim do intervalo é depois do início
            if (intervaloFim.getTime() > intervaloInicio.getTime()) {
              const minutosIntervalo =
                (intervaloFim.getTime() - intervaloInicio.getTime()) /
                (1000 * 60);
              minutos -= minutosIntervalo;
            }
          }
          // Se não tem início do intervalo, NÃO desconta nada

          totalMinutos += Math.max(0, minutos);
        }
      }
    }

    const totalHoras = Math.floor(totalMinutos / 60);
    const totalRegistros = registros.length;
    const colaboradoresAtivos = funcionariosAtivos.size;
    const unidadesAtivas = unidadesIds.length;

    return NextResponse.json({
      totalHoras,
      totalMinutos: Math.round(totalMinutos),
      totalRegistros,
      colaboradoresAtivos,
      unidadesAtivas,
    });
  } catch (error: any) {
    console.error('Erro ao calcular KPIs:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao calcular KPIs' },
      { status: 500 }
    );
  }
}
