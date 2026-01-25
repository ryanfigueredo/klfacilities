import { NextRequest, NextResponse } from 'next/server';
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
 * POST /api/ponto/process-face
 * Processa uma selfie e gera o descritor facial para cadastro/atualização
 * Esta API será chamada automaticamente quando o funcionário bater ponto
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📥 Recebendo requisição para processar foto facial');
    const formData = await req.formData();
    const selfie = formData.get('selfie') as File;
    const funcionarioId = formData.get('funcionarioId') as string;
    const descriptor = formData.get('descriptor') as string;

    console.log('📋 Dados recebidos:', {
      temSelfie: !!selfie,
      selfieSize: selfie?.size,
      selfieType: selfie?.type,
      funcionarioId,
      temDescriptor: !!descriptor,
      descriptorLength: descriptor?.length,
    });

    if (!selfie || !funcionarioId || !descriptor) {
      console.error('❌ Dados faltando:', {
        temSelfie: !!selfie,
        temFuncionarioId: !!funcionarioId,
        temDescriptor: !!descriptor,
      });
      return NextResponse.json(
        { error: 'Selfie, funcionarioId e descriptor são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!selfie.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser uma imagem' },
        { status: 400 }
      );
    }

    // Verificar se funcionário existe
    console.log('🔍 Buscando funcionário:', funcionarioId);
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
    });

    if (!funcionario) {
      console.error('❌ Funcionário não encontrado:', funcionarioId);
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Funcionário encontrado:', funcionario.nome);

    // Upload foto para S3 (usar a mesma selfie como foto de referência)
    console.log('📤 Fazendo upload para S3...');
    const bytes = Buffer.from(await selfie.arrayBuffer());
    const ext = selfie.type.split('/')[1] || 'jpg';
    const key = `funcionarios/faces/${funcionarioId}/${randomUUID()}.${ext}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: bytes,
          ContentType: selfie.type,
          CacheControl: 'max-age=31536000,immutable',
        })
      );
      console.log('✅ Upload para S3 concluído:', key);
    } catch (s3Error) {
      console.error('❌ Erro ao fazer upload para S3:', s3Error);
      throw s3Error;
    }

    const fotoUrl = `s3://${process.env.AWS_S3_BUCKET}/${key}`;
    console.log('📸 Foto URL gerada:', fotoUrl);

    // Parse descriptor (deve ser um array de 128 números)
    console.log('🔍 Validando descritor...');
    let descriptorArray: number[];
    try {
      descriptorArray = JSON.parse(descriptor);
      if (!Array.isArray(descriptorArray) || descriptorArray.length !== 128) {
        console.error('❌ Descritor inválido:', {
          isArray: Array.isArray(descriptorArray),
          length: descriptorArray?.length,
        });
        throw new Error('Descritor inválido');
      }
      console.log('✅ Descritor válido:', descriptorArray.length, 'dimensões');
    } catch (error) {
      console.error('❌ Erro ao validar descritor:', error);
      return NextResponse.json(
        { error: 'Descritor facial inválido' },
        { status: 400 }
      );
    }

    // Atualizar funcionário (cadastrar ou atualizar foto e descritor)
    console.log('💾 Atualizando funcionário no banco de dados...');
    try {
      const updated = await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: {
          fotoUrl,
          faceDescriptor: descriptorArray,
        },
        select: {
          id: true,
          nome: true,
          fotoUrl: true,
          faceDescriptor: true,
        },
      });
      console.log('✅ Funcionário atualizado com sucesso:', {
        id: updated.id,
        nome: updated.nome,
        temFotoUrl: !!updated.fotoUrl,
        temFaceDescriptor: !!updated.faceDescriptor,
      });
    } catch (dbError) {
      console.error('❌ Erro ao atualizar funcionário no banco:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      fotoUrl,
      message: 'Foto facial processada e cadastrada com sucesso',
    });
  } catch (error: any) {
    console.error('❌ Erro ao processar foto facial:', error);
    return NextResponse.json(
      { error: `Erro ao processar foto facial: ${error?.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}

