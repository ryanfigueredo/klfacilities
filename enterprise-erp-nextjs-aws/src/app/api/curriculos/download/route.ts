import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getSupervisorScope } from '@/lib/supervisor-scope';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // MASTER, ADMIN, RH, OPERACIONAL e SUPERVISOR podem baixar currículos
    if (!['MASTER', 'ADMIN', 'RH', 'OPERACIONAL', 'SUPERVISOR'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const curriculoId = searchParams.get('id');

    if (!curriculoId) {
      return NextResponse.json({ error: 'ID do currículo não fornecido' }, { status: 400 });
    }

    // Buscar currículo
    const curriculo = await prisma.curriculo.findUnique({
      where: { id: curriculoId },
      select: {
        id: true,
        arquivoUrl: true,
        unidadeId: true,
      },
    });

    if (!curriculo) {
      return NextResponse.json({ error: 'Currículo não encontrado' }, { status: 404 });
    }

    if (user.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(user.id);
      if (!curriculo.unidadeId || !scope.unidadeIds.includes(curriculo.unidadeId)) {
        return NextResponse.json({ error: 'Sem permissão para este currículo' }, { status: 403 });
      }
    }

    // Extrair key do S3 (formato: s3://bucket/key)
    let key: string;
    const s3Bucket = process.env.AWS_S3_BUCKET!;
    
    if (curriculo.arquivoUrl.startsWith('s3://')) {
      // Remover o prefixo s3:// e dividir por '/'
      const pathWithoutPrefix = curriculo.arquivoUrl.replace('s3://', '');
      const parts = pathWithoutPrefix.split('/');
      
      // A primeira parte é o bucket, o resto é a key
      const bucketFromUrl = parts[0];
      key = parts.slice(1).join('/');
      
      // Validar que o bucket da URL corresponde ao bucket configurado
      if (bucketFromUrl !== s3Bucket) {
        console.warn(`Bucket mismatch: URL has ${bucketFromUrl}, env has ${s3Bucket}. Using env bucket.`);
      }
    } else if (curriculo.arquivoUrl.includes('/')) {
      // Se for apenas o caminho sem s3://, usar diretamente como key
      key = curriculo.arquivoUrl.startsWith('/') 
        ? curriculo.arquivoUrl.slice(1) 
        : curriculo.arquivoUrl;
    } else {
      // Se for URL antiga (filesystem), retornar erro ou tratar adequadamente
      return NextResponse.json({ error: 'Formato de URL não suportado' }, { status: 400 });
    }

    // Gerar presigned URL (válida por 15 minutos)
    const presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      }),
      { expiresIn: 60 * 15 }
    );

    return NextResponse.json({ url: presignedUrl });
  } catch (error: any) {
    console.error('Erro ao gerar URL de download:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar URL de download' },
      { status: 500 }
    );
  }
}

