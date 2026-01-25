import { prisma } from '@/lib/prisma';
import { getCompetencia } from '@/lib/date/competencia';
import type {
  ProvisionamentoCreateInput,
  ProvisionamentoFilters,
  ProvisionamentoUpdateInput,
  MarcarPagoInput,
} from '@/server/schemas/provisionamento.schema';

export async function listProvisionamentos(filters: ProvisionamentoFilters) {
  const {
    status,
    from,
    to,
    grupoId,
    unidadeId,
    q,
    page = 1,
    pageSize = 50,
  } = filters || {};

  const where: any = {};
  if (status) where.status = status;
  if (from || to) where.dataVenc = { gte: from, lte: to };
  if (grupoId) where.grupoId = grupoId;
  if (unidadeId) where.unidadeId = unidadeId;
  if ((filters as any)?.categoriaId)
    (where as any).categoriaId = (filters as any).categoriaId;
  if (q) where.descricao = { contains: q, mode: 'insensitive' };

  const [total, rows] = await prisma.$transaction([
    prisma.provisionamento.count({ where }),
    prisma.provisionamento.findMany({
      where,
      orderBy: [{ dataVenc: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        movimento: { select: { id: true } },
      },
    } as any),
  ]);
  return { total, rows, page, pageSize };
}

export async function createProvisionamento(input: ProvisionamentoCreateInput) {
  if (!input.descricao?.trim()) throw new Error('Descrição é obrigatória');
  if (!(Number(input.valor) > 0)) throw new Error('Valor deve ser > 0');
  if (!input.dataVenc) throw new Error('dataVenc é obrigatória');
  
  // Se competencia não foi informada, usa dataVenc (regra contábil padrão)
  const competencia = input.competencia || input.dataVenc;
  
  return prisma.provisionamento.create({ 
    data: { ...input, competencia } as any 
  } as any);
}

export async function updateProvisionamento(
  id: string,
  input: ProvisionamentoUpdateInput
) {
  return prisma.provisionamento.update({ where: { id }, data: input } as any);
}

export async function deleteProvisionamento(id: string) {
  const prov = await prisma.provisionamento.findUnique({ where: { id } });
  if (!prov) return;
  if (prov.status === 'EFETIVADO')
    throw new Error('Não é possível excluir EFETIVADO');
  await prisma.provisionamento.delete({ where: { id } });
}

export async function marcarComoPago(
  id: string,
  input: MarcarPagoInput,
  createdById?: string
) {
  return prisma.$transaction(async tx => {
    const prov = await tx.provisionamento.findUnique({ where: { id } });
    if (!prov) throw new Error('Provisionamento não encontrado');
    // Idempotência: se já não estiver pendente, retorne o movimento existente
    if (prov.status !== 'PENDENTE') {
      if ((prov as any).movimentoId) {
        return tx.movimento.findUnique({
          where: { id: (prov as any).movimentoId },
        } as any);
      }
      throw new Error('Somente PENDENTE pode ser pago');
    }

    const dataPgto = input.dataPgto ?? new Date();
    // Usa a competência do provisionamento ou calcula pela data de pagamento
    const competenciaProv = prov.competencia 
      ? getCompetencia(prov.competencia as any)
      : getCompetencia(dataPgto);

    const movimento = await tx.movimento.create({
      data: {
        tipo: prov.tipo as any,
        dataLanc: dataPgto as any,
        competencia: competenciaProv as any,
        // Não prefixar descrição com PROV -
        descricao: String((prov as any).descricao || ''),
        grupoId: prov.grupoId ?? null,
        unidadeId: prov.unidadeId ?? null,
        categoriaId: prov.categoriaId ?? null,
        categoria: undefined,
        subcategoria: undefined,
        centroCusto: undefined,
        documento: prov.documento ?? null,
        formaPagamento: input.formaPagamento ?? prov.formaPagamento ?? null,
        valor: prov.valor as any,
        valorAssinado: (prov.tipo === 'DESPESA' ? -1 : 1) * Number(prov.valor) as any,
        criadoPorId: createdById as any,
      },
    } as any);

    await tx.provisionamento.update({
      where: { id },
      data: {
        status: 'EFETIVADO',
        dataPgto,
        contaId: input.contaId ?? prov.contaId ?? null,
        formaPagamento: input.formaPagamento ?? prov.formaPagamento ?? null,
        movimentoId: movimento.id,
      },
    } as any);

    return movimento;
  });
}

export async function getProvisionamentoAlertsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const [vencidos, venceHoje, items] = await Promise.all([
    prisma.provisionamento.count({
      where: { status: 'PENDENTE', dataVenc: { lt: start } },
    } as any),
    prisma.provisionamento.count({
      where: { status: 'PENDENTE', dataVenc: { gte: start, lte: end } },
    } as any),
    prisma.provisionamento.findMany({
      where: { status: 'PENDENTE', dataVenc: { gte: start, lte: end } },
      orderBy: { dataVenc: 'asc' },
      take: 10,
      select: {
        id: true,
        descricao: true,
        dataVenc: true,
        valor: true,
        unidadeId: true,
        grupoId: true,
      },
    } as any),
  ]);

  return {
    vencidos,
    venceHoje,
    items: items.map(i => ({
      ...i,
      dataVenc: (i as any).dataVenc.toISOString(),
      valor: Number((i as any).valor),
    })),
  };
}
