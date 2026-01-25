import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugify(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get('slug') || '').trim();
  if (!slug)
    return NextResponse.json({ error: 'slug requerido' }, { status: 400 });

  const unidades = await prisma.unidade.findMany({
    select: { id: true, nome: true },
  });
  const match = unidades.find(u => slugify(u.nome) === slug);
  if (!match)
    return NextResponse.json(
      { error: 'unidade não encontrada' },
      { status: 404 }
    );

  // pegar (ou criar) QR ativo dessa unidade
  let qr = await prisma.pontoQrCode.findFirst({
    where: { unidadeId: match.id, ativo: true },
  });
  if (!qr) {
    // cria um code novo
    const { randomBytes } = await import('crypto');
    const code = randomBytes(18).toString('base64url');
    qr = await prisma.pontoQrCode.create({
      data: { unidadeId: match.id, code, ativo: true },
    });
  }

  return NextResponse.json({
    unidadeId: match.id,
    unidadeNome: match.nome,
    code: qr.code,
  });
}
