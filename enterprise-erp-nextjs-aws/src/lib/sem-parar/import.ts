import { z } from 'zod';
import { read, utils } from 'xlsx';

const semPararRowSchema = z.object({
  data: z.coerce.date(),
  placa: z.string().min(3),
  valor: z.number().positive(),
  local: z.string().optional(),
  tipo: z.string().optional(),
  linha: z.number().int().positive(),
});

export type SemPararRow = z.infer<typeof semPararRowSchema>;

const HEADER_ALIASES = {
  data: ['Loc Time', 'Data', 'Date'],
  placa: ['Vehicle Name', 'Veículo', 'Placa'],
  valor: ['Valor', 'Value', 'Amount', 'Total', 'Valor (R$)', 'Price'],
  local: ['Address', 'Local', 'Location', 'POI Original', 'POI Recalc'],
  tipo: ['Status Name', 'Tipo'],
} as const;

function normalizarPlaca(placa: string) {
  return placa.trim().toUpperCase();
}

function localizarValorBruto(input: unknown) {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const normalized = input.replace(/[^0-9,-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function excelSerialParaDate(serial: number): Date {
  let adjustedSerial = serial;
  if (adjustedSerial > 59) {
    // Excel considera 1900 como ano bissexto (dia inexistente 29/02/1900)
    adjustedSerial -= 1;
  }
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = Math.round(adjustedSerial * millisecondsPerDay);
  return new Date(epoch + ms);
}

function normalizarDataBruta(input: unknown): Date | string | undefined {
  if (input instanceof Date) return input;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return undefined;
    return excelSerialParaDate(input);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return undefined;
    const match = trimmed.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/
    );
    if (match) {
      const [, dia, mes, ano, hora = '00', minuto = '00'] = match;
      return new Date(
        Date.UTC(
          Number(ano),
          Number(mes) - 1,
          Number(dia),
          Number(hora),
          Number(minuto)
        )
      );
    }
    return trimmed;
  }
  return undefined;
}

function ehCabecalho(row: unknown[]): boolean {
  const normalized = row.map(cell =>
    typeof cell === 'string' ? cell.trim().toLowerCase() : ''
  );
  const includesAlias = (aliases: readonly string[]) =>
    aliases.some(alias => normalized.includes(alias.toLowerCase()));

  return (
    includesAlias(HEADER_ALIASES.data) &&
    includesAlias(HEADER_ALIASES.placa) &&
    includesAlias(HEADER_ALIASES.valor)
  );
}

export async function readSemPararWorkbook(buffer: Buffer) {
  const workbook = read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  if (!rows.length) {
    return {
      linhas: [] as SemPararRow[],
      erros: [
        { linha: 0, motivo: 'Planilha vazia: nenhum dado encontrado.' },
      ],
    };
  }

  // Estrutura específica: coluna D (índice 3) = placa, coluna H (índice 7) = valor
  // Dados começam na linha 4 (índice 3), linha 3 (índice 2) são cabeçalhos
  const START_ROW_INDEX = 3; // Linha 4 (0-indexed)
  const PLACA_COLUMN_INDEX = 3; // Coluna D (0-indexed)
  const VALOR_COLUMN_INDEX = 7; // Coluna H (0-indexed)

  // Tentar detectar se é a estrutura específica (colunas fixas)
  // Verificar se a linha 3 (índice 2) parece ser cabeçalho e se temos dados suficientes
  const headerRow = rows[2]; // Linha 3 (0-indexed)
  const firstDataRow = rows[START_ROW_INDEX];
  const isFixedStructure =
    Array.isArray(headerRow) &&
    Array.isArray(firstDataRow) &&
    firstDataRow.length > VALOR_COLUMN_INDEX;

  let dataRows: unknown[][];
  let placaIndex: number;
  let valorIndex: number;
  let dataIndex: number | undefined;
  let idxLocal: number | undefined;
  let idxTipo: number | undefined;
  let startRowIndex: number;

  if (isFixedStructure) {
    // Estrutura fixa: coluna D (placa) e H (valor) a partir da linha 4
    dataRows = rows.slice(START_ROW_INDEX);
    placaIndex = PLACA_COLUMN_INDEX;
    valorIndex = VALOR_COLUMN_INDEX;
    
    // Tentar encontrar coluna de data no cabeçalho (linha 3)
    // Verificar colunas A, B, C (índices 0, 1, 2) para data
    let foundDataIndex: number | undefined;
    if (Array.isArray(headerRow)) {
      for (let i = 0; i < 3; i++) {
        const cell = headerRow[i];
        if (typeof cell === 'string') {
          const normalized = cell.trim().toLowerCase();
          if (HEADER_ALIASES.data.some(alias => normalized.includes(alias.toLowerCase()))) {
            foundDataIndex = i;
            break;
          }
        }
      }
    }
    dataIndex = foundDataIndex;
    idxLocal = undefined;
    idxTipo = undefined;
    startRowIndex = START_ROW_INDEX + 1; // Linha 4 (1-indexed)
  } else {
    // Estrutura antiga: procurar cabeçalhos
    const headerRowIndex = rows.findIndex(ehCabecalho);

    if (headerRowIndex === -1) {
      return {
        linhas: [],
        erros: [
          {
            linha: 0,
            motivo:
              'Não foi possível localizar o cabeçalho com colunas Data, Placa e Valor.',
          },
        ],
      };
    }

    const headerRowRaw = rows[headerRowIndex];
    dataRows = rows.slice(headerRowIndex + 1);

    const headerMap = new Map<string, number>();
    headerRowRaw.forEach((cell, index) => {
      if (typeof cell !== 'string') return;
      headerMap.set(cell.trim(), index);
    });

    const resolveColumn = (aliases: readonly string[]) => {
      for (const alias of aliases) {
        const idx = headerMap.get(alias);
        if (idx !== undefined) return idx;
      }
      return undefined;
    };

    dataIndex = resolveColumn(HEADER_ALIASES.data);
    placaIndex = resolveColumn(HEADER_ALIASES.placa) ?? -1;
    valorIndex = resolveColumn(HEADER_ALIASES.valor) ?? -1;
    idxLocal = resolveColumn(HEADER_ALIASES.local);
    idxTipo = resolveColumn(HEADER_ALIASES.tipo);

    const missingHeaders: string[] = [];
    if (dataIndex === undefined) missingHeaders.push('data');
    if (placaIndex === -1) missingHeaders.push('placa');
    if (valorIndex === -1) missingHeaders.push('valor');

    if (missingHeaders.length) {
      return {
        linhas: [],
        erros: [
          {
            linha: headerRowIndex + 1,
            motivo: `Colunas obrigatórias ausentes na planilha: ${missingHeaders.join(', ')}.`,
          },
        ],
      };
    }

    startRowIndex = headerRowIndex + 2;
  }

  const erros: Array<{ linha: number; motivo: string }> = [];
  const linhas: SemPararRow[] = [];

  dataRows.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    const linhaPlanilha = startRowIndex + index;

    // Verificar se a linha está vazia
    const linhaVazia = row.every(cell => cell == null || cell === '');
    if (linhaVazia) return;

    const placaRaw = row[placaIndex];
    const valorRaw = row[valorIndex];

    if (placaRaw == null || placaRaw === '') {
      erros.push({ linha: linhaPlanilha, motivo: 'Linha sem placa.' });
      return;
    }

    const valor = localizarValorBruto(valorRaw);
    if (valor === undefined || valor <= 0) {
      erros.push({ linha: linhaPlanilha, motivo: 'Valor inválido ou ausente.' });
      return;
    }

    // Se não temos data na estrutura fixa, usar data atual
    let dataNormalizada: Date;
    if (dataIndex !== undefined && row[dataIndex] != null) {
      const dataRaw = row[dataIndex];
      const dataParsed = normalizarDataBruta(dataRaw);
      if (!dataParsed || typeof dataParsed === 'string') {
        erros.push({ linha: linhaPlanilha, motivo: 'Data inválida ou ausente.' });
        return;
      }
      dataNormalizada = dataParsed;
    } else {
      // Usar data atual se não houver coluna de data
      dataNormalizada = new Date();
    }

    const parsed = semPararRowSchema.safeParse({
      data: dataNormalizada,
      placa: normalizarPlaca(String(placaRaw)),
      valor,
      local:
        idxLocal !== undefined && row[idxLocal] != null && row[idxLocal] !== ''
          ? String(row[idxLocal])
          : undefined,
      tipo:
        idxTipo !== undefined && row[idxTipo] != null && row[idxTipo] !== ''
          ? String(row[idxTipo])
          : 'PEDAGIO', // Default para PEDAGIO se não especificado
      linha: linhaPlanilha,
    });

    if (!parsed.success) {
      const mensagens = parsed.error?.issues?.map(issue => issue.message);
      const mensagemErro = mensagens?.length
        ? mensagens.join('; ')
        : 'Registro inválido.';
      erros.push({
        linha: linhaPlanilha,
        motivo: mensagemErro,
      });
      return;
    }

    linhas.push(parsed.data);
  });

  return { linhas, erros };
}

export { semPararRowSchema };

