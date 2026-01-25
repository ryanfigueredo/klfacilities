import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getHttpContext } from '@/lib/audit/http';
import { logAudit } from '@/lib/audit/log';
import type { Prisma } from '@prisma/client';

type JsonObject = Prisma.JsonObject;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user?.id || user.role !== 'MASTER') {
      return NextResponse.json(
        { error: 'Apenas o MASTER pode reverter ações' },
        { status: 403 }
      );
    }

    const log = await prisma.auditLog.findUnique({
      where: { id: params.id },
    });

    if (!log) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    if (log.action !== 'curriculo.status_change') {
      return NextResponse.json(
        { error: 'Este registro não pode ser revertido automaticamente' },
        { status: 400 }
      );
    }

    const details = (log.details as JsonObject) || {};
    const revertedAt = (details as any)?.revertedAt;
    if (revertedAt) {
      return NextResponse.json(
        { error: 'Este registro já foi revertido' },
        { status: 400 }
      );
    }

    const curriculoId =
      log.resourceId || (details as any)?.curriculoId || (details as any)?.metadata?.curriculoId;

    if (!curriculoId || typeof curriculoId !== 'string') {
      return NextResponse.json(
        { error: 'Registro sem referência de currículo' },
        { status: 400 }
      );
    }

    const oldStatus = (details as any)?.oldStatus ?? null;
    const oldObservacoes = (details as any)?.oldObservacoes ?? null;

    if (oldStatus === undefined) {
      return NextResponse.json(
        { error: 'Registro não contém histórico suficiente para reverter' },
        { status: 400 }
      );
    }

    const updatedCurriculo = await prisma.curriculo.update({
      where: { id: curriculoId },
      data: {
        status: oldStatus,
        observacoes: oldObservacoes,
      },
    });

    const http = await getHttpContext(request);

    await logAudit({
      action: 'curriculo.status_revert',
      resource: 'Curriculo',
      resourceId: curriculoId,
      userId: user.id,
      userEmail: user.email ?? undefined,
      userRole: user.role,
      success: true,
      ip: http.ip,
      userAgent: http.userAgent,
      method: http.method,
      url: http.url,
      description: `Status do currículo revertido para ${oldStatus ?? 'N/A'}`,
      metadata: {
        originalLogId: log.id,
        revertedTo: oldStatus,
      },
    });

    await prisma.auditLog.update({
      where: { id: log.id },
      data: {
        details: {
          ...(details as JsonObject),
          revertedAt: new Date().toISOString(),
          revertedBy: user.email ?? user.id,
        },
      },
    });

    return NextResponse.json({ success: true, curriculo: updatedCurriculo });
  } catch (error: any) {
    console.error('Erro ao reverter registro de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao reverter ação' },
      { status: 500 }
    );
  }
}


