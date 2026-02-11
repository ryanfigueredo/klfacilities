import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const pagarParcelaSchema = z.object({
  pago: z.boolean(), // true = marcar como pago, false = marcar como não pago
  observacoes: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ parcelaId: string }> }
) {
  try {
    const { parcelaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (
      !user ||
      !['MASTER', 'ADMIN', 'RH', 'JURIDICO'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = pagarParcelaSchema.parse(body);

    // Verificar se a parcela existe
    const parcela = await prisma.parcelaProcesso.findUnique({
      where: { id: parcelaId },
    });

    if (!parcela) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar parcela
    const data: any = {
      naoPago: !validatedData.pago, // Invertido: se pago=true, então naoPago=false
    };

    if (validatedData.pago) {
      // Marcar como pago
      data.status = 'PAGA';
      data.pagoEm = new Date();
      data.marcadoComoPagoPor = user.id;
      data.marcadoComoPagoEm = new Date();
    } else {
      // Marcar como não pago
      data.status = 'PENDENTE';
      data.pagoEm = null;
      data.marcadoComoPagoPor = null;
      data.marcadoComoPagoEm = null;
    }

    if (validatedData.observacoes !== undefined) {
      data.observacoes = validatedData.observacoes;
    }

    const parcelaAtualizada = await prisma.parcelaProcesso.update({
      where: { id: parcelaId },
      data: data as any,
    });

    return NextResponse.json({
      success: true,
      parcela: {
        ...parcelaAtualizada,
        valor: Number(parcelaAtualizada.valor),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar status da parcela:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar status da parcela' },
      { status: 500 }
    );
  }
}
