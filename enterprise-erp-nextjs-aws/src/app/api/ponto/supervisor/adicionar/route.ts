import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/ponto/supervisor/adicionar
 * Permite que supervisor adicione ponto manualmente para um funcionário
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser(req);
  // Permitir SUPERVISOR, OPERACIONAL, ADMIN, MASTER e RH
  if (!me?.id || !['SUPERVISOR', 'OPERACIONAL', 'ADMIN', 'MASTER', 'RH'].includes(me.role || '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { funcionarioId, tipo, timestamp, observacao } = body;

    if (!funcionarioId || !tipo || !timestamp) {
      return NextResponse.json(
        { error: 'funcionarioId, tipo e timestamp são obrigatórios' },
        { status: 400 }
      );
    }

    if (!observacao || !observacao.trim()) {
      return NextResponse.json(
        { error: 'Observação é obrigatória para adicionar ponto manualmente' },
        { status: 400 }
      );
    }

    // Validar tipo
    const tiposValidos = ['ENTRADA', 'SAIDA', 'INTERVALO_INICIO', 'INTERVALO_FIM', 'HORA_EXTRA_INICIO', 'HORA_EXTRA_FIM'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Buscar funcionário
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        unidade: true,
      },
    });

    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    }

    if (!funcionario.unidadeId) {
      return NextResponse.json(
        { error: 'Funcionário não está vinculado a uma unidade' },
        { status: 400 }
      );
    }

    // Verificar permissão do supervisor (se for supervisor, verificar scope)
    if (me.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(me.id);
      if (!scope.unidadeIds.includes(funcionario.unidadeId)) {
        return NextResponse.json(
          { error: 'Sem permissão para adicionar ponto para este funcionário' },
          { status: 403 }
        );
      }
    }
    // ADMIN, MASTER e OPERACIONAL têm acesso total

    // Validar timestamp
    const dataPonto = new Date(timestamp);
    if (isNaN(dataPonto.getTime())) {
      return NextResponse.json({ error: 'Timestamp inválido' }, { status: 400 });
    }

    // Criar registro de ponto
    const registro = await prisma.registroPonto.create({
      data: {
        funcionarioId: funcionario.id,
        unidadeId: funcionario.unidadeId,
        tipo: tipo as any,
        timestamp: dataPonto,
        criadoPorId: me.id, // Supervisor que adicionou manualmente
        observacao: observacao.trim(), // Observação obrigatória
      },
    });

    // Log de auditoria
    await logAudit({
      action: 'ponto.create_manual',
      resource: 'RegistroPonto',
      resourceId: registro.id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || 'SUPERVISOR',
      success: true,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      userAgent: req.headers.get('user-agent') || '',
      method: 'POST',
      url: '/api/ponto/supervisor/adicionar',
      description: `Supervisor ${me.name} adicionou ponto manual: ${tipo} para ${funcionario.nome} em ${funcionario.unidade?.nome}`,
      metadata: {
        funcionarioId: funcionario.id,
        funcionarioNome: funcionario.nome,
        tipo,
        timestamp: dataPonto.toISOString(),
      },
    });

    return NextResponse.json({
      sucesso: true,
      registro: {
        id: registro.id,
        tipo: registro.tipo,
        timestamp: registro.timestamp,
        funcionario: funcionario.nome,
        unidade: funcionario.unidade?.nome,
      },
    });
  } catch (error) {
    console.error('Erro ao adicionar ponto manual:', error);
    return NextResponse.json(
      {
        error: 'Erro ao adicionar ponto',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

