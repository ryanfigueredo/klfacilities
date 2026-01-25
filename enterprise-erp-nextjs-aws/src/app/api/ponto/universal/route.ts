import { NextRequest, NextResponse } from 'next/server';
import { QR_CODE_UNIVERSAL } from '@/lib/ponto-universal';

/**
 * GET /api/ponto/universal
 * Retorna o código do QR universal para bater ponto
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    code: QR_CODE_UNIVERSAL,
    message: 'QR Code Universal - Identifique-se pelo CPF ou reconhecimento facial',
  });
}

