import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const parcelaSchema = z.object({
  id: z.string().optional(), // ID para atualizar parcela existente
  valor: z.coerce.number().min(0.01, 'Valor da parcela deve ser maior que zero'),
  diaVencimento: z.number().int().min(1).max(31),
  mesVencimento: z.number().int().min(1).max(12),
  anoVencimento: z.number().int().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const processoSchema = z.object({
  numeroProcesso: z.string().min(1, 'Número do processo é obrigatório').optional(),
  reclamante: z.string().optional().nullable(),
  advogado: z.string().optional().nullable(),
  escritorio: z.string().optional().nullable(),
  tipoProcesso: z.string().optional().nullable(),
  valorCausa: z.coerce.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(['EM_ANDAMENTO', 'ARQUIVADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO']).optional(),
  parcelas: z.array(parcelaSchema).optional(),
  // Novos campos de pagamento
  custasProcessuais: z.coerce.number().optional().nullable(),
  contribuicoesPrevidenciarias: z.coerce.number().optional().nullable(),
  honorariosPericiais: z.coerce.number().optional().nullable(),
  dadosPagamento: z.string().optional().nullable(),
  contasBancarias: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (ADMIN, RH ou JURIDICO)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (
      !user ||
      !['MASTER', 'ADMIN', 'RH', 'JURIDICO'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Apenas MASTER e JURIDICO podem editar valores
    if (!['MASTER', 'JURIDICO'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Apenas usuários Jurídico podem editar valores de processos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = processoSchema.parse(body);

    const data: any = {};
    if (validatedData.numeroProcesso !== undefined) data.numeroProcesso = validatedData.numeroProcesso;
    if (validatedData.reclamante !== undefined) data.reclamante = validatedData.reclamante;
    if (validatedData.advogado !== undefined) data.advogado = validatedData.advogado;
    if (validatedData.escritorio !== undefined) data.escritorio = validatedData.escritorio;
    if (validatedData.tipoProcesso !== undefined) data.tipoProcesso = validatedData.tipoProcesso;
    if (validatedData.valorCausa !== undefined) {
      data.valorCausa = validatedData.valorCausa ? new Decimal(validatedData.valorCausa) : null;
    }
    if (validatedData.observacoes !== undefined) data.observacoes = validatedData.observacoes;
    if (validatedData.status !== undefined) data.status = validatedData.status;
    if (validatedData.custasProcessuais !== undefined) {
      data.custasProcessuais = validatedData.custasProcessuais ? new Decimal(validatedData.custasProcessuais) : null;
    }
    if (validatedData.contribuicoesPrevidenciarias !== undefined) {
      data.contribuicoesPrevidenciarias = validatedData.contribuicoesPrevidenciarias ? new Decimal(validatedData.contribuicoesPrevidenciarias) : null;
    }
    if (validatedData.honorariosPericiais !== undefined) {
      data.honorariosPericiais = validatedData.honorariosPericiais ? new Decimal(validatedData.honorariosPericiais) : null;
    }
    if (validatedData.dadosPagamento !== undefined) data.dadosPagamento = validatedData.dadosPagamento;
    if (validatedData.contasBancarias !== undefined) data.contasBancarias = validatedData.contasBancarias;

    // Gerenciar parcelas se fornecidas
    if (validatedData.parcelas !== undefined) {
      // Deletar parcelas existentes e criar novas
      await prisma.parcelaProcesso.deleteMany({
        where: { processoJuridicoId: id },
      });

      data.parcelas = {
        create: validatedData.parcelas.map((parcela) => ({
          valor: new Decimal(parcela.valor),
          diaVencimento: parcela.diaVencimento,
          mesVencimento: parcela.mesVencimento,
          anoVencimento: parcela.anoVencimento,
          observacoes: parcela.observacoes,
        })),
      };
    }

    const processo = await prisma.processoJuridico.update({
      where: { id },
      data: data as any,
      include: {
        criadoPor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parcelas: {
          orderBy: [
            { anoVencimento: 'asc' },
            { mesVencimento: 'asc' },
            { diaVencimento: 'asc' },
          ],
        } as any,
      },
    });

    // Converter Decimal para number
    const processoSerializado = {
      ...processo,
      valorCausa: processo.valorCausa ? Number(processo.valorCausa) : null,
      custasProcessuais: (processo as any).custasProcessuais ? Number((processo as any).custasProcessuais) : null,
      contribuicoesPrevidenciarias: (processo as any).contribuicoesPrevidenciarias ? Number((processo as any).contribuicoesPrevidenciarias) : null,
      honorariosPericiais: (processo as any).honorariosPericiais ? Number((processo as any).honorariosPericiais) : null,
      dadosPagamento: (processo as any).dadosPagamento || null,
      contasBancarias: (processo as any).contasBancarias || null,
      parcelas: processo.parcelas.map((parcela) => ({
        ...parcela,
        valor: Number(parcela.valor),
        comprovantePagamentoUrl: (parcela as any).comprovantePagamentoUrl || null,
        marcadoComoPagoPor: (parcela as any).marcadoComoPagoPor || null,
        marcadoComoPagoEm: (parcela as any).marcadoComoPagoEm || null,
        naoPago: (parcela as any).naoPago || false,
        marcadoPor: (parcela as any).marcadoPor || null,
      })),
    };

    return NextResponse.json({ processo: processoSerializado });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar processo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar processo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (ADMIN, RH ou JURIDICO)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (
      !user ||
      !['MASTER', 'ADMIN', 'RH', 'JURIDICO'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    await prisma.processoJuridico.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Processo excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir processo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir processo' },
      { status: 500 }
    );
  }
}
