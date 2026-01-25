import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

/**
 * GET /api/ponto/protocolo/image?url=s3://bucket/key
 * Proxy para servir imagens do S3 com CORS habilitado
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const s3Url = searchParams.get('url');
    
    // Parâmetros de otimização (opcionais)
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : 400; // Largura máxima padrão: 400px
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : 80; // Qualidade JPEG padrão: 80%

    if (!s3Url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });
    }

    // Se já é uma URL HTTP, redirecionar diretamente
    if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
      return NextResponse.redirect(s3Url);
    }

    // Converter s3://bucket/key para URL presignada
    if (s3Url.startsWith('s3://')) {
      const parts = s3Url.replace('s3://', '').split('/');
      const bucket = parts[0];
      const key = parts.slice(1).join('/');

      // Buscar a imagem diretamente do S3 usando GetObjectCommand
      try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3.send(command);
        
        if (!response.Body) {
          return NextResponse.json(
            { error: 'Imagem não encontrada no S3' },
            { status: 404 }
          );
        }

        // Converter stream para buffer
        const chunks: Uint8Array[] = [];
        const reader = response.Body.transformToWebStream().getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        
        // Concatenar chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const imageBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        // Otimizar imagem com sharp: redimensionar e comprimir
        const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
          .resize(width, null, {
            withoutEnlargement: true, // Não aumentar se já for menor
            fit: 'inside', // Manter proporção
          })
          .jpeg({ 
            quality,
            progressive: true, // JPEG progressivo (carrega mais rápido)
            mozjpeg: true, // Usar mozjpeg para melhor compressão
          })
          .toBuffer();

        console.log(`[Protocolo Image] Otimizada: ${(imageBuffer.length / 1024).toFixed(1)}KB → ${(optimizedBuffer.length / 1024).toFixed(1)}KB (${((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(1)}% menor)`);

        // Retornar imagem otimizada com headers CORS
        return new NextResponse(new Uint8Array(optimizedBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache por 1 ano (imagens otimizadas são imutáveis)
          },
        });
      } catch (s3Error: any) {
        console.error('[Protocolo Image] Erro ao buscar do S3:', s3Error);
        return NextResponse.json(
          { error: 'Erro ao buscar imagem do S3: ' + (s3Error?.message || 'Erro desconhecido') },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Formato de URL não suportado' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Protocolo Image] Erro ao servir imagem:', error);
    return NextResponse.json(
      { error: 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
