import { NextRequest, NextResponse } from 'next/server';
import { SituacaoTanque } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SITUACOES_VALIDAS: SituacaoTanque[] = [
  'CHEIO',
  'MEIO_TANQUE',
  'QUASE_VAZIO',
];

export async function POST(req: NextRequest) {
  try {
    const me = await requireControleGasolinaUser();

    const formData = await req.formData();

    const litrosStr = formData.get('litros')?.toString();
    const valorStr = formData.get('valor')?.toString();
    const kmAtualStr = formData.get('kmAtual')?.toString();
    const situacaoTanqueFromForm = formData.get('situacaoTanque')?.toString();
    const observacao = formData.get('observacao')?.toString() ?? '';
    const veiculoId = formData.get('veiculoId')?.toString();
    const fotoFile = formData.get('foto');

    if (!(fotoFile instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    if (!litrosStr || !valorStr || !kmAtualStr || !veiculoId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    const normalizeNumber = (value: string) =>
      parseFloat(value.replace(/\./g, '').replace(',', '.'));

    const litros = normalizeNumber(litrosStr);
    const valor = normalizeNumber(valorStr);
    const kmAtual = normalizeNumber(kmAtualStr);

    if ([litros, valor, kmAtual].some(number => Number.isNaN(number))) {
      return NextResponse.json(
        { error: 'Valores numéricos inválidos' },
        { status: 400 }
      );
    }

    let situacaoTanque: SituacaoTanque = 'CHEIO';
    if (
      situacaoTanqueFromForm &&
      SITUACOES_VALIDAS.includes(situacaoTanqueFromForm as SituacaoTanque)
    ) {
      situacaoTanque = situacaoTanqueFromForm as SituacaoTanque;
    }

    if (!SITUACOES_VALIDAS.includes(situacaoTanque)) {
      return NextResponse.json(
        { error: 'Situação do tanque inválida' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fotoFile.arrayBuffer());
    const fotoUrl = await uploadBufferToS3({
      buffer,
      originalName: (fotoFile as { name?: string }).name ?? 'abastecimento.jpg',
      contentType: fotoFile.type || 'image/jpeg',
      prefix: 'controle-gasolina/abastecimentos',
    });

    const registro = await prisma.fuelRecord.create({
      data: {
        litros,
        valor,
        kmAtual,
        situacaoTanque,
        photoUrl: fotoUrl,
        observacao,
        usuarioId: me.id,
        veiculoId,
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao criar abastecimento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
