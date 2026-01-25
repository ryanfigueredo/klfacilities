import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

// GET - Buscar cliente final por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !['MASTER', 'ADMIN', 'OPERACIONAL'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const clienteFinal = await prisma.clienteFinal.findUnique({
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
            cidade: true,
            estado: true,
          },
        },
      },
    });

    if (!clienteFinal) {
      return NextResponse.json(
        { error: 'Cliente final não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: clienteFinal });
  } catch (error) {
    console.error('Erro ao buscar cliente final:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente final' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar cliente final
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !['MASTER', 'ADMIN', 'OPERACIONAL'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { nome, email, whatsapp, grupoIds, unidadeId, ativo } = body;

    // Verificar se cliente existe
    const clienteExistente = await prisma.clienteFinal.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: 'Cliente final não encontrado' },
        { status: 404 }
      );
    }

    // Validar email se fornecido
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Email inválido' },
          { status: 400 }
        );
      }

      // Verificar se email já existe em outro cliente
      if (email !== clienteExistente.email) {
        const emailExistente = await prisma.clienteFinal.findUnique({
          where: { email },
        });

        if (emailExistente) {
          return NextResponse.json(
            { error: 'Email já cadastrado para outro cliente' },
            { status: 400 }
          );
        }
      }
    }

    // Validar grupos se fornecidos
    const grupoIdsArray = grupoIds !== undefined 
      ? (Array.isArray(grupoIds) ? grupoIds.filter((id: string) => id && id !== '__none__') : [])
      : undefined;

    if (grupoIdsArray !== undefined && grupoIdsArray.length > 0) {
      const gruposExistentes = await prisma.grupo.findMany({
        where: {
          id: { in: grupoIdsArray },
        },
      });
      
      if (gruposExistentes.length !== grupoIdsArray.length) {
        return NextResponse.json(
          { error: 'Um ou mais grupos não foram encontrados' },
          { status: 400 }
        );
      }
    }

    // Validar unidade se fornecida
    if (unidadeId !== undefined && unidadeId && unidadeId !== '__none__') {
      const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
      });
      if (!unidade) {
        return NextResponse.json(
          { error: 'Unidade não encontrada' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;
    if (unidadeId !== undefined) updateData.unidadeId = unidadeId && unidadeId !== '__none__' ? unidadeId : null;
    if (ativo !== undefined) updateData.ativo = ativo;

    // Atualizar grupos se fornecido
    if (grupoIdsArray !== undefined) {
      // Deletar grupos existentes
      await prisma.clienteFinalGrupo.deleteMany({
        where: { clienteFinalId: id },
      });
      
      // Criar novos relacionamentos
      if (grupoIdsArray.length > 0) {
        updateData.grupos = {
          create: grupoIdsArray.map((grupoId: string) => ({
            grupoId,
          })),
        };
      }
    }

    const clienteFinal = await prisma.clienteFinal.update({
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
            cidade: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json({ data: clienteFinal });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente final:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar cliente final' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar cliente final
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !['MASTER', 'ADMIN', 'OPERACIONAL'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar se cliente existe
    const clienteExistente = await prisma.clienteFinal.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: 'Cliente final não encontrado' },
        { status: 404 }
      );
    }

    await prisma.clienteFinal.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Cliente final deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar cliente final:', error);
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível deletar cliente final com chamados vinculados' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao deletar cliente final' },
      { status: 500 }
    );
  }
}

