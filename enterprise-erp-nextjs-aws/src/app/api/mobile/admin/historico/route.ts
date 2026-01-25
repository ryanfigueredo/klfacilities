import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toZonedTime, format as tzFormat } from 'date-fns-tz';

/**
 * OPTIONS /api/mobile/admin/historico
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST /api/mobile/admin/historico
 * Buscar histórico mensal de pontos para um CPF (com autenticação JWT)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const me = await getCurrentUser(request);
    if (!me) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cpf, month } = body; // month format: "YYYY-MM"

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Se month não foi fornecido, usar mês atual
    let monthStr = month;
    if (!monthStr) {
      const now = new Date();
      monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Validar formato do mês
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json(
        { error: 'Formato de mês inválido. Use YYYY-MM' },
        { status: 400 }
      );
    }

    // Normalizar CPF
    const cpfNormalizado = cpf.replace(/\D/g, '').trim();

    if (cpfNormalizado.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Buscar funcionário pelo CPF
    let funcionario = await prisma.funcionario.findFirst({
      where: { cpf: cpfNormalizado },
    });

    if (!funcionario) {
      const todosFuncionarios = await prisma.funcionario.findMany({
        where: { cpf: { not: null } },
      });

      funcionario = todosFuncionarios.find(f => {
        if (!f.cpf) return false;
        const cpfBancoNormalizado = f.cpf.replace(/\D/g, '').trim();
        return cpfBancoNormalizado === cpfNormalizado;
      }) || null;
    }

    if (!funcionario) {
      return NextResponse.json(
        { error: 'CPF não cadastrado no sistema' },
        { status: 404 }
      );
    }

    // Parse do mês (mesma lógica do /api/ponto/folha)
    const [year, monthNum] = monthStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));

    // Buscar registros do mês
    const registros = await prisma.registroPonto.findMany({
      where: {
        funcionarioId: funcionario.id,
        timestamp: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Agrupar registros por dia usando timezone de São Paulo (MESMA LÓGICA DO FOLHA)
    const byDay = new Map<number, typeof registros>();
    for (const r of registros) {
      const dt = new Date(r.timestamp as any);
      // Converter para timezone de São Paulo para garantir que o dia está correto
      const dtSp = toZonedTime(dt, 'America/Sao_Paulo');
      const dia = dtSp.getDate();
      const mes = dtSp.getMonth() + 1; // getMonth() retorna 0-11
      const ano = dtSp.getFullYear();
      
      // Verificar se o registro pertence ao mês correto
      if (mes === monthNum && ano === year) {
        const list = byDay.get(dia) || [];
        list.push(r);
        byDay.set(dia, list);
      }
    }

    // Calcular número de dias do mês (mesma lógica do folha)
    const lastDayDate = new Date(year, monthNum, 0);
    const daysInMonth = lastDayDate.getDate();

    // USAR EXATAMENTE A MESMA LÓGICA DO /api/ponto/folha
    type DiaRow = {
      dia: number;
      semana: string;
      entrada?: string;
      saida?: string;
      intervaloInicio?: string;
      intervaloFim?: string;
      totalHoras?: string;
      totalMinutos: number;
    };

    function weekdayPtShort(d: Date) {
      const map = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return map[d.getDay()] || '';
    }

    // Função de formatação IDÊNTICA ao folha/route.ts
    const fmt = (date: Date) =>
      tzFormat(toZonedTime(date, 'America/Sao_Paulo'), 'HH:mm', {
        timeZone: 'America/Sao_Paulo',
      });

    // Função processDay IDÊNTICA ao folha/route.ts
    const processDay = (day: number): DiaRow => {
      // Criar data local do dia (mesma lógica do folha)
      const localDate = new Date(year, monthNum - 1, day, 12, 0, 0);
      
      // Converter para timezone de São Paulo
      const zonedDate = toZonedTime(localDate, 'America/Sao_Paulo');
      
      // Verificar se o dia está correto após conversão
      let finalDate = zonedDate;
      if (zonedDate.getDate() !== day) {
        finalDate = localDate;
      }
      
      // Ordenar pontos do dia
      const list = (byDay.get(day) || []).sort(
        (a, b) => +new Date(a.timestamp as any) - +new Date(b.timestamp as any)
      );
      
      let minutosTrabalhados = 0;
      const records = list.map(r => ({
        ...r,
        time: new Date(r.timestamp as any).getTime(),
      }));

      // Agrupar por tipo e pegar apenas o PRIMEIRO registro de cada tipo por dia (MESMA LÓGICA)
      const tiposMap = new Map<string, any>();
      for (const r of records) {
        if (!tiposMap.has(r.tipo)) {
          tiposMap.set(r.tipo, r);
        }
      }

      // Separar pontos (usando apenas o primeiro de cada tipo)
      const entrada = tiposMap.get('ENTRADA');
      const saida = tiposMap.get('SAIDA');
      let intervaloIni = tiposMap.get('INTERVALO_INICIO');
      const intervaloFim = tiposMap.get('INTERVALO_FIM');
      const horaExtraInicio = tiposMap.get('HORA_EXTRA_INICIO');
      const horaExtraFim = tiposMap.get('HORA_EXTRA_FIM');

      // Se tem intervalo fim mas não tem início, criar registro virtual (MESMA LÓGICA DO FOLHA)
      if (!intervaloIni && intervaloFim) {
        const intervaloFimTime = new Date(intervaloFim.time);
        // Subtrair 1 hora (3600000 ms)
        const intervaloIniTime = new Date(intervaloFimTime.getTime() - 60 * 60 * 1000);
        
        // Criar registro virtual de INTERVALO_INICIO
        intervaloIni = {
          ...intervaloFim,
          tipo: 'INTERVALO_INICIO',
          time: intervaloIniTime.getTime(),
          timestamp: intervaloIniTime.toISOString(),
        };
      }
      
      const row: DiaRow = {
        dia: day,
        semana: weekdayPtShort(finalDate),
        totalMinutos: 0,
      };

      // Mapeamento para as colunas (usando apenas o primeiro registro de cada tipo)
      if (entrada) {
        const entradaDate = new Date(entrada.time);
        row.entrada = fmt(entradaDate);
      }

      if (saida) {
        const saidaDate = new Date(saida.time);
        row.saida = fmt(saidaDate);
      }

      // Intervalo: início e volta do intervalo
      if (intervaloIni) {
        const intervaloIniDate = new Date(intervaloIni.time);
        row.intervaloInicio = fmt(intervaloIniDate);
      }

      if (intervaloFim) {
        const intervaloFimDate = new Date(intervaloFim.time);
        row.intervaloFim = fmt(intervaloFimDate);
      }

      // Calcular horas trabalhadas (MESMA LÓGICA EXATA DO FOLHA)
      if (entrada && saida) {
        // Tempo total (entrada até saída)
        let tempoTotal = saida.time - entrada.time;

        // Subtrair intervalos (usando apenas o primeiro intervalo do dia)
        if (intervaloIni && intervaloFim) {
          // Garantir que o fim do intervalo é depois do início
          if (intervaloFim.time > intervaloIni.time) {
            tempoTotal -= intervaloFim.time - intervaloIni.time;
          }
        }

        minutosTrabalhados = Math.max(0, Math.round(tempoTotal / (1000 * 60)));

        // Adicionar horas extras se houver
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
      if (minutosTrabalhados > 0) {
        row.totalHoras = `${Math.floor(minutosTrabalhados / 60)}:${String(minutosTrabalhados % 60).padStart(2, '0')}`;
      }

      return row;
    };

    // Processar todos os dias do mês (MESMA LÓGICA)
    const table: DiaRow[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const row = processDay(d);
      table.push(row);
    }

    const response = NextResponse.json({
      success: true,
      funcionario: {
        nome: funcionario.nome,
        cpf: funcionario.cpf,
      },
      month: monthStr,
      table,
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de pontos' },
      { status: 500 }
    );
  }
}
