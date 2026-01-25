import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireControleGasolinaAdmin } from '@/lib/controle-gasolina/auth';
import { prisma } from '@/lib/prisma';
import {
  readSemPararWorkbook,
  semPararRowSchema,
  SemPararRow,
} from '@/lib/sem-parar/import';

const jsonPayloadSchema = z.object({
  data: z.array(
    semPararRowSchema.omit({ data: true }).extend({
      data: z.string(),
    })
  ),
  arquivoImportacao: z.string().optional(),
});

async function gravarRegistros(
  linhas: SemPararRow[],
  arquivoImportacao?: string
) {
  // Buscar veículos fora da transação para evitar timeout
  const veiculos = await prisma.vehicle.findMany({
    select: { id: true, placa: true },
  });
  const mapaVeiculos = new Map(
    veiculos.map(v => [v.placa.toUpperCase(), v])
  );

  // Separar registros válidos dos com erro
  const registrosParaInserir: Array<{
    veiculoId: string;
    data: Date;
    valor: number;
    descricao: string | null;
    local: string | null;
    tipo: string;
    arquivoImportacao: string | null;
    linhaPlanilha: number | null;
  }> = [];
  const erros: Array<{ linha: number; motivo: string }> = [];

  for (const registro of linhas) {
    const placa = registro.placa.toUpperCase();
    const veiculo = mapaVeiculos.get(placa);
    if (!veiculo) {
      erros.push({
        linha: registro.linha,
        motivo: `Veículo ${placa} não encontrado`,
      });
      continue;
    }

    registrosParaInserir.push({
      veiculoId: veiculo.id,
      data: registro.data,
      valor: registro.valor,
      descricao: registro.local ?? null,
      local: registro.local ?? null,
      tipo: registro.tipo ?? 'PEDAGIO',
      arquivoImportacao: arquivoImportacao ?? null,
      linhaPlanilha: registro.linha ?? null,
    });
  }

  // Processar em batches para evitar timeout em transações muito grandes
  const BATCH_SIZE = 500;
  let inseridos = 0;

  for (let i = 0; i < registrosParaInserir.length; i += BATCH_SIZE) {
    const batch = registrosParaInserir.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(
      async tx => {
        await tx.semPararRegistro.createMany({
          data: batch,
          skipDuplicates: false,
        });
      },
      {
        timeout: 30000, // 30 segundos por batch
      }
    );
    
    inseridos += batch.length;
  }

  return {
    processados: linhas.length,
    inseridos,
    erros,
  };
}

export async function POST(request: Request) {
  try {
    await requireControleGasolinaAdmin();

    const contentType = request.headers.get('content-type') || '';
    let linhas: SemPararRow[] = [];
    let arquivoImportacao: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      arquivoImportacao =
        typeof formData.get('label') === 'string'
          ? String(formData.get('label'))
          : undefined;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Envie um arquivo .xlsx ou .xls válido.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await readSemPararWorkbook(buffer);
      linhas = parsed.linhas;

      if (!linhas.length) {
        return NextResponse.json(
          {
            error: 'Nenhum registro válido encontrado na planilha.',
            erros: parsed.erros,
          },
          { status: 400 }
        );
      }

      if (parsed.erros.length) {
        const resumo = await gravarRegistros(linhas, arquivoImportacao);
        return NextResponse.json({
          ...resumo,
          erros: [...resumo.erros, ...parsed.erros],
        });
      }
    } else {
      const body = await request.json().catch(() => null);
      const parsed = jsonPayloadSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Payload inválido', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      arquivoImportacao = parsed.data.arquivoImportacao;
      linhas = parsed.data.data.map(item =>
        semPararRowSchema.parse({
          data: item.data,
          placa: item.placa,
          valor: item.valor,
          local: item.local,
          tipo: item.tipo,
          linha: item.linha ?? 1,
        })
      );
    }

    if (!linhas.length) {
      return NextResponse.json(
        { error: 'Nenhum registro válido encontrado na planilha.' },
        { status: 400 }
      );
    }

    const resultado = await gravarRegistros(linhas, arquivoImportacao);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[sem-parar-import] erro', error);
    return NextResponse.json(
      { error: 'Erro ao importar planilha Sem Parar' },
      { status: 500 }
    );
  }
}

