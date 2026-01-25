import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const contatoSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .min(8, 'Número de WhatsApp inválido')
    .max(30, 'Número de WhatsApp inválido')
    .optional()
    .nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const payload = contatoSchema.parse(body);

    const supervisor = await prisma.user.findUnique({
      where: { id: params.id, role: 'SUPERVISOR' },
      select: { id: true },
    });

    if (!supervisor) {
      return NextResponse.json(
        { error: 'Supervisor não encontrado' },
        { status: 404 }
      );
    }

    let whatsapp: string | null = payload.whatsapp ?? null;
    if (whatsapp) {
      const digits = whatsapp.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json(
          {
            error:
              'Número de WhatsApp deve conter entre 10 e 15 dígitos após remover símbolos.',
          },
          { status: 400 }
        );
      }
      whatsapp = digits;
    }

    const updated = await prisma.user.update({
      where: { id: supervisor.id },
      data: { whatsapp },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
      },
    });

    return NextResponse.json({ supervisor: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar contato do supervisor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['MASTER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    const supervisor = await prisma.user.findUnique({
      where: { id, role: { in: ['SUPERVISOR', 'LAVAGEM'] } },
      select: { id: true, name: true, ativo: true },
    });

    if (!supervisor) {
      return NextResponse.json(
        { error: 'Supervisor não encontrado' },
        { status: 404 }
      );
    }

    // Desativar o supervisor (soft delete) - mantém registros históricos
    await prisma.user.update({
      where: { id: supervisor.id },
      data: { ativo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Supervisor desativado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao desativar supervisor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

