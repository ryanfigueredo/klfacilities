import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões (MASTER, RH)
    if (!['MASTER', 'RH'].includes(me.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const funcionarioId = params.id;
    const formData = await req.formData();
    const foto = formData.get('foto') as File | null;

    if (!foto) {
      return NextResponse.json(
        { error: 'Foto não fornecida' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!foto.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser uma imagem' },
        { status: 400 }
      );
    }

    // Validar tamanho (5MB)
    if (foto.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Verificar se funcionário existe
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Fazer upload para S3
    const buffer = Buffer.from(await foto.arrayBuffer());
    const fotoUrl = await uploadBufferToS3({
      buffer,
      originalName: `cracha-${funcionarioId}-${Date.now()}.jpg`,
      contentType: foto.type || 'image/jpeg',
      prefix: 'funcionarios/crachas',
    });

    // Atualizar funcionário
    await prisma.funcionario.update({
      where: { id: funcionarioId },
      data: {
        fotoCracha: fotoUrl,
        temCracha: true,
      },
    });

    return NextResponse.json({ success: true, fotoUrl });
  } catch (error) {
    console.error('Erro ao fazer upload da foto de crachá:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

