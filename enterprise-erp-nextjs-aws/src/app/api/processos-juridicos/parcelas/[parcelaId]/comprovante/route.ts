import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3Client = process.env.AWS_S3_BUCKET
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ parcelaId: string }> }
) {
  try {
    const { parcelaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (
      !user ||
      !['MASTER', 'ADMIN', 'RH', 'JURIDICO'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se a parcela existe
    const parcela = await prisma.parcelaProcesso.findUnique({
      where: { id: parcelaId },
      include: { processoJuridico: true },
    });

    if (!parcela) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há arquivo no FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (imagem ou PDF)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      );
    }

    if (!s3Client) {
      return NextResponse.json(
        { error: 'Configuração de armazenamento ausente' },
        { status: 500 }
      );
    }

    // Upload para S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.type.split('/')[1] || (file.name.split('.').pop() || 'bin');
    const key = `processos-juridicos/comprovantes/${parcela.processoJuridicoId}/${parcelaId}-${randomUUID()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'max-age=31536000,immutable',
      })
    );

    const region = process.env.AWS_REGION || 'us-east-1';
    const comprovanteUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

    // Atualizar parcela com URL do comprovante
    const parcelaAtualizada = await prisma.parcelaProcesso.update({
      where: { id: parcelaId },
      data: {
        comprovantePagamentoUrl: comprovanteUrl,
      } as any,
    });

    return NextResponse.json({
      success: true,
      comprovanteUrl: comprovanteUrl,
      parcela: {
        ...parcelaAtualizada,
        valor: Number(parcelaAtualizada.valor),
      },
    });
  } catch (error: any) {
    console.error('Erro ao fazer upload do comprovante:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload do comprovante' },
      { status: 500 }
    );
  }
}
