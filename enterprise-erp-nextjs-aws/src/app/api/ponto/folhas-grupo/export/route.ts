export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import * as XLSX from 'xlsx';

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
    const formato = searchParams.get('formato') || 'csv'; // 'csv' ou 'xlsx'
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

    // Buscar todas as unidades do grupo através dos mapeamentos
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

    // Buscar todos os funcionários do grupo que estão em unidades vinculadas
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
        { error: 'Nenhum funcionário encontrado para os filtros selecionados' },
        { status: 404 }
      );
    }

    // Preparar dados para exportação
    const dados: any[] = [];

    for (const func of funcionarios) {
      const registros = await prisma.registroPonto.findMany({
        where: {
          funcionarioId: func.id,
          timestamp: { gte: parsed.start, lt: parsed.end },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Agrupar por dia
      const byDay = new Map<number, any[]>();
      for (const r of registros) {
        const dt = new Date(r.timestamp as any);
        const dia = dt.getUTCDate();
        const list = byDay.get(dia) || [];
        list.push(r);
        byDay.set(dia, list);
      }

      // Processar cada dia
      const diasNoMes = new Date(parsed.y, parsed.m, 0).getDate();
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const pontos = byDay.get(dia) || [];
        const entradas = pontos.filter(p => p.tipo === 'ENTRADA');
        const saidas = pontos.filter(p => p.tipo === 'SAIDA');
        const intervalosIni = pontos.filter(p => p.tipo === 'INTERVALO_INICIO');
        const intervalosFim = pontos.filter(p => p.tipo === 'INTERVALO_FIM');

        const entrada = entradas[0] ? new Date(entradas[0].timestamp).toISOString().slice(11, 16) : '';
        const saida = saidas[saidas.length - 1] ? new Date(saidas[saidas.length - 1].timestamp).toISOString().slice(11, 16) : '';
        const intervaloIni = intervalosIni[0] ? new Date(intervalosIni[0].timestamp).toISOString().slice(11, 16) : '';
        const intervaloFim = intervalosFim[0] ? new Date(intervalosFim[0].timestamp).toISOString().slice(11, 16) : '';

        // Calcular horas trabalhadas
        let totalMinutos = 0;
        if (entradas.length > 0 && saidas.length > 0) {
          const entradaTime = new Date(entradas[0].timestamp).getTime();
          const saidaTime = new Date(saidas[saidas.length - 1].timestamp).getTime();
          let tempoTotal = saidaTime - entradaTime;

          // Subtrair intervalos
          for (let i = 0; i < intervalosIni.length; i++) {
            const inicioIntervalo = new Date(intervalosIni[i].timestamp).getTime();
            const fimIntervalo = intervalosFim.find(f => new Date(f.timestamp).getTime() > inicioIntervalo);
            if (fimIntervalo) {
              tempoTotal -= (new Date(fimIntervalo.timestamp).getTime() - inicioIntervalo);
            }
          }

          totalMinutos = Math.max(0, Math.round(tempoTotal / (1000 * 60)));
        }

        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        const totalHoras = `${horas}:${String(minutos).padStart(2, '0')}`;

        dados.push({
          'Grupo': func.grupo?.nome || '',
          'Unidade': func.unidade?.nome || '',
          'Colaborador': func.nome,
          'CPF': func.cpf || '',
          'Dia': dia,
          'Data': `${pad2(dia)}/${pad2(parsed.m)}/${parsed.y}`,
          'Entrada': entrada,
          'Intervalo Início': intervaloIni,
          'Intervalo Fim': intervaloFim,
          'Saída': saida,
          'Total Horas': totalHoras,
          'Total Minutos': totalMinutos,
        });
      }
    }

    const mesNome = new Date(parsed.y, parsed.m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const nomeArquivo = `folhas-ponto-${grupo.nome}-${month}`;

    if (formato === 'xlsx') {
      // Exportar como Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dados);
      XLSX.utils.book_append_sheet(wb, ws, 'Folhas de Ponto');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${nomeArquivo}.xlsx"`,
        },
      });
    } else {
      // Exportar como CSV
      const headers = Object.keys(dados[0] || {});
      const csvRows = [
        headers.join(','),
        ...dados.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${nomeArquivo}.csv"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Erro ao exportar folhas:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao exportar folhas' },
      { status: 500 }
    );
  }
}

