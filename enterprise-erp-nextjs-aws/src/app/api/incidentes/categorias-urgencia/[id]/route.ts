import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/auth/policy';
import { getUrgenciaConfig, type UrgenciaNivel } from '@/lib/urgencia-helper';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser(request);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Apenas ADMIN, OPERACIONAL e MASTER podem editar categorias
    if (!can(me.role, 'incidentes', 'update')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { urgenciaNivel, nome, ativo } = body;

    const updateData: any = {};

    // Se urgenciaNivel foi alterado, recalcular prazo, descrição e ordem
    if (urgenciaNivel) {
      const niveisValidos: UrgenciaNivel[] = ['CRITICA', 'ALTA', 'NORMAL', 'BAIXA', 'MUITO_BAIXA'];
      if (!niveisValidos.includes(urgenciaNivel)) {
        return NextResponse.json(
          { error: 'Nível de urgência inválido' },
          { status: 400 }
        );
      }

      const config = getUrgenciaConfig(urgenciaNivel);
      updateData.urgenciaNivel = urgenciaNivel;
      updateData.prazoHoras = config.prazoHoras;
      updateData.descricao = config.descricao;
      updateData.ordem = config.ordem;
    }

    if (nome !== undefined) updateData.nome = nome;
    if (ativo !== undefined) updateData.ativo = ativo;

    const categoria = await prisma.categoriaUrgenciaChamado.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ categoria });
  } catch (error) {
    console.error('Erro ao atualizar categoria de urgência:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria de urgência' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser(request);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Apenas ADMIN, OPERACIONAL e MASTER podem deletar categorias
    if (!can(me.role, 'incidentes', 'delete')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se há incidentes usando esta categoria
    const incidentes = await prisma.incidente.count({
      where: { categoriaUrgenciaId: id },
    });

    if (incidentes > 0) {
      // Desativar ao invés de deletar
      const categoria = await prisma.categoriaUrgenciaChamado.update({
        where: { id },
        data: { ativo: false },
      });
      return NextResponse.json({ categoria });
    }

    await prisma.categoriaUrgenciaChamado.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar categoria de urgência:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar categoria de urgência' },
      { status: 500 }
    );
  }
}

