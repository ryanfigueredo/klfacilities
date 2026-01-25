import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get('unidadeId') || '';
  if (!unidadeId)
    return NextResponse.json({ error: 'unidadeId requerido' }, { status: 400 });
  const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
  if (!unidade)
    return NextResponse.json({ error: 'unidade inexistente' }, { status: 404 });
  let qr = await prisma.pontoQrCode.findFirst({
    where: { unidadeId, ativo: true },
  });
  if (!qr) {
    const { randomBytes } = await import('crypto');
    const code = randomBytes(18).toString('base64url');
    qr = await prisma.pontoQrCode.create({
      data: { unidadeId, code, ativo: true },
    });
  }
  return NextResponse.json({
    code: qr.code,
    unidade: { id: unidade.id, nome: unidade.nome },
  });
}
