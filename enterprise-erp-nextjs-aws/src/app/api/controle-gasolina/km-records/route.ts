import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import {
  ControleGasolinaAuthError,
  requireControleGasolinaUser,
} from '@/lib/controle-gasolina/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await requireControleGasolinaUser();

    const formData = await req.formData();

    const kmString = formData.get('km');
    const observacao = formData.get('observacao')?.toString() || '';
    const veiculoId = formData.get('veiculoId')?.toString();

    const fotoFile = formData.get('foto');
    if (!(fotoFile instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    if (!kmString || !veiculoId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const km = parseFloat(kmString.toString().replace(',', '.'));
    if (Number.isNaN(km)) {
      return NextResponse.json(
        { error: 'Quilometragem inválida' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fotoFile.arrayBuffer());
    const fotoUrl = await uploadBufferToS3({
      buffer,
      originalName: (fotoFile as { name?: string }).name ?? 'km.jpg',
      contentType: fotoFile.type || 'image/jpeg',
      prefix: 'controle-gasolina/kilometragem',
    });

    const registro = await prisma.kmRecord.create({
      data: {
        km,
        observacao,
        photoUrl: fotoUrl,
        usuarioId: me.id,
        veiculoId,
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao processar upload:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
