import { prisma } from '@/lib/prisma';
import { getCompetencia } from '@/lib/date/competencia';
import type {
  ProvisionamentoTemplateCreateInput,
  ProvisionamentoTemplateFilters,
  ProvisionamentoTemplateUpdateInput,
} from '@/server/schemas/provisionamento-template.schema';
import { addMonths, addWeeks, addDays, startOfMonth, setDate, addYears } from 'date-fns';

export async function listProvisionamentoTemplates(
  filters: ProvisionamentoTemplateFilters
) {
  const { ativo, tipo, grupoId, unidadeId, q } = filters || {};

  const where: any = {};
  if (ativo !== undefined) where.ativo = ativo;
  if (tipo) where.tipo = tipo;
  if (grupoId) where.grupoId = grupoId;
  if (unidadeId) where.unidadeId = unidadeId;
  if (q) where.OR = [
    { nome: { contains: q, mode: 'insensitive' } },
    { descricao: { contains: q, mode: 'insensitive' } },
  ];

  const rows = await prisma.provisionamentoTemplate.findMany({
    where,
    orderBy: [{ nome: 'asc' }],
    include: {
      grupo: { select: { nome: true } },
      unidade: { select: { nome: true } },
      categoria: { select: { nome: true } },
    },
  } as any);

  return { rows };
}

export async function createProvisionamentoTemplate(
  input: ProvisionamentoTemplateCreateInput
) {
  if (!input.nome?.trim()) throw new Error('Nome é obrigatório');
  if (!input.descricao?.trim()) throw new Error('Descrição é obrigatória');
  if (!(Number(input.valor) > 0)) throw new Error('Valor deve ser > 0');

  return prisma.provisionamentoTemplate.create({
    data: {
      ...input,
      dataInicio: input.dataInicio || new Date(),
    } as any,
  } as any);
}

export async function updateProvisionamentoTemplate(
  id: string,
  input: ProvisionamentoTemplateUpdateInput
) {
  return prisma.provisionamentoTemplate.update({
    where: { id },
    data: input as any,
  } as any);
}

export async function deleteProvisionamentoTemplate(id: string) {
  const template = await prisma.provisionamentoTemplate.findUnique({
    where: { id },
  });
  if (!template) return;

  // Verificar se há provisões geradas por este template
  const count = await prisma.provisionamento.count({
    where: { templateId: id, status: 'PENDENTE' },
  } as any);

  if (count > 0) {
    throw new Error(
      `Não é possível excluir template com ${count} provisionamento(s) pendente(s). Cancele ou efetive as provisões primeiro.`
    );
  }

  await prisma.provisionamentoTemplate.delete({ where: { id } });
}

/**
 * Gera provisionamentos para um template baseado na periodicidade
 */
function calcularProximaData(
  dataBase: Date,
  periodicidade: string,
  diaVencimento: number
): Date {
  let proxima = new Date(dataBase);

  switch (periodicidade) {
    case 'MENSAL':
      proxima = addMonths(proxima, 1);
      break;
    case 'BIMESTRAL':
      proxima = addMonths(proxima, 2);
      break;
    case 'TRIMESTRAL':
      proxima = addMonths(proxima, 3);
      break;
    case 'SEMESTRAL':
      proxima = addMonths(proxima, 6);
      break;
    case 'ANUAL':
      proxima = addYears(proxima, 1);
      break;
    case 'QUINZENAL':
      proxima = addDays(proxima, 15);
      break;
    case 'SEMANAL':
      proxima = addWeeks(proxima, 1);
      break;
    default:
      proxima = addMonths(proxima, 1);
  }

  // Para periodicidades mensais ou maiores, definir o dia do mês
  if (['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].includes(periodicidade)) {
    proxima = setDate(proxima, Math.min(diaVencimento, 28)); // Limitar a 28 para evitar problemas com fevereiro
  }

  return proxima;
}

/**
 * Gera provisionamentos para todos os templates ativos até uma data futura
 */
export async function gerarProvisionamentos(
  ateData: Date = addMonths(new Date(), 3)
) {
  const templates = await prisma.provisionamentoTemplate.findMany({
    where: {
      ativo: true,
      OR: [
        { dataFim: null },
        { dataFim: { gte: new Date() } },
      ],
      dataInicio: { lte: ateData },
    },
  } as any);

  const gerados: any[] = [];
  const hoje = new Date();

  for (const template of templates) {
    // Calcular data base: última geração ou data início
    const dataBase = template.ultimaGeracao || template.dataInicio || hoje;
    let proximaData = calcularProximaData(
      dataBase as any,
      template.periodicidade,
      template.diaVencimento
    );

    // Gerar provisões até a data limite
    while (proximaData <= ateData) {
      // Verificar se já existe uma provisão para esta data
      const existe = await prisma.provisionamento.findFirst({
        where: {
          templateId: template.id,
          dataVenc: {
            gte: new Date(proximaData.getFullYear(), proximaData.getMonth(), proximaData.getDate()),
            lt: new Date(proximaData.getFullYear(), proximaData.getMonth(), proximaData.getDate() + 1),
          },
          status: { in: ['PENDENTE', 'EFETIVADO'] },
        },
      } as any);

      if (!existe) {
        // Competência = primeiro dia do mês de vencimento (princípio contábil)
        const competencia = getCompetencia(proximaData);
        const provisao = await prisma.provisionamento.create({
          data: {
            descricao: template.descricao,
            valor: template.valor as any,
            tipo: template.tipo as any,
            dataVenc: proximaData as any,
            competencia: competencia as any, // Campo obrigatório agora
            status: 'PENDENTE' as any,
            grupoId: template.grupoId,
            unidadeId: template.unidadeId,
            categoriaId: template.categoriaId,
            subcategoriaId: template.subcategoriaId,
            centroCustoId: template.centroCustoId,
            contaId: template.contaId,
            formaPagamento: template.formaPagamento,
            documento: template.documento,
            obs: template.obs,
            templateId: template.id,
          },
        } as any);
        gerados.push(provisao);
      }

      // Atualizar última geração do template
      await prisma.provisionamentoTemplate.update({
        where: { id: template.id },
        data: { ultimaGeracao: proximaData as any },
      } as any);

      proximaData = calcularProximaData(
        proximaData,
        template.periodicidade,
        template.diaVencimento
      );
    }
  }

  return { gerados: gerados.length, templates: templates.length };
}

