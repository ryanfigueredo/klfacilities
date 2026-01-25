/**
 * API route para servir assets protegidos do S3
 * Usa presigned URLs para proteger logos e imagens sensíveis
 * Retorna a URL diretamente (não redirect) para uso em componentes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProtectedAssetUrl, getPublicAssetUrl } from '@/lib/assets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // Verificar se o bucket é público (variável de ambiente)
    const usePublicUrls = process.env.AWS_S3_PUBLIC_BUCKET === 'true';
    
    // Verificar se é asset protegido
    const protectedAssets = [
      'logo-kl-light.png',
      'logo-kl-dark.svg',
      'brazilLow.svg',
      'placeholder.jpg',
      'movie.mp4',
    ];

    // Arquivos de portfolio são sempre protegidos
    const isPortfolio = decodedFilename.startsWith('portfolio/');
    const isProtected = protectedAssets.some(asset =>
      decodedFilename.includes(asset)
    ) || isPortfolio;

    let url: string;
    if (isProtected) {
      // Se bucket for público, usar URL direta (mais rápido - síncrono)
      if (usePublicUrls) {
        const bucket = process.env.AWS_S3_BUCKET || 'kl-checklist';
        const region = process.env.AWS_REGION || 'us-east-1';
        url = `https://${bucket}.s3.${region}.amazonaws.com/assets/${decodedFilename}`;
      } else {
        // Gerar presigned URL (expira em 1 hora)
        url = await getProtectedAssetUrl(decodedFilename, 3600);
      }
    } else {
      // Asset público - retornar URL direta
      url = getPublicAssetUrl(decodedFilename);
    }

    // Retornar URL como texto (não redirect)
    return new NextResponse(url, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache por 1 ano (assets imutáveis)
      },
    });
  } catch (error: any) {
    // Fallback: retornar URL do public folder
    const { filename } = await params;
    const fallbackUrl = `/${decodeURIComponent(filename)}`;
    
    return new NextResponse(fallbackUrl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

