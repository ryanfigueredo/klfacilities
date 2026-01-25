import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { logAudit } from '@/lib/audit/log';

/**
 * PATCH /api/ponto/supervisor/editar
 * Permite que supervisor edite ponto manualmente (alterar timestamp)
 */
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me?.id || (me.role !== 'SUPERVISOR' && me.role !== 'ADMIN' && me.role !== 'MASTER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { registroPontoId, timestamp } = body;

    if (!registroPontoId || !timestamp) {
      return NextResponse.json(
        { error: 'registroPontoId e timestamp são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar registro de ponto
    const registro = await prisma.registroPonto.findUnique({
      where: { id: registroPontoId },
      include: {
        funcionario: {
          include: {
            unidade: true,
          },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro de ponto não encontrado' }, { status: 404 });
    }

    if (!registro.funcionarioId || !registro.funcionario) {
      return NextResponse.json(
        { error: 'Registro de ponto não está vinculado a um funcionário' },
        { status: 400 }
      );
    }

    // Verificar permissão do supervisor (se for supervisor)
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      if (!scope.unidadeIds.includes(registro.unidadeId)) {
        return NextResponse.json(
          { error: 'Sem permissão para editar ponto deste funcionário' },
          { status: 403 }
        );
      }
    }

    // Validar timestamp
    const dataPonto = new Date(timestamp);
    if (isNaN(dataPonto.getTime())) {
      return NextResponse.json({ error: 'Timestamp inválido' }, { status: 400 });
    }

    // Atualizar registro de ponto
    const updated = await prisma.registroPonto.update({
      where: { id: registroPontoId },
      data: {
        timestamp: dataPonto,
      },
    });

    // Log de auditoria
    await logAudit({
      action: 'ponto.update_manual',
      resource: 'RegistroPonto',
      resourceId: updated.id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || 'SUPERVISOR',
      success: true,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
      method: 'PATCH',
      url: '/api/ponto/supervisor/editar',
      description: `${me.name} editou ponto: ${registro.tipo} de ${registro.funcionario.nome} em ${registro.funcionario.unidade?.nome}`,
      metadata: {
        registroPontoId: registro.id,
        funcionarioId: registro.funcionario.id,
        funcionarioNome: registro.funcionario.nome,
        tipo: registro.tipo,
        timestampAnterior: registro.timestamp.toISOString(),
        timestampNovo: dataPonto.toISOString(),
      },
    });

    return NextResponse.json({
      sucesso: true,
      registro: {
        id: updated.id,
        tipo: updated.tipo,
        timestamp: updated.timestamp,
        funcionario: registro.funcionario.nome,
        unidade: registro.funcionario.unidade?.nome,
      },
    });
  } catch (error) {
    console.error('Erro ao editar ponto:', error);
    return NextResponse.json(
      {
        error: 'Erro ao editar ponto',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ponto/supervisor/editar
 * Permite que supervisor exclua ponto manualmente
 */
export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me?.id || (me.role !== 'SUPERVISOR' && me.role !== 'ADMIN' && me.role !== 'MASTER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const registroPontoId = searchParams.get('id');

    if (!registroPontoId) {
      return NextResponse.json(
        { error: 'registroPontoId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar registro de ponto
    const registro = await prisma.registroPonto.findUnique({
      where: { id: registroPontoId },
      include: {
        funcionario: {
          include: {
            unidade: true,
          },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro de ponto não encontrado' }, { status: 404 });
    }

    // Verificar permissão do supervisor (se for supervisor)
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      if (!scope.unidadeIds.includes(registro.unidadeId)) {
        return NextResponse.json(
          { error: 'Sem permissão para excluir ponto deste funcionário' },
          { status: 403 }
        );
      }
    }

    // Excluir registro
    await prisma.registroPonto.delete({
      where: { id: registroPontoId },
    });

    // Log de auditoria
    await logAudit({
      action: 'ponto.delete_manual',
      resource: 'RegistroPonto',
      resourceId: registroPontoId,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || 'SUPERVISOR',
      success: true,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
      method: 'DELETE',
      url: '/api/ponto/supervisor/editar',
      description: `${me.name} excluiu ponto: ${registro.tipo} de ${registro.funcionario?.nome || 'N/A'} em ${registro.funcionario?.unidade?.nome || 'N/A'}`,
      metadata: {
        registroPontoId: registro.id,
        funcionarioId: registro.funcionarioId,
        tipo: registro.tipo,
        timestamp: registro.timestamp.toISOString(),
      },
    });

    return NextResponse.json({
      sucesso: true,
      message: 'Ponto excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir ponto:', error);
    return NextResponse.json(
      {
        error: 'Erro ao excluir ponto',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

