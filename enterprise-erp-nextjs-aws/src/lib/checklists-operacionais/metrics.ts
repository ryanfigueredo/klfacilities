import { prisma } from '@/lib/prisma';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(base: Date, amount: number): Date {
  const year = base.getFullYear();
  const month = base.getMonth() + amount;
  return new Date(year, month, base.getDate());
}

export interface ChecklistDashboardMetrics {
  totalRespostas: number;
  totalUnidadesAvaliadas: number;
  totalSupervisoresAtivos: number;
  respostasPorTemplate: Array<{
    templateId: string;
    titulo: string;
    total: number;
  }>;
  rankingSupervisores: Array<{
    supervisorId: string;
    nome: string;
    totalRespostas: number;
    unidadesAvaliadas: number;
  }>;
  seriesMensal: Array<{
    mes: string;
    total: number;
  }>;
  // Métricas de não conformidade
  totalNaoConformidades: number;
  naoConformidadesResolvidas: number;
  taxaConformidade: number; // Percentual (0-100)
  naoConformidadesPorTemplate: Array<{
    templateId: string;
    titulo: string;
    total: number;
    resolvidas: number;
  }>;
  topPerguntasNaoConformes: Array<{
    perguntaId: string;
    titulo: string;
    templateTitulo: string;
    total: number;
    resolvidas: number;
  }>;
  // Métricas de pontuação
  pontuacaoMedia: number; // Média geral de todas as notas (1-5)
  pontuacaoPorTemplate: Array<{
    templateId: string;
    titulo: string;
    media: number;
    totalAvaliacoes: number;
  }>;
  pontuacaoPorUnidade: Array<{
    unidadeId: string;
    unidadeNome: string;
    media: number;
    totalAvaliacoes: number;
  }>;
}

interface ComputeMetricsOptions {
  grupoIds?: string[];
  unidadeId?: string;
}

export async function computeChecklistDashboardMetrics(
  options: ComputeMetricsOptions = {}
): Promise<ChecklistDashboardMetrics> {
  const { grupoIds, unidadeId } = options;

  // Construir filtros base
  const baseWhere: any = { status: 'CONCLUIDO' };

  // Aplicar filtro de grupo
  if (grupoIds && grupoIds.length > 0) {
    baseWhere.grupoId = { in: grupoIds };
  }

  // Aplicar filtro de unidade
  if (unidadeId) {
    baseWhere.unidadeId = unidadeId;
  }

  const [totalRespostas, resumoPorTemplate, rankingPorSupervisor] = await Promise.all([
    prisma.checklistResposta.count({
      where: baseWhere,
    }),
    prisma.checklistResposta.groupBy({
      by: ['templateId'],
      _count: { templateId: true },
      where: baseWhere,
    }),
    prisma.checklistResposta.groupBy({
      by: ['supervisorId'],
      _count: { supervisorId: true },
      where: baseWhere,
    }),
  ]);

  const templateIds = resumoPorTemplate.map(item => item.templateId);
  const supervisorIds = rankingPorSupervisor.map(item => item.supervisorId).filter(Boolean) as string[];

  const [templates, supervisors] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, titulo: true },
    }),
    supervisorIds.length
      ? prisma.user.findMany({
          where: { id: { in: supervisorIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const templateLabelMap = new Map(templates.map(template => [template.id, template.titulo]));
  const supervisorNameMap = new Map(supervisors.map(user => [user.id, user.name]));

  const respostasPorTemplate = resumoPorTemplate
    .map(item => ({
      templateId: item.templateId,
      titulo: templateLabelMap.get(item.templateId) ?? 'Sem título',
      total: item._count.templateId,
    }))
    .sort((a, b) => b.total - a.total);

  const rankingSupervisores = await Promise.all(
    rankingPorSupervisor.map(async item => {
      if (!item.supervisorId) {
        return null;
      }
      const unidadesWhere: any = {
        supervisorId: item.supervisorId,
        status: 'CONCLUIDO',
      };

      // Aplicar mesmos filtros
      if (grupoIds && grupoIds.length > 0) {
        unidadesWhere.grupoId = { in: grupoIds };
      }
      if (unidadeId) {
        unidadesWhere.unidadeId = unidadeId;
      }

      const unidades = await prisma.checklistResposta.groupBy({
        by: ['unidadeId'],
        where: unidadesWhere,
        _count: { unidadeId: true },
      });
      return {
        supervisorId: item.supervisorId,
        nome: supervisorNameMap.get(item.supervisorId) ?? 'Supervisor',
        totalRespostas: item._count.supervisorId,
        unidadesAvaliadas: unidades.length,
      };
    })
  );

  const rankingOrdenado = rankingSupervisores
    .filter(Boolean)
    .sort((a, b) => (b as any).totalRespostas - (a as any).totalRespostas)
    .slice(0, 6) as ChecklistDashboardMetrics['rankingSupervisores'];

  const agora = new Date();
  const inicioSerie = addMonths(startOfMonth(agora), -5);

  const seriesWhere: any = {
    status: 'CONCLUIDO',
    createdAt: {
      gte: inicioSerie,
      lt: addMonths(startOfMonth(agora), 1),
    },
  };

  // Aplicar mesmos filtros
  if (grupoIds && grupoIds.length > 0) {
    seriesWhere.grupoId = { in: grupoIds };
  }
  if (unidadeId) {
    seriesWhere.unidadeId = unidadeId;
  }

  const series = await prisma.checklistResposta.groupBy({
    by: ['createdAt'],
    where: seriesWhere,
    _count: { createdAt: true },
  });

  const seriesMensalMap = new Map<string, number>();
  series.forEach(item => {
    const mes = startOfMonth(item.createdAt).toISOString().slice(0, 7);
    seriesMensalMap.set(mes, (seriesMensalMap.get(mes) ?? 0) + item._count.createdAt);
  });

  const seriesMensal: ChecklistDashboardMetrics['seriesMensal'] = [];
  for (let i = 0; i < 6; i++) {
    const periodo = addMonths(inicioSerie, i);
    const chave = periodo.toISOString().slice(0, 7);
    seriesMensal.push({
      mes: chave,
      total: seriesMensalMap.get(chave) ?? 0,
    });
  }

  const unidadesAvaliadasWhere: any = { status: 'CONCLUIDO' };

  // Aplicar mesmos filtros
  if (grupoIds && grupoIds.length > 0) {
    unidadesAvaliadasWhere.grupoId = { in: grupoIds };
  }
  if (unidadeId) {
    unidadesAvaliadasWhere.unidadeId = unidadeId;
  }

  const totalUnidadesAvaliadas = await prisma.checklistResposta.groupBy({
    by: ['unidadeId'],
    where: unidadesAvaliadasWhere,
    _count: { unidadeId: true },
  });

  // Calcular métricas de não conformidade
  // Buscar todas as respostas de perguntas com não conformidade
  const respostaWhereNaoConforme: any = {
    status: 'CONCLUIDO',
  };

  // Aplicar mesmos filtros
  if (grupoIds && grupoIds.length > 0) {
    respostaWhereNaoConforme.grupoId = { in: grupoIds };
  }
  if (unidadeId) {
    respostaWhereNaoConforme.unidadeId = unidadeId;
  }

  const respostasNaoConformes = await prisma.checklistRespostaPergunta.findMany({
    where: {
      valorBoolean: false, // Não Conforme
      resposta: respostaWhereNaoConforme,
    },
    select: {
      id: true,
      perguntaId: true,
      observacao: true,
      resposta: {
        select: {
          templateId: true,
        },
      },
    },
  });

  const totalNaoConformidades = respostasNaoConformes.length;
  const naoConformidadesResolvidas = respostasNaoConformes.filter(
    r => r.observacao && r.observacao.includes('O que foi feito para resolver')
  ).length;

  // Calcular taxa de conformidade
  // Total de respostas booleanas (Conforme + Não Conforme)
  const totalRespostasBooleanas = await prisma.checklistRespostaPergunta.count({
    where: {
      valorBoolean: { not: null },
      resposta: baseWhere,
    },
  });

  const totalConformes = totalRespostasBooleanas - totalNaoConformidades;
  const taxaConformidade =
    totalRespostasBooleanas > 0
      ? Math.round((totalConformes / totalRespostasBooleanas) * 100)
      : 100;

  // Não conformidades por template
  const templateIdsComNaoConformidade = new Set(
    respostasNaoConformes.map(r => r.resposta.templateId)
  );

  const naoConformidadesPorTemplate = await Promise.all(
    Array.from(templateIdsComNaoConformidade).map(async templateId => {
      const template = await prisma.checklistTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, titulo: true },
      });

      const naoConformesTemplate = respostasNaoConformes.filter(
        r => r.resposta.templateId === templateId
      );
      const resolvidasTemplate = naoConformesTemplate.filter(
        r => r.observacao && r.observacao.includes('O que foi feito para resolver')
      ).length;

      return {
        templateId,
        titulo: template?.titulo ?? 'Sem título',
        total: naoConformesTemplate.length,
        resolvidas: resolvidasTemplate,
      };
    })
  );

  // Top perguntas com mais não conformidades
  const perguntasNaoConformesMap = new Map<string, number>();
  const perguntasResolvidasMap = new Map<string, number>();
  const perguntaTemplateMap = new Map<string, string>();

  for (const resposta of respostasNaoConformes) {
    const count = perguntasNaoConformesMap.get(resposta.perguntaId) ?? 0;
    perguntasNaoConformesMap.set(resposta.perguntaId, count + 1);

    if (resposta.observacao && resposta.observacao.includes('O que foi feito para resolver')) {
      const resolvidasCount = perguntasResolvidasMap.get(resposta.perguntaId) ?? 0;
      perguntasResolvidasMap.set(resposta.perguntaId, resolvidasCount + 1);
    }

    if (!perguntaTemplateMap.has(resposta.perguntaId)) {
      perguntaTemplateMap.set(resposta.perguntaId, resposta.resposta.templateId);
    }
  }

  const perguntaIds = Array.from(perguntasNaoConformesMap.keys());
  const perguntas = await prisma.checklistPerguntaTemplate.findMany({
    where: { id: { in: perguntaIds } },
    select: { id: true, titulo: true },
  });

  const templatesParaPerguntas = await prisma.checklistTemplate.findMany({
    where: {
      id: { in: Array.from(new Set(perguntaTemplateMap.values())) },
    },
    select: { id: true, titulo: true },
  });

  const templateMap = new Map(templatesParaPerguntas.map(t => [t.id, t.titulo]));

  const topPerguntasNaoConformes = perguntas
    .map(pergunta => ({
      perguntaId: pergunta.id,
      titulo: pergunta.titulo,
      templateTitulo: templateMap.get(perguntaTemplateMap.get(pergunta.id) ?? '') ?? 'Sem template',
      total: perguntasNaoConformesMap.get(pergunta.id) ?? 0,
      resolvidas: perguntasResolvidasMap.get(pergunta.id) ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Calcular métricas de pontuação (notas 1-5)
  const notasWhere: any = {
    nota: { not: null },
    resposta: baseWhere,
  };

  const respostasComNotas = await prisma.checklistRespostaPergunta.findMany({
    where: notasWhere,
    select: {
      nota: true,
      resposta: {
        select: {
          templateId: true,
          unidadeId: true,
        },
      },
    },
  });

  // Calcular pontuação média geral
  const notasValidas = respostasComNotas
    .map(r => r.nota)
    .filter((nota): nota is number => nota !== null && nota !== undefined);
  const pontuacaoMedia =
    notasValidas.length > 0
      ? notasValidas.reduce((sum, nota) => sum + nota, 0) / notasValidas.length
      : 0;

  // Pontuação por template
  const notasPorTemplateMap = new Map<string, number[]>();
  const templateIdsComNotas = new Set<string>();

  respostasComNotas.forEach(resposta => {
    if (resposta.nota !== null && resposta.nota !== undefined) {
      const templateId = resposta.resposta.templateId;
      templateIdsComNotas.add(templateId);
      const notas = notasPorTemplateMap.get(templateId) ?? [];
      notas.push(resposta.nota);
      notasPorTemplateMap.set(templateId, notas);
    }
  });

  const templatesComNotas = await prisma.checklistTemplate.findMany({
    where: { id: { in: Array.from(templateIdsComNotas) } },
    select: { id: true, titulo: true },
  });

  const templateNotaMap = new Map(templatesComNotas.map(t => [t.id, t.titulo]));

  const pontuacaoPorTemplate = Array.from(notasPorTemplateMap.entries())
    .map(([templateId, notas]) => ({
      templateId,
      titulo: templateNotaMap.get(templateId) ?? 'Sem título',
      media: notas.reduce((sum, nota) => sum + nota, 0) / notas.length,
      totalAvaliacoes: notas.length,
    }))
    .sort((a, b) => b.media - a.media);

  // Pontuação por unidade
  const notasPorUnidadeMap = new Map<string, number[]>();
  const unidadeIdsComNotas = new Set<string>();

  respostasComNotas.forEach(resposta => {
    if (resposta.nota !== null && resposta.nota !== undefined && resposta.resposta.unidadeId) {
      const unidadeId = resposta.resposta.unidadeId;
      unidadeIdsComNotas.add(unidadeId);
      const notas = notasPorUnidadeMap.get(unidadeId) ?? [];
      notas.push(resposta.nota);
      notasPorUnidadeMap.set(unidadeId, notas);
    }
  });

  const unidadesComNotas = await prisma.unidade.findMany({
    where: { id: { in: Array.from(unidadeIdsComNotas) } },
    select: { id: true, nome: true },
  });

  const unidadeNomeMap = new Map(unidadesComNotas.map(u => [u.id, u.nome]));

  const pontuacaoPorUnidade = Array.from(notasPorUnidadeMap.entries())
    .map(([unidadeId, notas]) => ({
      unidadeId,
      unidadeNome: unidadeNomeMap.get(unidadeId) ?? 'Sem nome',
      media: notas.reduce((sum, nota) => sum + nota, 0) / notas.length,
      totalAvaliacoes: notas.length,
    }))
    .sort((a, b) => b.media - a.media)
    .slice(0, 10); // Top 10 unidades

  return {
    totalRespostas,
    totalUnidadesAvaliadas: totalUnidadesAvaliadas.length,
    totalSupervisoresAtivos: rankingSupervisores.filter(Boolean).length,
    respostasPorTemplate,
    rankingSupervisores: rankingOrdenado,
    seriesMensal,
    // Métricas de não conformidade
    totalNaoConformidades,
    naoConformidadesResolvidas,
    taxaConformidade,
    naoConformidadesPorTemplate: naoConformidadesPorTemplate.sort((a, b) => b.total - a.total),
    topPerguntasNaoConformes,
    // Métricas de pontuação
    pontuacaoMedia: Math.round(pontuacaoMedia * 10) / 10, // Arredondar para 1 decimal
    pontuacaoPorTemplate,
    pontuacaoPorUnidade,
  };
}


