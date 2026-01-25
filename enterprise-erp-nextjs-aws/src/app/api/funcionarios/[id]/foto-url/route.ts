import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedDownloadUrl } from '@/lib/s3';

/**
 * GET /api/funcionarios/[id]/foto-url
 * Retorna URL assinada da foto facial do funcionário
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: params.id },
      select: { fotoUrl: true },
    });

    if (!funcionario || !funcionario.fotoUrl) {
      return NextResponse.json(
        { error: 'Foto não encontrada' },
        { status: 404 }
      );
    }

    // Converter s3://bucket/key para URL assinada
    if (funcionario.fotoUrl.startsWith('s3://')) {
      const [, bucket, ...rest] = funcionario.fotoUrl.split('/');
      const key = rest.join('/');
      const url = await generatePresignedDownloadUrl(key, 3600); // 1 hora
      return NextResponse.json({ url });
    }

    // Se já for uma URL HTTP, retornar direto
    return NextResponse.json({ url: funcionario.fotoUrl });
  } catch (error) {
    console.error('Erro ao obter URL da foto:', error);
    return NextResponse.json(
      { error: 'Erro ao obter URL da foto' },
      { status: 500 }
    );
  }
}

