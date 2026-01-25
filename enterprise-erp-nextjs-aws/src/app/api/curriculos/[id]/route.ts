import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getHttpContext } from '@/lib/audit/http';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import {
  logCurriculoDeleted,
  logCurriculoStatusChange,
} from '@/lib/audit/log';

// PATCH - Atualizar status ou observações do currículo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // MASTER, ADMIN, RH, OPERACIONAL e SUPERVISOR podem atualizar currículos
    if (!user || !['MASTER', 'ADMIN', 'RH', 'OPERACIONAL', 'SUPERVISOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const existing = await prisma.curriculo.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        status: true,
        observacoes: true,
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Currículo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar escopo do supervisor se for SUPERVISOR
    if (user.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(user.id);
      const curriculoUnidadeId = existing.unidade?.id;
      if (!curriculoUnidadeId || !scope.unidadeIds.includes(curriculoUnidadeId)) {
        return NextResponse.json(
          { error: 'Sem permissão para este currículo' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { status, observacoes, unidadeId } = body;

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (observacoes !== undefined) {
      updateData.observacoes = observacoes;
    }
    if (unidadeId !== undefined) {
      // Verificar se a unidade existe
      const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
      });
      if (!unidade) {
        return NextResponse.json(
          { error: 'Unidade não encontrada' },
          { status: 404 }
        );
      }
      updateData.unidadeId = unidadeId;
      // Se estava pendente de vinculação, mudar para PENDENTE normal
      if (existing.status === 'PENDENTE_VINCULACAO') {
        updateData.status = 'PENDENTE';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ curriculo: existing });
    }

    const curriculo = await prisma.curriculo.update({
      where: { id: params.id },
      data: updateData,
      include: {
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    const http = await getHttpContext(request);
    const before = {
      status: existing.status,
      observacoes: existing.observacoes,
    };

    const statusChanged = before.status !== curriculo.status;
    const observChanged = before.observacoes !== curriculo.observacoes;

    if (statusChanged) {
      await logCurriculoStatusChange({
        curriculo,
        before,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        http,
      });
    }

    return NextResponse.json({ curriculo });
  } catch (error: any) {
    console.error('Erro ao atualizar currículo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar currículo' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar currículo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // Apenas MASTER e ADMIN podem deletar currículos
    if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const existing = await prisma.curriculo.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Currículo não encontrado' },
        { status: 404 }
      );
    }

    await prisma.curriculo.delete({
      where: { id: params.id },
    });

    const http = await getHttpContext(request);
    await logCurriculoDeleted({
      curriculo: existing,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      http,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar currículo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar currículo' },
      { status: 500 }
    );
  }
}
