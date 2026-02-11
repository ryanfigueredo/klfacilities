import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  // MASTER, RH, SUPERVISOR e ADMIN podem editar (unidade, cargo, dia de folga)
  if (!['MASTER', 'RH', 'SUPERVISOR', 'ADMIN'].includes(me.role)) {
    return NextResponse.json(
      { error: 'Sem permissão para editar colaborador' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const unidadeIdsRaw = body.unidadeIds;
  const unidadeIds =
    Array.isArray(unidadeIdsRaw) && unidadeIdsRaw.every((x: unknown) => typeof x === 'string')
      ? (unidadeIdsRaw as string[]).filter(Boolean)
      : undefined;
  const unidadeId =
    body.unidadeId !== undefined ? (body.unidadeId || null) : undefined;
  const codigo =
    typeof body.codigo === 'string' ? body.codigo.trim() : undefined;
  const nome = typeof body.nome === 'string' ? body.nome.trim() : undefined;
  const cpfRaw = body.cpf;
  const cpf =
    cpfRaw !== undefined
      ? cpfRaw === null || cpfRaw === ''
        ? null
        : String(cpfRaw).replace(/\D/g, '').trim() || null
      : undefined;
  const grupoId = typeof body.grupoId === 'string' ? body.grupoId : undefined;
  const cargo = body.cargo !== undefined ? (body.cargo || null) : undefined;
  const temCracha =
    body.temCracha !== undefined ? Boolean(body.temCracha) : undefined;
  const diaFolga =
    body.diaFolga !== undefined
      ? body.diaFolga === null || body.diaFolga === ''
        ? null
        : Number(body.diaFolga)
      : undefined;

  const updateData: any = {};
  if (unidadeId !== undefined) updateData.unidadeId = unidadeId;
  if (nome !== undefined) updateData.nome = nome;
  if (cpf !== undefined) updateData.cpf = cpf;
  if (grupoId !== undefined) updateData.grupoId = grupoId;
  if (codigo !== undefined) updateData.codigo = codigo;
  if (cargo !== undefined) updateData.cargo = cargo;
  if (temCracha !== undefined) updateData.temCracha = temCracha;
  if (diaFolga !== undefined) {
    updateData.diaFolga =
      diaFolga !== null && diaFolga >= 0 && diaFolga <= 6 ? diaFolga : null;
  }
  if (unidadeIds !== undefined) {
    updateData.unidadeId = unidadeIds.length > 0 ? unidadeIds[0] : null;
  }
  if (Object.keys(updateData).length === 0 && unidadeIds === undefined) {
    return NextResponse.json(
      { error: 'Nenhum campo para atualizar' },
      { status: 400 }
    );
  }

  const r = await prisma.$transaction(async tx => {
    const updated = await tx.funcionario.update({
      where: { id: params.id },
      data: updateData,
    });
    if (unidadeIds !== undefined) {
      await tx.funcionarioUnidade.deleteMany({
        where: { funcionarioId: params.id },
      });
      if (unidadeIds.length > 0) {
        await tx.funcionarioUnidade.createMany({
          data: unidadeIds.map(uid => ({
            funcionarioId: params.id,
            unidadeId: uid,
          })),
        });
      }
    }
    return updated;
  });
  return NextResponse.json({ ok: true, id: r.id });
}
