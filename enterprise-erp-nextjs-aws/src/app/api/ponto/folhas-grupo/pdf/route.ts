export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { PDFDocument } from 'pdf-lib';
import { toZonedTime } from 'date-fns-tz';
import { addFolhaPageToPDF, type DiaRow } from '@/lib/ponto/pdf-folha';

function parseMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { y, m, start, end };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || '';
    const grupoId = searchParams.get('grupoId') || '';
    const unidadeId = searchParams.get('unidadeId') || '';
    const cidade = searchParams.get('cidade') || '';
    const estado = searchParams.get('estado') || '';
    const supervisorId = searchParams.get('supervisorId') || '';
    const apenasComRegistros = searchParams.get('apenasComRegistros') === 'true';

    if (!grupoId || !month) {
      return NextResponse.json(
        { error: 'grupoId e month são obrigatórios' },
        { status: 400 }
      );
    }

    const parsed = parseMonth(month);
    if (!parsed) {
      return NextResponse.json(
        { error: 'month inválido (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Buscar grupo
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Buscar todas as unidades do grupo
    let mapeamentos = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: {
        grupoId,
        ativo: true,
      },
      include: {
        unidade: true,
      },
    });

    // Aplicar filtros de localização
    if (estado) {
      mapeamentos = mapeamentos.filter(m => m.unidade.estado === estado);
    }
    if (cidade) {
      mapeamentos = mapeamentos.filter(m => m.unidade.cidade === cidade);
    }
    if (unidadeId) {
      mapeamentos = mapeamentos.filter(m => m.unidadeId === unidadeId);
    }

    // Filtrar por supervisor se especificado
    if (supervisorId) {
      const unidadesDoSupervisor = await prisma.supervisorScope.findMany({
        where: {
          supervisorId,
          unidadeId: { not: null },
        },
        select: {
          unidadeId: true,
        },
      });
      const unidadesSupervisorIds = new Set<string>(
        unidadesDoSupervisor
          .map(m => m.unidadeId)
          .filter((id): id is string => id !== null)
      );
      mapeamentos = mapeamentos.filter(m => 
        m.unidadeId && unidadesSupervisorIds.has(m.unidadeId)
      );
    }

    let unidadeIds = mapeamentos.map(m => m.unidadeId);

    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      const allowedUnits = new Set(scope.unidadeIds);
      const hasGroup = scope.grupoIds.includes(grupoId);

      if (!hasGroup) {
        mapeamentos = mapeamentos.filter(m => allowedUnits.has(m.unidadeId));
        unidadeIds = mapeamentos.map(m => m.unidadeId);
      } else if (allowedUnits.size > 0) {
        const filtered = mapeamentos.filter(m => allowedUnits.has(m.unidadeId));
        if (filtered.length) {
          mapeamentos = filtered;
          unidadeIds = filtered.map(m => m.unidadeId);
        }
      }

      if (!unidadeIds.length) {
        return NextResponse.json(
          { error: 'Sem permissão para visualizar este grupo' },
          { status: 403 }
        );
      }
    }

    // Buscar todos os funcionários do grupo
    let funcionarios = await prisma.funcionario.findMany({
      where: {
        grupoId,
        unidadeId: { in: unidadeIds },
      },
      include: {
        grupo: true,
        unidade: true,
      },
    });

    // Filtrar apenas funcionários com registros se solicitado
    if (apenasComRegistros && funcionarios.length > 0) {
      const funcionariosIds = funcionarios.map(f => f.id);
      const funcionariosComRegistros = await prisma.registroPonto.findMany({
        where: {
          timestamp: { gte: parsed.start, lt: parsed.end },
          funcionarioId: { in: funcionariosIds },
        },
        select: {
          funcionarioId: true,
        },
        distinct: ['funcionarioId'],
      });

      const funcionariosIdsComRegistros = new Set(
        funcionariosComRegistros.map(r => r.funcionarioId).filter(Boolean)
      );
      funcionarios = funcionarios.filter(f => funcionariosIdsComRegistros.has(f.id));
    }

    if (funcionarios.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum funcionário encontrado para este grupo' },
        { status: 404 }
      );
    }

    // Criar PDF combinado
    const pdf = await PDFDocument.create();

    // Função auxiliar para processar um dia específico (mesma lógica da folha individual)
    const processDay = (
      day: number,
      byDay: Map<number, any[]>,
      parsed: { y: number; m: number }
    ): DiaRow => {
      const localDate = new Date(parsed.y, parsed.m - 1, day, 12, 0, 0);
      const zonedDate = toZonedTime(localDate, 'America/Sao_Paulo');
      let finalDate = zonedDate;
      if (zonedDate.getDate() !== day) {
        finalDate = localDate;
      }

      const weekdayPtShort = (d: Date) => {
        const map = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return map[d.getDay()] || '';
      };

      const list = (byDay.get(day) || []).sort(
        (a, b) => +new Date(a.timestamp as any) - +new Date(b.timestamp as any)
      );

      const row: DiaRow = {
        dia: day,
        semana: weekdayPtShort(finalDate),
        pontos: list,
        totalMinutos: 0,
      };

      const records = list.map(r => ({
        ...r,
        time: new Date(r.timestamp as any).getTime(),
      }));

      // Agrupar por tipo e pegar apenas o PRIMEIRO registro de cada tipo por dia
      const tiposMap = new Map<string, any>();
      for (const r of records) {
        if (!tiposMap.has(r.tipo)) {
          tiposMap.set(r.tipo, r);
        }
      }

      const entrada = tiposMap.get('ENTRADA');
      const saida = tiposMap.get('SAIDA');
      const intervaloIni = tiposMap.get('INTERVALO_INICIO');
      const intervaloFim = tiposMap.get('INTERVALO_FIM');
      const horaExtraInicio = tiposMap.get('HORA_EXTRA_INICIO');
      const horaExtraFim = tiposMap.get('HORA_EXTRA_FIM');

      const fmt = (date: Date) => {
        const { format: tzFormat } = require('date-fns-tz');
        return tzFormat(toZonedTime(date, 'America/Sao_Paulo'), 'HH:mm', {
          timeZone: 'America/Sao_Paulo',
        });
      };

      if (entrada) {
        const entradaDate = new Date(entrada.time);
        row.normalInicio = fmt(entradaDate);
      }

      if (saida) {
        const saidaDate = new Date(saida.time);
        row.normalTermino = fmt(saidaDate);
      }

      if (intervaloIni) {
        const intervaloIniDate = new Date(intervaloIni.time);
        row.normalIntervalo = fmt(intervaloIniDate);
      }

      if (intervaloFim) {
        const intervaloFimDate = new Date(intervaloFim.time);
        row.normalVoltaIntervalo = fmt(intervaloFimDate);
      }

      if (horaExtraInicio) {
        const horaExtraInicioDate = new Date(horaExtraInicio.time);
        row.extraInicio = fmt(horaExtraInicioDate);
      }

      if (horaExtraFim) {
        const horaExtraFimDate = new Date(horaExtraFim.time);
        row.extraTermino = fmt(horaExtraFimDate);
      }

      // Calcular horas trabalhadas
      let minutosTrabalhados = 0;
      if (entrada && saida) {
        let tempoTotal = saida.time - entrada.time;

        if (intervaloIni && intervaloFim) {
          if (intervaloFim.time > intervaloIni.time) {
            tempoTotal -= intervaloFim.time - intervaloIni.time;
          }
        }

        minutosTrabalhados = Math.max(0, Math.round(tempoTotal / (1000 * 60)));

        if (horaExtraInicio && horaExtraFim) {
          if (horaExtraFim.time > horaExtraInicio.time) {
            const minutosExtras = Math.round(
              (horaExtraFim.time - horaExtraInicio.time) / (1000 * 60)
            );
            minutosTrabalhados += minutosExtras;
          }
        }
      }

      row.totalMinutos = minutosTrabalhados;
      row.totalHoras = `${Math.floor(minutosTrabalhados / 60)}:${String(minutosTrabalhados % 60).padStart(2, '0')}`;

      return row;
    };

    // Processar cada funcionário e adicionar sua folha usando o formato completo
    for (const func of funcionarios) {
      const registros = await prisma.registroPonto.findMany({
        where: {
          funcionarioId: func.id,
          timestamp: { gte: parsed.start, lt: parsed.end },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Agrupar registros por dia do mês (usando timezone de São Paulo)
      const byDay = new Map<number, any[]>();
      for (const r of registros) {
        const dt = new Date(r.timestamp as any);
        const dtSp = toZonedTime(dt, 'America/Sao_Paulo');
        const dia = dtSp.getDate();
        const mes = dtSp.getMonth() + 1;
        const ano = dtSp.getFullYear();

        if (mes === parsed.m && ano === parsed.y) {
          const list = byDay.get(dia) || [];
          list.push(r);
          byDay.set(dia, list);
        }
      }

      const lastDayOfMonth = toZonedTime(
        new Date(Date.UTC(parsed.y, parsed.m, 0)),
        'America/Sao_Paulo'
      );
      const daysInMonth = lastDayOfMonth.getDate();
      const table: DiaRow[] = [];
      let totalMinutosMes = 0;
      let totalHorasMes = 0;

      // Processar todos os dias do mês
      for (let d = 1; d <= daysInMonth; d++) {
        const row = processDay(d, byDay, parsed);
        totalMinutosMes += row.totalMinutos || 0;
        totalHorasMes = Math.floor(totalMinutosMes / 60);
        table.push(row);
      }

      // Adicionar página usando a função compartilhada (mesmo formato do PDF individual)
      await addFolhaPageToPDF(
        pdf,
        {
          id: func.id,
          nome: func.nome,
          cpf: func.cpf,
          grupo: func.grupo,
          unidade: func.unidade,
          unidadeId: func.unidadeId,
        },
        table,
        month,
        totalHorasMes,
        totalMinutosMes,
        func.unidadeId || undefined
      );
    }

    const bytes = await pdf.save();
    const mesNome = new Date(parsed.y, parsed.m - 1).toLocaleDateString(
      'pt-BR',
      { month: 'long', year: 'numeric' }
    );

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="folhas-ponto-${grupo.nome}-${month}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
