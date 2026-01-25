import { NextRequest, NextResponse } from 'next/server';
import { ChecklistRespostaStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { getSupervisorScope } from '@/lib/supervisor-scope';

export async function GET(request: NextRequest) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');
  const unidadeId = searchParams.get('unidadeId');
  const grupoId = searchParams.get('grupoId');
  const mes = searchParams.get('mes'); // formato: YYYY-MM
  const ano = searchParams.get('ano'); // formato: YYYY

  if (!templateId) {
    return NextResponse.json(
      { error: 'validation_error', message: 'templateId é obrigatório' },
      { status: 422 }
    );
  }

  // Verificar escopo do supervisor
  let unidadeIds: string[] = [];
    if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
    const scope = await getSupervisorScope(me.id);
    unidadeIds = scope.unidadeIds;
    if (unidadeIds.length === 0) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Sem unidades no escopo' },
        { status: 403 }
      );
    }
  }

  try {
    // Calcular período
    let dataInicio: Date;
    let dataFim: Date;

    if (mes) {
      // Se fornecido mês específico (YYYY-MM)
      const [year, month] = mes.split('-').map(Number);
      dataInicio = new Date(year, month - 1, 1);
      dataFim = new Date(year, month, 0, 23, 59, 59, 999);
    } else if (ano) {
      // Se fornecido apenas ano
      dataInicio = new Date(Number(ano), 0, 1);
      dataFim = new Date(Number(ano), 11, 31, 23, 59, 59, 999);
    } else {
      // Mês atual por padrão
      const now = new Date();
      dataInicio = new Date(now.getFullYear(), now.getMonth(), 1);
      dataFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Buscar template com perguntas e pesos
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: {
        grupos: {
          orderBy: { ordem: 'asc' },
          include: {
            perguntas: {
              orderBy: { ordem: 'asc' },
            },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Construir filtros
    const where: any = {
      templateId,
      status: ChecklistRespostaStatus.CONCLUIDO,
      submittedAt: {
        gte: dataInicio,
        lte: dataFim,
      },
    };

    if (unidadeId) {
      where.unidadeId = unidadeId;
    } else if ((me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') && unidadeIds.length > 0) {
      where.unidadeId = { in: unidadeIds };
    }

    if (grupoId) {
      where.grupoId = grupoId;
    }

    // Buscar respostas do período
    const respostas = await prisma.checklistResposta.findMany({
      where,
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
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        respostas: {
          include: {
            pergunta: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Calcular estatísticas agregadas
    const estatisticas = {
      totalRespostas: respostas.length,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: dataFim.toISOString(),
      },
      porUnidade: {} as Record<
        string,
        {
          nome: string;
          totalRespostas: number;
          pontuacaoMedia: number;
          pontuacaoTotal: number;
          perguntasComNota: number;
        }
      >,
      porGrupo: {} as Record<
        string,
        {
          nome: string;
          totalRespostas: number;
          pontuacaoMedia: number;
          pontuacaoTotal: number;
        }
      >,
      porSecao: {} as Record<
        string,
        {
          titulo: string;
          totalPerguntas: number;
          perguntasComNota: number;
          pontuacaoMedia: number;
          pontuacaoTotal: number;
          pesoTotal: number;
        }
      >,
      porPergunta: {} as Record<
        string,
        {
          titulo: string;
          secao: string;
          peso: number | null;
          totalRespostas: number;
          respostasComNota: number;
          pontuacaoMedia: number;
          pontuacaoTotal: number;
          distribuicaoNotas: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
          };
        }
      >,
      pontuacaoGeral: {
        media: 0,
        total: 0,
        pontuacaoTotal: 0,
        perguntasComNota: 0,
        pesoTotal: 0,
      },
    };

    // Processar cada resposta
    for (const resposta of respostas) {
      const unidadeNome = resposta.unidade.nome;
      const grupoNome = resposta.grupo?.nome || 'Sem grupo';

      // Inicializar estruturas se necessário
      if (!estatisticas.porUnidade[resposta.unidadeId]) {
        estatisticas.porUnidade[resposta.unidadeId] = {
          nome: unidadeNome,
          totalRespostas: 0,
          pontuacaoMedia: 0,
          pontuacaoTotal: 0,
          perguntasComNota: 0,
        };
      }

      if (!estatisticas.porGrupo[resposta.grupoId || 'sem-grupo']) {
        estatisticas.porGrupo[resposta.grupoId || 'sem-grupo'] = {
          nome: grupoNome,
          totalRespostas: 0,
          pontuacaoMedia: 0,
          pontuacaoTotal: 0,
        };
      }

      estatisticas.porUnidade[resposta.unidadeId].totalRespostas++;
      estatisticas.porGrupo[resposta.grupoId || 'sem-grupo'].totalRespostas++;

      // Processar cada resposta de pergunta
      for (const respostaPergunta of resposta.respostas) {
        const pergunta = respostaPergunta.pergunta;
        const grupoPergunta = template.grupos.find(g =>
          g.perguntas.some(p => p.id === pergunta.id)
        );

        if (!grupoPergunta) continue;

        const secaoId = grupoPergunta.id;
        const secaoTitulo = grupoPergunta.titulo;
        const perguntaId = pergunta.id;

        // Inicializar seção
        if (!estatisticas.porSecao[secaoId]) {
          estatisticas.porSecao[secaoId] = {
            titulo: secaoTitulo,
            totalPerguntas: grupoPergunta.perguntas.length,
            perguntasComNota: 0,
            pontuacaoMedia: 0,
            pontuacaoTotal: 0,
            pesoTotal: 0,
          };
        }

        // Inicializar pergunta
        if (!estatisticas.porPergunta[perguntaId]) {
          estatisticas.porPergunta[perguntaId] = {
            titulo: pergunta.titulo,
            secao: secaoTitulo,
            peso: pergunta.peso,
            totalRespostas: 0,
            respostasComNota: 0,
            pontuacaoMedia: 0,
            pontuacaoTotal: 0,
            distribuicaoNotas: {
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0,
            },
          };
        }

        estatisticas.porPergunta[perguntaId].totalRespostas++;

        // Se a pergunta tem nota
        if (respostaPergunta.nota !== null && respostaPergunta.nota !== undefined) {
          const nota = respostaPergunta.nota;
          const peso = pergunta.peso || 1;

          // Atualizar distribuição de notas
          if (nota >= 1 && nota <= 5) {
            estatisticas.porPergunta[perguntaId].distribuicaoNotas[
              nota as keyof typeof estatisticas.porPergunta[string]['distribuicaoNotas']
            ]++;
          }

          // Calcular pontuação ponderada (nota * peso)
          const pontuacao = nota * peso;

          estatisticas.porPergunta[perguntaId].respostasComNota++;
          estatisticas.porPergunta[perguntaId].pontuacaoTotal += pontuacao;

          estatisticas.porSecao[secaoId].perguntasComNota++;
          estatisticas.porSecao[secaoId].pontuacaoTotal += pontuacao;
          estatisticas.porSecao[secaoId].pesoTotal += peso;

          estatisticas.porUnidade[resposta.unidadeId].pontuacaoTotal += pontuacao;
          estatisticas.porUnidade[resposta.unidadeId].perguntasComNota++;

          estatisticas.pontuacaoGeral.pontuacaoTotal += pontuacao;
          estatisticas.pontuacaoGeral.pesoTotal += peso;
          estatisticas.pontuacaoGeral.perguntasComNota++;
        }
      }
    }

    // Calcular médias
    for (const perguntaId in estatisticas.porPergunta) {
      const pergunta = estatisticas.porPergunta[perguntaId];
      if (pergunta.respostasComNota > 0) {
        pergunta.pontuacaoMedia =
          pergunta.pontuacaoTotal / pergunta.respostasComNota;
      }
    }

    for (const secaoId in estatisticas.porSecao) {
      const secao = estatisticas.porSecao[secaoId];
      if (secao.pesoTotal > 0) {
        secao.pontuacaoMedia = secao.pontuacaoTotal / secao.pesoTotal;
      }
    }

    for (const unidadeId in estatisticas.porUnidade) {
      const unidade = estatisticas.porUnidade[unidadeId];
      if (unidade.perguntasComNota > 0) {
        unidade.pontuacaoMedia =
          unidade.pontuacaoTotal / unidade.perguntasComNota;
      }
    }

    if (estatisticas.pontuacaoGeral.pesoTotal > 0) {
      estatisticas.pontuacaoGeral.media =
        estatisticas.pontuacaoGeral.pontuacaoTotal /
        estatisticas.pontuacaoGeral.pesoTotal;
    }
    estatisticas.pontuacaoGeral.total = estatisticas.pontuacaoGeral.pontuacaoTotal;

    return NextResponse.json({
      template: {
        id: template.id,
        titulo: template.titulo,
        descricao: template.descricao,
      },
      estatisticas,
      respostas: respostas.map(r => ({
        id: r.id,
        protocolo: r.protocolo,
        unidade: r.unidade,
        grupo: r.grupo,
        supervisor: r.supervisor,
        submittedAt: r.submittedAt,
        totalPerguntas: r.respostas.length,
        perguntasComNota: r.respostas.filter(rp => rp.nota !== null).length,
      })),
    });
  } catch (error) {
    console.error('Erro ao gerar relatório mensal:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível gerar o relatório',
      },
      { status: 500 }
    );
  }
}

