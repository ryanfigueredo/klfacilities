export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupervisorScope } from '@/lib/supervisor-scope';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function extractBucketAndKey(url: string): { bucket: string; key: string } | null {
  if (!url) return null;

  if (url.startsWith('s3://')) {
    // Extrair bucket e key da URL s3://
    const withoutPrefix = url.replace('s3://', '');
    const firstSlash = withoutPrefix.indexOf('/');
    
    if (firstSlash === -1) {
      // URL malformada: s3://bucket sem key
      return null;
    }
    
    const bucket = withoutPrefix.substring(0, firstSlash);
    const key = withoutPrefix.substring(firstSlash + 1);
    
    return { bucket, key };
  }

  // Caso o valor já seja a key (sem prefixo s3://), usar bucket padrão
  const defaultBucket = process.env.AWS_S3_BUCKET;
  if (!defaultBucket) {
    return null;
  }
  
  return { bucket: defaultBucket, key: url };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'list')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'list'), {
      status: 403,
    });
  }

  const incidente = await prisma.incidente.findUnique({
    where: { id: params.id },
    select: {
      imagemUrl: true,
      unidadeId: true,
    },
  });

  if (!incidente || !incidente.imagemUrl) {
    return NextResponse.json(
      { error: 'Imagem não encontrada' },
      { status: 404 }
    );
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.includes(incidente.unidadeId)) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta imagem' },
        { status: 403 }
      );
    }
  }

  const bucketAndKey = extractBucketAndKey(incidente.imagemUrl);
  if (!bucketAndKey) {
    return NextResponse.json(
      { error: 'Chave de imagem inválida' },
      { status: 500 }
    );
  }

  try {
    // Gerar presigned URL usando o bucket correto da URL
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketAndKey.bucket,
        Key: bucketAndKey.key,
      }),
      { expiresIn: 300 }
    );
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erro ao gerar URL assinada do incidente:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar URL da imagem' },
      { status: 500 }
    );
  }
}

