import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';

/**
 * GET /api/ponto/supervisor/folhas
 * Lista funcionários e suas folhas de ponto para o supervisor
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser(req);
  // Permitir SUPERVISOR, OPERACIONAL, ADMIN e MASTER
  if (!me?.id || !['SUPERVISOR', 'OPERACIONAL', 'ADMIN', 'MASTER'].includes(me.role || '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get('unidadeId') || undefined;
  const month = searchParams.get('month') || '';

  // Obter unidades permitidas baseado no role
  let unidadesPermitidas: string[] = [];
  let unidadesList: Array<{ id: string; nome: string }> = [];
  
  if (me.role === 'SUPERVISOR') {
    // Supervisor: apenas suas unidades
    const scope = await getSupervisorScope(me.id);
    console.log(`[API] Supervisor ${me.id} (${me.email}) - Scope:`, {
      grupoIds: scope.grupoIds.length,
      unidadeIdsCount: scope.unidadeIds.length,
      unidadeIds: scope.unidadeIds,
    });
    
    if (!scope.unidadeIds.length) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    unidadesPermitidas = scope.unidadeIds;
    
    // Filtrar por unidade se especificada
    if (unidadeId) {
      if (!scope.unidadeIds.includes(unidadeId)) {
        return NextResponse.json({ error: 'Sem permissão para esta unidade' }, { status: 403 });
      }
      unidadesPermitidas = [unidadeId];
    }
    
    // Buscar nomes das unidades do supervisor
    const unidadesDoSupervisor = await prisma.unidade.findMany({
      where: { id: { in: scope.unidadeIds } },
      select: { id: true, nome: true },
    });
    unidadesList = unidadesDoSupervisor;
    console.log(`[API] Unidades do supervisor retornadas:`, unidadesList.length, unidadesList.map(u => u.nome));
  } else {
    // ADMIN, MASTER e OPERACIONAL: todas as unidades
    if (unidadeId) {
      unidadesPermitidas = [unidadeId];
      const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
        select: { id: true, nome: true },
      });
      if (unidade) {
        unidadesList = [unidade];
      }
    } else {
      // Buscar todas as unidades se não especificou
      const todasUnidades = await prisma.unidade.findMany({
        select: { id: true, nome: true },
      });
      unidadesPermitidas = todasUnidades.map(u => u.id);
      unidadesList = todasUnidades;
    }
  }

  // Buscar funcionários das unidades do supervisor
  const funcionarios = await prisma.funcionario.findMany({
    where: {
      unidadeId: { in: unidadesPermitidas },
    },
    include: {
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      grupo: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
    orderBy: {
      nome: 'asc',
    },
  });

  // Se especificou mês, buscar informações de batidas
  let funcionariosComBatidas: Array<any> = funcionarios;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [ano, mes] = month.split('-').map(Number);
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const fimMes = new Date(Date.UTC(ano, mes, 1, 0, 0, 0));

    funcionariosComBatidas = await Promise.all(
      funcionarios.map(async (func) => {
        const batidas = await prisma.registroPonto.findMany({
          where: {
            funcionarioId: func.id,
            timestamp: {
              gte: inicioMes,
              lt: fimMes,
            },
          },
          orderBy: {
            timestamp: 'asc',
          },
        });

        // Contar batidas por tipo
        const entrada = batidas.filter(b => b.tipo === 'ENTRADA').length;
        const saida = batidas.filter(b => b.tipo === 'SAIDA').length;
        const intervaloInicio = batidas.filter(b => b.tipo === 'INTERVALO_INICIO').length;
        const intervaloFim = batidas.filter(b => b.tipo === 'INTERVALO_FIM').length;

        const { grupo, unidade, ...funcSemRelacoes } = func;
        return {
          ...funcSemRelacoes,
          grupoId: grupo?.id || func.grupoId || null,
          grupoNome: grupo?.nome || null,
          unidadeId: unidade?.id || func.unidadeId || null,
          unidadeNome: unidade?.nome || null,
          batidas: {
            total: batidas.length,
            entrada,
            saida,
            intervaloInicio,
            intervaloFim,
          },
        };
      })
    );
  } else {
    // Se não especificou mês, ainda precisa adicionar os campos grupoNome e unidadeNome
    funcionariosComBatidas = funcionarios.map(func => {
      const { grupo, unidade, ...funcSemRelacoes } = func;
      return {
        ...funcSemRelacoes,
        grupoId: grupo?.id || func.grupoId || null,
        grupoNome: grupo?.nome || null,
        unidadeId: unidade?.id || func.unidadeId || null,
        unidadeNome: unidade?.nome || null,
      };
    });
  }

  // Extrair grupos únicos dos funcionários
  const gruposMap = new Map<string, { id: string; nome: string }>();
  funcionariosComBatidas.forEach(func => {
    if (func.grupoId && func.grupoNome) {
      if (!gruposMap.has(func.grupoId)) {
        gruposMap.set(func.grupoId, {
          id: func.grupoId,
          nome: func.grupoNome,
        });
      }
    }
  });
  const gruposList = Array.from(gruposMap.values());

  // Para SUPERVISOR, SEMPRE retornar apenas as unidades do scope (nunca usar fallback)
  // Para outros roles, podemos usar fallback das unidades dos funcionários
  let unidadesRetorno = unidadesList;
  if (me.role === 'SUPERVISOR') {
    // Para supervisor, SEMPRE usar apenas unidadesList (que já vem do scope)
    // Nunca usar fallback baseado nos funcionários, pois pode incluir unidades extras
    unidadesRetorno = unidadesList;
    console.log(`[API] Retornando ${unidadesRetorno.length} unidades para supervisor (sem fallback)`);
  } else if (unidadesList.length === 0) {
    // Fallback: extrair unidades únicas dos funcionários (apenas para outros roles)
    const unidadesUnicas = new Map<string, { id: string; nome: string }>();
    funcionarios.forEach(f => {
      if (f.unidadeId && f.unidade?.nome) {
        if (!unidadesUnicas.has(f.unidadeId)) {
          unidadesUnicas.set(f.unidadeId, {
            id: f.unidadeId,
            nome: f.unidade.nome,
          });
        }
      }
    });
    unidadesRetorno = Array.from(unidadesUnicas.values());
  }

  console.log(`[API] Total de unidades retornadas: ${unidadesRetorno.length}`);
  console.log(`[API] Total de funcionários retornados: ${funcionariosComBatidas.length}`);

  return NextResponse.json({
    funcionarios: funcionariosComBatidas,
    unidades: unidadesRetorno,
    grupos: gruposList,
  });
}

