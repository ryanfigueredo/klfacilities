import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const unidadeId = body.unidadeId ?? null;
  const codigo =
    typeof body.codigo === 'string' ? body.codigo.trim() : undefined;
  const cargo = body.cargo !== undefined ? (body.cargo || null) : undefined;
  const temCracha = body.temCracha !== undefined ? Boolean(body.temCracha) : undefined;
  const diaFolga = body.diaFolga !== undefined 
    ? (body.diaFolga === null || body.diaFolga === '' ? null : Number(body.diaFolga))
    : undefined;
  
  const updateData: any = { unidadeId };
  if (codigo !== undefined) updateData.codigo = codigo;
  if (cargo !== undefined) updateData.cargo = cargo;
  if (temCracha !== undefined) updateData.temCracha = temCracha;
  if (diaFolga !== undefined) {
    updateData.diaFolga = diaFolga !== null && diaFolga >= 0 && diaFolga <= 6 ? diaFolga : null;
  }
  
  const r = await prisma.funcionario.update({
    where: { id: params.id },
    data: updateData,
  });
  return NextResponse.json({ ok: true, id: r.id });
}
