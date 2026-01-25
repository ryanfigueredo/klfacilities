import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const updateClienteFinalSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  whatsapp: z.string().optional().nullable(),
  grupoId: z.string().optional().nullable(),
  unidadeId: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.clienteFinal.findUnique({
      where: { id },
      include: {
        grupos: {
          include: {
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente final não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cliente });
  } catch (error) {
    console.error('Erro ao buscar cliente final:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente final' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allowedRoles = ['MASTER', 'OPERACIONAL', 'ADMIN'];
    if (!allowedRoles.includes(me.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para editar clientes finais' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateClienteFinalSchema.parse(body);

    // Se email está sendo alterado, verificar se já existe
    if (data.email) {
      const existing = await prisma.clienteFinal.findFirst({
        where: {
          email: data.email,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Email já cadastrado' },
          { status: 400 }
        );
      }
    }

    // Se não for apenas atualização de status, validar grupo
    if (data.ativo === undefined) {
      // Buscar cliente atual para verificar se grupo/unidade estão sendo alterados
      const clienteAtual = await prisma.clienteFinal.findUnique({
        where: { id },
        select: {
          unidadeId: true,
          grupos: {
            select: {
              grupoId: true,
            },
          },
        },
      });

      // Este endpoint não suporta mais grupoId único, apenas grupoIds (array)
      // Se grupoId foi fornecido, converter para array
      const grupoIdsFinal = data.grupoId !== undefined 
        ? (data.grupoId ? [data.grupoId] : [])
        : (clienteAtual?.grupos?.map(cfg => cfg.grupoId) || []);
      
      const unidadeIdFinal = data.unidadeId !== undefined ? data.unidadeId : clienteAtual?.unidadeId;

      // Se unidade foi informada e há grupos, verificar se está vinculada a algum grupo
      if (unidadeIdFinal && grupoIdsFinal.length > 0) {
        const mapeamento = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
          where: {
            grupoId: { in: grupoIdsFinal },
            unidadeId: unidadeIdFinal,
            ativo: true,
          },
        });

        if (!mapeamento) {
          return NextResponse.json(
            {
              error:
                'Unidade não está vinculada a nenhum dos grupos selecionados. Por favor, selecione uma unidade válida ou deixe em branco.',
            },
            { status: 400 }
          );
        }
      }
    }

    // Preparar dados de atualização
    const updateData: any = {
      ...(data.nome && { nome: data.nome }),
      ...(data.email && { email: data.email }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.unidadeId !== undefined && { unidadeId: data.unidadeId }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    };

    // Se grupoId foi fornecido, atualizar relacionamentos many-to-many
    if (data.grupoId !== undefined) {
      // Deletar grupos existentes
      await prisma.clienteFinalGrupo.deleteMany({
        where: { clienteFinalId: id },
      });
      
      // Criar novos relacionamentos se grupoId não for null
      if (data.grupoId) {
        updateData.grupos = {
          create: {
            grupoId: data.grupoId,
          },
        };
      }
    }

    const cliente = await prisma.clienteFinal.update({
      where: { id },
      data: updateData,
      include: {
        grupos: {
          include: {
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return NextResponse.json({ cliente });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar cliente final:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente final' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allowedRoles = ['MASTER', 'OPERACIONAL', 'ADMIN'];
    if (!allowedRoles.includes(me.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para excluir clientes finais' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.clienteFinal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir cliente final:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cliente final' },
      { status: 500 }
    );
  }
}

