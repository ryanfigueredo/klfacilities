import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Util: normaliza placa
function normalizePlaca(placaRaw: unknown): string | null {
  if (placaRaw == null) return null;
  const str = String(placaRaw).trim().toUpperCase();
  if (!str) return null;
  return str.replace(/[^A-Z0-9]/g, '');
}

// Util: converte número/pt-BR para float
function toFloat(value: unknown): number | null {
  if (value == null) return null;
  // If Excel already provides a numeric cell, keep the decimal separator
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // Remove spaces that may be used as thousands separators
  const noSpaces = raw.replace(/\s+/g, '');
  // pt-BR style: 1.234,56 → 1234.56 , 113,16 → 113.16
  const normalized = noSpaces.includes(',')
    ? noSpaces.replace(/\./g, '').replace(',', '.')
    : noSpaces;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

// Util: converte diferentes formatos de data do Excel para Date
function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    // Excel epoch starts at 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(value * 24 * 60 * 60 * 1000);
    return new Date(excelEpoch.getTime() + ms);
  }
  const str = String(value).trim();
  if (!str) return null;
  // Normaliza espaços duplicados
  const normalized = str.replace(/\s+/g, ' ');
  // Expectativa: dd/MM/yyyy HH:mm[:ss]
  const match = normalized.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (match) {
    const [, dd, MM, yyyy, HH, mm, ss] = match;
    const date = new Date(
      Number(yyyy),
      Number(MM) - 1,
      Number(dd),
      Number(HH),
      Number(mm),
      ss ? Number(ss) : 0
    );
    return date;
  }
  // Tenta parsear ISO
  const iso = new Date(normalized);
  return isNaN(iso.getTime()) ? null : iso;
}

// Util: normaliza código de transação (mantém apenas dígitos)
function normalizeTxCode(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const digits = str.replace(/\D+/g, "");
  return digits || null;
}

type ImportSummary = {
  processed: number;
  inserted: number;
  duplicates: number;
  invalid: number;
  notFoundVehicle: number;
  kmRecordsCreated: number;
  details: {
    row: number;
    placa?: string;
    reason: string;
  }[];
  insertedItems: {
    row: number;
    placa: string;
    data: string;
    litros: number;
    valor: number;
    kmAtual: number;
  }[];
};

type AbastecimentoValido = {
  rowNumber: number;
  txCode: string | null;
  dataTransacao: Date;
  placa: string;
  litros: number;
  kmAtual: number;
  valor: number;
  vehicleId: string;
};

export async function POST(req: NextRequest) {
  const me = await requireControleGasolinaAdmin();

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });
    }

    const summary: ImportSummary = {
      processed: 0,
      inserted: 0,
      duplicates: 0,
      invalid: 0,
      notFoundVehicle: 0,
      kmRecordsCreated: 0,
      details: [],
      insertedItems: [],
    };

    // Para dedupe local: set de chave "placa|timestamp"
    const seen = new Set<string>();
    // Dedupe local por código de transação
    const seenTx = new Set<string>();

    // Primeira passagem: coletar abastecimentos válidos
    const abastecimentosValidos: AbastecimentoValido[] = [];
    const vehicleMap = new Map<string, { id: string }>();

    // Começa na linha 2 assumindo cabeçalho
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      summary.processed++;

      // Colunas do XLSX (baseado no arquivo Ticket Log):
      // A: CODIGO TRANSACAO
      // E: DATA TRANSACAO
      // F: PLACA
      // O: LITROS
      // Q: KM ATUAL
      // T: VALOR
      const txCode = normalizeTxCode(row.getCell(1 /* A */).value as unknown);
      const dataTransacao = toDate(row.getCell(5 /* E */).value as unknown);
      const placa = normalizePlaca(row.getCell(6 /* F */).value as unknown);
      const litros = toFloat(row.getCell(15 /* O */).value as unknown);
      const kmAtual = toFloat(row.getCell(17 /* Q */).value as unknown);
      const valor = toFloat(row.getCell(20 /* T */).value as unknown);

      if (
        !dataTransacao ||
        !placa ||
        litros == null ||
        kmAtual == null ||
        valor == null
      ) {
        summary.invalid++;
        summary.details.push({
          row: rowNumber,
          placa: placa ?? undefined,
          reason: 'Dados obrigatórios ausentes/invalidos',
        });
        continue;
      }

      // Dedupe local por código
      if (txCode) {
        if (seenTx.has(txCode)) {
          summary.duplicates++;
          summary.details.push({
            row: rowNumber,
            placa,
            reason: 'Duplicado na própria planilha (mesmo CODIGO TRANSACAO)',
          });
          continue;
        }
        seenTx.add(txCode);
      }

      const key = `${placa}|${dataTransacao.getTime()}`;
      if (seen.has(key)) {
        summary.duplicates++;
        summary.details.push({
          row: rowNumber,
          placa,
          reason: 'Duplicado na própria planilha',
        });
        continue;
      }
      seen.add(key);

      // Buscar veículo (cache para evitar múltiplas queries)
      let vehicle = vehicleMap.get(placa);
      if (!vehicle) {
        const found = await prisma.vehicle.findUnique({ where: { placa } });
        if (!found) {
          summary.notFoundVehicle++;
          summary.details.push({
            row: rowNumber,
            placa,
            reason: 'Veículo não encontrado',
          });
          continue;
        }
        vehicle = { id: found.id };
        vehicleMap.set(placa, vehicle);
      }

      // Checa duplicidade já existente no BD:
      const exists = await prisma.fuelRecord.findFirst({
        where: txCode
          ? {
              veiculoId: vehicle.id,
              observacao: { contains: `TX:${txCode}` },
            }
          : { veiculoId: vehicle.id, createdAt: dataTransacao },
        select: { id: true },
      });
      if (exists) {
        summary.duplicates++;
        summary.details.push({
          row: rowNumber,
          placa,
          reason: txCode
            ? 'Duplicado no banco (mesmo CODIGO TRANSACAO)'
            : 'Duplicado no banco (mesmo horário)',
        });
        continue;
      }

      abastecimentosValidos.push({
        rowNumber,
        txCode,
        dataTransacao,
        placa,
        litros,
        kmAtual,
        valor,
        vehicleId: vehicle.id,
      });
    }

    // Segunda passagem: inserir abastecimentos e calcular KM rodados
    // Agrupar por placa para calcular KM entre abastecimentos consecutivos
    const abastecimentosPorPlaca = new Map<string, AbastecimentoValido[]>();
    for (const abastecimento of abastecimentosValidos) {
      if (!abastecimentosPorPlaca.has(abastecimento.placa)) {
        abastecimentosPorPlaca.set(abastecimento.placa, []);
      }
      abastecimentosPorPlaca.get(abastecimento.placa)!.push(abastecimento);
    }

    // Para cada placa, ordenar por data e calcular KM rodados
    for (const [placa, abastecimentos] of abastecimentosPorPlaca.entries()) {
      // Ordenar por data (mais antigo primeiro)
      abastecimentos.sort(
        (a, b) => a.dataTransacao.getTime() - b.dataTransacao.getTime()
      );

      // Inserir abastecimentos e calcular KM rodados
      for (let i = 0; i < abastecimentos.length; i++) {
        const abastecimento = abastecimentos[i];

        // Inserir abastecimento
        const created = await prisma.fuelRecord.create({
          data: {
            litros: abastecimento.litros,
            valor: abastecimento.valor,
            kmAtual: abastecimento.kmAtual,
            situacaoTanque: 'CHEIO',
            photoUrl: '',
            observacao: abastecimento.txCode
              ? `Importado XLSX TX:${abastecimento.txCode}`
              : 'Importado XLSX',
            createdAt: abastecimento.dataTransacao,
            usuarioId: me.id,
            veiculoId: abastecimento.vehicleId,
          },
        });
        summary.inserted++;
        summary.insertedItems.push({
          row: abastecimento.rowNumber,
          placa,
          data: created.createdAt.toISOString(),
          litros: abastecimento.litros,
          valor: abastecimento.valor,
          kmAtual: abastecimento.kmAtual,
        });

        // Calcular KM rodados desde o abastecimento anterior (se houver)
        if (i > 0) {
          const abastecimentoAnterior = abastecimentos[i - 1];
          const kmRodados = abastecimento.kmAtual - abastecimentoAnterior.kmAtual;

          console.log(`[importar-abastecimentos] Placa ${placa}: calculando KM entre abastecimentos ${i-1} e ${i}, kmAnterior=${abastecimentoAnterior.kmAtual}, kmAtual=${abastecimento.kmAtual}, kmRodados=${kmRodados}`);

          // Apenas criar registro de KM se houver uma diferença positiva e razoável
          // (maior que 0 e menor que 999999 para evitar valores absurdos)
          if (kmRodados > 0 && kmRodados < 999999) {
            // Data do registro de KM: meio-termo entre os dois abastecimentos
            const dataKmRecord = new Date(
              (abastecimentoAnterior.dataTransacao.getTime() +
                abastecimento.dataTransacao.getTime()) /
                2
            );

            await prisma.kmRecord.create({
              data: {
                km: kmRodados,
                observacao: `Calculado automaticamente da importação (entre abastecimentos ${abastecimentoAnterior.rowNumber} e ${abastecimento.rowNumber})`,
                photoUrl: null,
                createdAt: dataKmRecord,
                usuarioId: me.id,
                veiculoId: abastecimento.vehicleId,
              },
            });
            summary.kmRecordsCreated++;
            console.log(`[importar-abastecimentos] KmRecord criado: ${kmRodados} km para veículo ${abastecimento.vehicleId}`);
          } else {
            console.log(`[importar-abastecimentos] KmRecord NÃO criado: kmRodados=${kmRodados} (deve ser > 0 e < 999999)`);
          }
        }
      }
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error('Erro ao importar abastecimentos:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
