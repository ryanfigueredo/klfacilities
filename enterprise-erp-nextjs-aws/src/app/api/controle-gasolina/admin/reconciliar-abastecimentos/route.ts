import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';

export const config = {
  api: { bodyParser: false },
};

function normalizePlaca(placaRaw: unknown): string | null {
  if (placaRaw == null) return null;
  const str = String(placaRaw).trim().toUpperCase();
  if (!str) return null;
  return str.replace(/[^A-Z0-9]/g, '');
}

function toFloat(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const noSpaces = raw.replace(/\s+/g, '');
  const normalized = noSpaces.includes(',')
    ? noSpaces.replace(/\./g, '').replace(',', '.')
    : noSpaces;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(value * 24 * 60 * 60 * 1000);
    return new Date(excelEpoch.getTime() + ms);
  }
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/\s+/g, ' ');
  const match = normalized.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (match) {
    const [, dd, MM, yyyy, HH, mm, ss] = match;
    return new Date(
      Number(yyyy),
      Number(MM) - 1,
      Number(dd),
      Number(HH),
      Number(mm),
      ss ? Number(ss) : 0
    );
  }
  const iso = new Date(normalized);
  return isNaN(iso.getTime()) ? null : iso;
}

function normalizeTxCode(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const digits = str.replace(/\D+/g, '');
  return digits || null;
}

type ReconcileSummary = {
  processedRows: number;
  matchedExisting: number;
  updatedWithTx: number;
  duplicatesFound: number;
  duplicatesDeleted: number;
  notFoundVehicle: number;
  invalidRows: number;
  details: { row: number; placa?: string; reason: string }[];
};

export async function POST(req: NextRequest) {
  await requireControleGasolinaAdmin();

  const apply =
    (new URL(req.url).searchParams.get('apply') || 'false') === 'true';

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
    if (!sheet)
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });

    const summary: ReconcileSummary = {
      processedRows: 0,
      matchedExisting: 0,
      updatedWithTx: 0,
      duplicatesFound: 0,
      duplicatesDeleted: 0,
      notFoundVehicle: 0,
      invalidRows: 0,
      details: [],
    };

    // Varre linhas (header na linha 1)
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      summary.processedRows++;

      const txCode = normalizeTxCode(
        row.getCell(1 /* A CODIGO TRANSACAO */).value as unknown
      );
      const dataTransacao = toDate(
        row.getCell(5 /* E DATA */).value as unknown
      );
      const placa = normalizePlaca(
        row.getCell(6 /* F PLACA */).value as unknown
      );
      const litros = toFloat(row.getCell(15 /* O LITROS */).value as unknown);
      const kmAtual = toFloat(row.getCell(17 /* Q KM */).value as unknown);
      const valor = toFloat(row.getCell(20 /* T VALOR */).value as unknown);

      if (
        !dataTransacao ||
        !placa ||
        litros == null ||
        kmAtual == null ||
        valor == null
      ) {
        summary.invalidRows++;
        summary.details.push({
          row: rowNumber,
          placa: placa ?? undefined,
          reason: "Dados inválidos",
        });
        continue;
      }

      const vehicle = await prisma.vehicle.findUnique({ where: { placa } });
      if (!vehicle) {
        summary.notFoundVehicle++;
        summary.details.push({
          row: rowNumber,
          placa,
          reason: 'Veículo não encontrado',
        });
        continue;
      }

      // Busca todos os registros com a mesma data e veículo
      const existing = await prisma.fuelRecord.findMany({
        where: { veiculoId: vehicle.id, createdAt: dataTransacao },
        orderBy: { createdAt: 'asc' },
      });

      if (existing.length === 0) {
        // Não cria nada aqui; essa rota só reconcilia
        continue;
      }

      summary.matchedExisting += existing.length;

      // Atualiza TX se ausente
      if (txCode) {
        for (const rec of existing) {
          const hasTx = (rec.observacao || '').includes(`TX:${txCode}`);
          if (!hasTx) {
            if (apply) {
              await prisma.fuelRecord.update({
                where: { id: rec.id },
                data: {
                  observacao: `${
                    rec.observacao ? rec.observacao + ' ' : ''
                  }TX:${txCode}`,
                },
              });
            }
            summary.updatedWithTx++;
          }
        }
      }

      // Dedup por vehicleId+createdAt: mantém o primeiro, remove extras
      if (existing.length > 1) {
        summary.duplicatesFound += existing.length - 1;
        const toDelete = existing.slice(1); // mantém o primeiro como canônico
        if (apply) {
          for (const rec of toDelete) {
            await prisma.fuelRecord.delete({ where: { id: rec.id } });
            summary.duplicatesDeleted++;
          }
        }
      }
    }

    return NextResponse.json({ apply, summary });
  } catch (error) {
    console.error('Erro na reconciliação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
