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
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadBufferToS3({
      buffer,
      originalName: file.name ?? 'avatar.jpg',
      contentType: file.type || 'image/jpeg',
      prefix: `controle-gasolina/avatars/${me.id}`,
    });

    await prisma.user.update({
      where: { id: me.id },
      data: { photoUrl: imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (error instanceof ControleGasolinaAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro upload:', error);
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 });
  }
}
