import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(['read'], 'unidades');

    const unidade = await prisma.unidade.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nome: true,
        whatsappLider: true,
        whatsappSupervisor: true,
        emailSupervisor: true,
      },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: unidade,
    });
  } catch (error) {
    console.error('Erro ao buscar contatos da unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(['update'], 'unidades');

    const body = await request.json();
    const { whatsappLider, whatsappSupervisor, emailSupervisor } = body;

    // Validação básica do WhatsApp (mais flexível)
    if (whatsappLider && whatsappLider.trim()) {
      const cleanPhone = whatsappLider.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return NextResponse.json(
          {
            error: 'Número de WhatsApp do líder deve ter entre 10 e 15 dígitos',
          },
          { status: 400 }
        );
      }
    }

    if (whatsappSupervisor && whatsappSupervisor.trim()) {
      const cleanPhone = whatsappSupervisor.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return NextResponse.json(
          {
            error:
              'Número de WhatsApp do supervisor deve ter entre 10 e 15 dígitos',
          },
          { status: 400 }
        );
      }
    }

    if (
      emailSupervisor &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSupervisor)
    ) {
      return NextResponse.json(
        { error: 'Email do supervisor inválido' },
        { status: 400 }
      );
    }

    const unidade = await prisma.unidade.update({
      where: { id: params.id },
      data: {
        whatsappLider: whatsappLider || null,
        whatsappSupervisor: whatsappSupervisor || null,
        emailSupervisor: emailSupervisor || null,
      },
      select: {
        id: true,
        nome: true,
        whatsappLider: true,
        whatsappSupervisor: true,
        emailSupervisor: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: unidade,
    });
  } catch (error) {
    console.error('Erro ao atualizar contatos da unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
