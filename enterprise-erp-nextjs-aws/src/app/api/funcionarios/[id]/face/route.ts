import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * POST /api/funcionarios/[id]/face
 * Cadastra foto facial e descritor do funcionário para reconhecimento
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas ADMIN e RH podem cadastrar fotos faciais
    if (me.role !== 'ADMIN' && me.role !== 'RH' && me.role !== 'MASTER') {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const foto = formData.get('foto') as File;
    const descriptor = formData.get('descriptor') as string;

    if (!foto || !descriptor) {
      return NextResponse.json(
        { error: 'Foto e descritor são obrigatórios' },
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
      where: { id: params.id },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Upload foto para S3
    const bytes = Buffer.from(await foto.arrayBuffer());
    const ext = foto.type.split('/')[1] || 'jpg';
    const key = `funcionarios/faces/${params.id}/${randomUUID()}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: foto.type,
        CacheControl: 'max-age=31536000,immutable',
      })
    );

    const fotoUrl = `s3://${process.env.AWS_S3_BUCKET}/${key}`;

    // Parse descriptor (deve ser um array de 128 números)
    let descriptorArray: number[];
    try {
      descriptorArray = JSON.parse(descriptor);
      if (!Array.isArray(descriptorArray) || descriptorArray.length !== 128) {
        throw new Error('Descritor inválido');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Descritor facial inválido' },
        { status: 400 }
      );
    }

    // Atualizar funcionário
    await prisma.funcionario.update({
      where: { id: params.id },
      data: {
        fotoUrl,
        faceDescriptor: descriptorArray,
      },
    });

    return NextResponse.json({
      success: true,
      fotoUrl,
      message: 'Foto facial cadastrada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cadastrar foto facial:', error);
    return NextResponse.json(
      { error: 'Erro ao cadastrar foto facial' },
      { status: 500 }
    );
  }
}

