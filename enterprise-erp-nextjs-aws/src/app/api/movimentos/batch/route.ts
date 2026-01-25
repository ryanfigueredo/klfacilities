export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

type BatchAction = 'setCategory' | 'mergeDuplicates' | 'markOutlierReviewed';

export async function PATCH(request: NextRequest) {
  try {
    // TODO RBAC: allow ADMIN, RH, AUXILIAR_ADMIN
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '') as BatchAction;
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const payload = body?.payload || {};
    if (!ids.length)
      return NextResponse.json({ error: 'ids obrigatórios' }, { status: 400 });

    if (action === 'setCategory') {
      const categoriaId = String(payload?.categoriaId || '');
      if (!categoriaId)
        return NextResponse.json(
          { error: 'categoriaId obrigatório' },
          { status: 400 }
        );
      const updated = await prisma.movimento.updateMany({
        where: { id: { in: ids } },
        data: { categoriaId, categoria: null },
      } as any);
      return NextResponse.json({ updated: updated.count });
    }

    if (action === 'mergeDuplicates') {
      const keepId = ids[0];
      const deleteIds = ids.slice(1);
      await prisma.$transaction(async tx => {
        // Transferências extras (anexos/logs) poderiam ser feitas aqui
        await tx.movimento.deleteMany({
          where: { id: { in: deleteIds } },
        } as any);
      });
      return NextResponse.json({ deleted: deleteIds.length, kept: keepId });
    }

    if (action === 'markOutlierReviewed') {
      // Se existir tabela de anomalia, atualize-a. Caso contrário, marque nota no movimento.
      const updated = await prisma.movimento.updateMany({
        where: { id: { in: ids } },
        data: { subcategoria: 'Outlier Revisado' },
      } as any);
      return NextResponse.json({ updated: updated.count });
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me?.id)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(me.role as any, 'movimentos', 'delete'))
      return NextResponse.json(forbiddenPayload('movimentos', 'delete'), { status: 403 });

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId') || undefined;
    if (!batchId)
      return NextResponse.json({ error: 'batchId é obrigatório' }, { status: 400 });

    const items = await prisma.importItem.findMany({
      where: { batchId },
      select: { id: true, movimentoId: true, documento: true },
    });

    await prisma.$transaction(async tx => {
      for (const it of items) {
        if (it.movimentoId) {
          await tx.movimento.update({
            where: { id: it.movimentoId },
            data: { deletedAt: new Date(), deletedById: me.id },
          });
        }
        if (it.documento) {
          await tx.provisionamento.deleteMany({
            where: { documento: it.documento, status: 'PENDENTE' as any },
          } as any);
        }
      }
      await tx.importItem.deleteMany({ where: { batchId } });
      await tx.importBatch.update({ where: { id: batchId }, data: { status: 'REVERTIDO' } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao reverter batch' }, { status: 500 });
  }
}
