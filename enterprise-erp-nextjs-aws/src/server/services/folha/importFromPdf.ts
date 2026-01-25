import { prisma } from '@/lib/prisma';
import { normName, parseBRLToNumber } from '@/lib/utils/currency';

type ImportResult = {
  total: number;
  funcionarios: number;
  items: Array<{ nome: string; valor: number; funcionarioId: string }>;
  semUnidade: Array<{ nome: string; funcionarioId: string }>;
};

const EXPECTED_TOTAL = 69509.22;
const DATE_LANC = new Date('2025-08-06T00:00:00-03:00');
const COMPETENCIA = new Date('2025-07-01T00:00:00-03:00');

function almostEqual(a: number, b: number, tol = 0.01) {
  return Math.abs(a - b) <= tol;
}

export async function importFromPdf(
  buffer: Buffer,
  createdById: string
): Promise<ImportResult> {
  const pdf = (await import('pdf-parse')).default as any;
  const data = await pdf(buffer);
  const text = data.text || '';

  // Heurística: linhas com nome + valor ao fim
  const lines = text
    .split(/\r?\n/)
    .map((l: string) => l.replace(/\s{2,}/g, ' ').trim())
    .filter((s: string) => Boolean(s));

  const entries: Array<{ nome: string; valor: number }> = [];

  for (const l of lines) {
    const m = l.match(/^(.*?)\s+(R\$\s*)?([\d\.]+,\d{2})$/i);
    if (!m) continue;
    const nome = normName(m[1]);
    const valor = parseBRLToNumber(m[3]);
    if (!nome || !valor) continue;
    // ignora cabeçalhos óbvios
    if (/EMPREGADOS|TOTAL|SUBTOTAL|PAGAMENTOS|LIQUIDO/i.test(nome)) continue;
    entries.push({ nome, valor });
  }

  if (entries.length === 0) {
    throw new Error('Não foi possível extrair empregados do PDF');
  }

  const sum = entries.reduce((acc, it) => acc + it.valor, 0);
  if (!almostEqual(sum, EXPECTED_TOTAL)) {
    throw new Error('DIFERENÇA NO TOTAL DO PDF');
  }

  // IDs base
  const grupo = await prisma.grupo.findFirst({
    where: { nome: { contains: 'PROFARMA', mode: 'insensitive' } },
  });
  if (!grupo) throw new Error('Grupo PROFARMA não encontrado');

  const categoria = await prisma.categoria.findFirst({
    where: {
      nome: { startsWith: 'SALAR', mode: 'insensitive' },
      tipo: 'DESPESA',
    },
  });
  if (!categoria) throw new Error('Categoria Salário não encontrada');

  const result: ImportResult = {
    total: sum,
    funcionarios: 0,
    items: [],
    semUnidade: [],
  };

  await prisma.$transaction(async tx => {
    for (const { nome, valor } of entries) {
      const func = await (tx as any).funcionario.upsert({
        where: { nome },
        update: { grupoId: grupo.id },
        create: { nome, grupoId: grupo.id },
      });

      await (tx as any).movimento.create({
        data: {
          tipo: 'DESPESA',
          dataLanc: DATE_LANC,
          competencia: COMPETENCIA,
          descricao: `${nome} - FOLHA 07/2025 (Líquido)`,
          valor,
          valorAssinado: -valor,
          grupoId: grupo.id,
          categoriaId: categoria.id,
          funcionarioId: func.id,
          criadoPorId: createdById,
        },
      } as any);

      result.items.push({ nome, valor, funcionarioId: func.id });
      if (!func.unidadeId)
        result.semUnidade.push({ nome, funcionarioId: func.id });
    }
  });

  result.funcionarios = result.items.length;
  // compat alias
  return Object.assign({ itensSemUnidade: result.semUnidade }, result);
}
