import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    const me = await requireControleGasolinaUser();

    const formData = await req.formData();

    const kmSaidaStr = formData.get('kmSaida')?.toString() ?? '0';
    const partida = formData.get('partida')?.toString() ?? '';
    const destino = formData.get('destino')?.toString() ?? '';
    const alterouRota = formData.get('alterouRota') === 'true';
    const alteracaoRota = formData.get('alteracaoRota')?.toString() ?? '';
    const realizouAbastecimento =
      formData.get('realizouAbastecimento') === 'true';
    const veiculoId = formData.get('veiculoId')?.toString();
    const fotoFile = formData.get('fotoKm') as File | null;

    const kmSaida = parseFloat(kmSaidaStr.replace(',', '.'));

    if (
      Number.isNaN(kmSaida) ||
      !partida ||
      !destino ||
      !fotoFile ||
      !veiculoId
    ) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fotoFile.arrayBuffer());
    const fotoUrl = await uploadBufferToS3({
      buffer,
      originalName: fotoFile.name ?? 'rota-km.jpg',
      contentType: fotoFile.type || 'image/jpeg',
      prefix: 'controle-gasolina/rotas',
    });

    await prisma.rotaRecord.create({
      data: {
        kmSaida,
        photoUrl: fotoUrl,
        partida,
        destino,
        alterouRota,
        alteracaoRota: alterouRota ? alteracaoRota : null,
        realizouAbastecimento,
        usuarioId: me.id,
        veiculoId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao registrar rota:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
