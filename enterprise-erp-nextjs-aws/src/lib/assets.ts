/**
 * Utilitário para gerenciar assets estáticos no S3
 * 
 * Assets públicos (favicons, manifest): CloudFront ou URL direta
 * Assets protegidos (logos, imagens): Presigned URLs de curta duração
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Validar variáveis de ambiente
if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  console.warn('[Assets] Variáveis AWS não configuradas completamente');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const BUCKET = process.env.AWS_S3_BUCKET || 'kl-checklist';
const ASSETS_PREFIX = 'assets/'; // Prefixo para assets estáticos no S3
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || ''; // URL do CloudFront se configurado
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Se o bucket for público, usar URLs diretas em vez de presigned URLs
// Configure AWS_S3_PUBLIC_BUCKET=true no .env se o bucket for público
const USE_PUBLIC_URLS = process.env.AWS_S3_PUBLIC_BUCKET === 'true';

/**
 * Assets públicos (podem ser servidos via CloudFront ou URL direta)
 */
const PUBLIC_ASSETS = [
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

/**
 * Assets protegidos (requerem presigned URLs)
 */
const PROTECTED_ASSETS = [
  'logo-kl-light.png',
  'logo-kl-dark.svg',
  'brazilLow.svg',
  'placeholder.jpg',
  'movie.mp4',
];

/**
 * Obter URL para asset público (favicons, manifest)
 * Usa CloudFront se configurado, senão URL direta do S3
 */
export function getPublicAssetUrl(filename: string): string {
  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL}/${ASSETS_PREFIX}${filename}`;
  }
  // URL direta do S3
  return getDirectS3Url(filename);
}

/**
 * Obter URL direta do S3 (para buckets públicos)
 */
function getDirectS3Url(filename: string): string {
  const key = `${ASSETS_PREFIX}${filename}`;
  return `https://${BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Obter presigned URL para asset protegido (logos, imagens sensíveis)
 * URLs expiram em 1 hora para segurança
 * Se o bucket for público, retorna URL direta (síncrono e mais rápido)
 */
export async function getProtectedAssetUrl(
  filename: string,
  expiresIn: number = 3600
): Promise<string> {
  // Se o bucket for público, usar URL direta (mais rápido - síncrono)
  if (USE_PUBLIC_URLS) {
    return getDirectS3Url(filename);
  }

  // Se não tiver credenciais, usar URL direta como fallback
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return getDirectS3Url(filename);
  }

  try {
    const key = `${ASSETS_PREFIX}${filename}`;
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error: any) {
    // Fallback: retornar URL direta do S3
    return getDirectS3Url(filename);
  }
}

/**
 * Versão síncrona para assets públicos (mais rápido)
 */
export function getProtectedAssetUrlSync(filename: string): string {
  return getDirectS3Url(filename);
}

/**
 * Obter URL para asset - decide automaticamente se é público ou protegido
 */
export async function getAssetUrl(filename: string): Promise<string> {
  if (PUBLIC_ASSETS.includes(filename)) {
    return getPublicAssetUrl(filename);
  }
  if (PROTECTED_ASSETS.includes(filename)) {
    return getProtectedAssetUrl(filename);
  }
  // Para outros assets, usar como protegido por padrão
  return getProtectedAssetUrl(filename);
}

/**
 * Obter URL para asset de portfolio
 */
export async function getPortfolioAssetUrl(
  filename: string
): Promise<string> {
  return getProtectedAssetUrl(`portfolio/${filename}`);
}

