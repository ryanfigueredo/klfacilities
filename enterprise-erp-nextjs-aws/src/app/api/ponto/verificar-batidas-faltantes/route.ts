import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';
import { evolutionAPIService } from '@/lib/evolution-api-whatsapp';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { logWhatsAppMessage } from '@/lib/message-logs';

/**
 * Verifica batidas faltantes e envia notificações para supervisores
 *
 * Batidas faltantes:
 * - Entrada sem saída no mesmo dia
 * - Falta de entrada em dia que não é folga
 *
 * Executar periodicamente (ex: a cada hora ou no final do dia)
 */
export async function POST(req: NextRequest) {
  try {
    const hoje = new Date();
    const hojeBrasilia = toZonedTime(hoje, 'America/Sao_Paulo');
    const diaSemana = hojeBrasilia.getDay(); // 0=Domingo, 1=Segunda, etc.

    // Início e fim do dia em Brasília
    const inicioDia = new Date(hojeBrasilia);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(hojeBrasilia);
    fimDia.setHours(23, 59, 59, 999);

    // Converter para UTC para buscar no banco
    const inicioDiaUTC = new Date(
      inicioDia.getTime() - inicioDia.getTimezoneOffset() * 60000
    );
    const fimDiaUTC = new Date(
      fimDia.getTime() - fimDia.getTimezoneOffset() * 60000
    );

    // Buscar todos os funcionários com unidade vinculada
    const funcionarios = await prisma.funcionario.findMany({
      where: {
        unidadeId: { not: null },
      },
      include: {
        unidade: true,
        grupo: true,
      },
    });

    // Buscar supervisores por unidade
    const unidadesIds = funcionarios
      .map(f => f.unidadeId)
      .filter(Boolean) as string[];
    const supervisorScopes = await prisma.supervisorScope.findMany({
      where: {
        OR: [
          { unidadeId: { in: unidadesIds } },
          { grupoId: { in: funcionarios.map(f => f.grupoId) } },
        ],
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
      },
    });

    // Mapear supervisores por unidade
    const supervisorPorUnidade = new Map<string, any>();
    for (const scope of supervisorScopes) {
      if (scope.unidadeId) {
        supervisorPorUnidade.set(scope.unidadeId, scope.supervisor);
      }
    }

    // Mapear supervisores por grupo (fallback)
    const supervisorPorGrupo = new Map<string, any>();
    for (const scope of supervisorScopes) {
      if (scope.grupoId && !supervisorPorGrupo.has(scope.grupoId)) {
        supervisorPorGrupo.set(scope.grupoId, scope.supervisor);
      }
    }

    const problemas: Array<{
      funcionario: any;
      tipo: 'ENTRADA_SEM_SAIDA' | 'FALTA_ENTRADA';
      mensagem: string;
      supervisor: any;
    }> = [];

    for (const func of funcionarios) {
      // Verificar se hoje é dia de folga
      if (func.diaFolga === diaSemana) {
        continue; // É folga, não precisa bater ponto
      }

      // Buscar batidas de hoje
      const batidasHoje = await prisma.registroPonto.findMany({
        where: {
          funcionarioId: func.id,
          timestamp: {
            gte: inicioDiaUTC,
            lte: fimDiaUTC,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      const temEntrada = batidasHoje.some(b => b.tipo === 'ENTRADA');
      const temSaida = batidasHoje.some(b => b.tipo === 'SAIDA');
      const horaAtual = hojeBrasilia.getHours();

      // Verificar problemas
      if (temEntrada && !temSaida) {
        // Entrada sem saída
        const entrada = batidasHoje.find(b => b.tipo === 'ENTRADA');
        const horasDesdeEntrada = Math.floor(
          (hoje.getTime() - entrada!.timestamp.getTime()) / (1000 * 60 * 60)
        );

        // Só alertar se já passou mais de 8 horas da entrada (ou se já passou das 18h)
        if (horasDesdeEntrada >= 8 || horaAtual >= 18) {
          // Buscar supervisor da unidade ou grupo
          const supervisor = func.unidadeId
            ? supervisorPorUnidade.get(func.unidadeId)
            : supervisorPorGrupo.get(func.grupoId);
          if (supervisor?.whatsapp) {
            problemas.push({
              funcionario: func,
              tipo: 'ENTRADA_SEM_SAIDA',
              mensagem:
                ` *Batida de Ponto Faltante*\n\n` +
                `O colaborador *${func.nome}* bateu entrada às ${entrada!.timestamp.toLocaleTimeString('pt-BR')} ` +
                `mas ainda não bateu saída.\n\n` +
                `*Unidade:* ${func.unidade?.nome}\n` +
                `*Grupo:* ${func.grupo?.nome}\n` +
                `*Horas desde entrada:* ${horasDesdeEntrada}h\n\n` +
                `Por favor, verifique se o colaborador esqueceu de bater o ponto.`,
              supervisor,
            });
          }
        }
      } else if (!temEntrada && horaAtual >= 10) {
        // Falta de entrada (só alertar após 10h da manhã)
        const supervisor = func.unidadeId
          ? supervisorPorUnidade.get(func.unidadeId)
          : supervisorPorGrupo.get(func.grupoId);
        if (supervisor?.whatsapp) {
          problemas.push({
            funcionario: func,
            tipo: 'FALTA_ENTRADA',
            mensagem:
              ` *Batida de Ponto Faltante*\n\n` +
              `O colaborador *${func.nome}* ainda não bateu entrada hoje.\n\n` +
              `*Unidade:* ${func.unidade?.nome}\n` +
              `*Grupo:* ${func.grupo?.nome}\n\n` +
              `Por favor, verifique se o colaborador está presente ou se há algum problema.`,
            supervisor,
          });
        }
      }
    }

    // Agrupar problemas por supervisor para enviar uma mensagem consolidada
    const problemasPorSupervisor = new Map<string, typeof problemas>();

    for (const problema of problemas) {
      const supervisorId = problema.supervisor.id;
      if (!problemasPorSupervisor.has(supervisorId)) {
        problemasPorSupervisor.set(supervisorId, []);
      }
      problemasPorSupervisor.get(supervisorId)!.push(problema);
    }

    // Enviar mensagens para cada supervisor
    const resultados = [];
    for (const [supervisorId, probs] of problemasPorSupervisor.entries()) {
      const supervisor = probs[0].supervisor;

      // Consolidar mensagem
      let mensagemConsolidada = `📋 *Relatório de Batidas Faltantes*\n\n`;
      mensagemConsolidada += `*Data:* ${hojeBrasilia.toLocaleDateString('pt-BR')}\n\n`;

      const entradaSemSaida = probs.filter(p => p.tipo === 'ENTRADA_SEM_SAIDA');
      const faltaEntrada = probs.filter(p => p.tipo === 'FALTA_ENTRADA');

      if (entradaSemSaida.length > 0) {
        mensagemConsolidada += `*Entrada sem Saída (${entradaSemSaida.length}):*\n`;
        entradaSemSaida.forEach(p => {
          mensagemConsolidada += `• ${p.funcionario.nome} - ${p.funcionario.unidade?.nome}\n`;
        });
        mensagemConsolidada += `\n`;
      }

      if (faltaEntrada.length > 0) {
        mensagemConsolidada += `*Falta de Entrada (${faltaEntrada.length}):*\n`;
        faltaEntrada.forEach(p => {
          mensagemConsolidada += `• ${p.funcionario.nome} - ${p.funcionario.unidade?.nome}\n`;
        });
        mensagemConsolidada += `\n`;
      }

      mensagemConsolidada += `Acesse o sistema para gerenciar os pontos manualmente se necessário.`;

      // Enviar WhatsApp
      try {
        const whatsappResult = await evolutionAPIService.sendMessage(
          supervisor.whatsapp,
          mensagemConsolidada
        );

        // Registrar log
        await logWhatsAppMessage({
          to: supervisor.whatsapp,
          message: mensagemConsolidada,
          messageId: whatsappResult.messageId || null,
          provider: 'evolution-api',
          success: whatsappResult.success,
          error: whatsappResult.error || null,
          context: 'ponto_faltante',
          contextId: null,
        });

        resultados.push({
          supervisor: supervisor.name,
          whatsapp: supervisor.whatsapp,
          problemas: probs.length,
          sucesso: whatsappResult.success,
        });
      } catch (error) {
        console.error(
          `Erro ao enviar WhatsApp para ${supervisor.name}:`,
          error
        );
        resultados.push({
          supervisor: supervisor.name,
          whatsapp: supervisor.whatsapp,
          problemas: probs.length,
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      sucesso: true,
      data: hojeBrasilia.toLocaleDateString('pt-BR'),
      problemasEncontrados: problemas.length,
      supervisoresNotificados: resultados.length,
      resultados,
    });
  } catch (error) {
    console.error('Erro ao verificar batidas faltantes:', error);
    return NextResponse.json(
      {
        erro: 'Erro ao verificar batidas faltantes',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
