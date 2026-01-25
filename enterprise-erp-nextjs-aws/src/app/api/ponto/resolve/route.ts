import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUniversalQRCode } from '@/lib/ponto-universal';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  if (!code)
    return NextResponse.json({ error: 'code requerido' }, { status: 400 });

  // Verificar se é QR universal
  if (isUniversalQRCode(code)) {
    return NextResponse.json({
      universal: true,
      message: 'QR Code Universal - Identifique-se pelo CPF ou reconhecimento facial',
    });
  }

  const qr = await prisma.pontoQrCode.findFirst({
    where: { code, ativo: true },
    include: { unidade: { select: { id: true, nome: true } } },
  });
  if (!qr) return NextResponse.json({ error: 'QR inválido' }, { status: 404 });
  return NextResponse.json({
    unidadeId: qr.unidadeId,
    unidadeNome: qr.unidade.nome,
    universal: false,
  });
}
