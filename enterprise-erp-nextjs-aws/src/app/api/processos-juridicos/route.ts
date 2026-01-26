import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const parcelaSchema = z.object({
  valor: z.coerce.number().min(0.01, 'Valor da parcela deve ser maior que zero'),
  diaVencimento: z.number().int().min(1).max(31),
  mesVencimento: z.number().int().min(1).max(12),
  anoVencimento: z.number().int().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const processoSchema = z.object({
  numeroProcesso: z.string().min(1, 'Número do processo é obrigatório'),
  reclamante: z.string().optional().nullable(),
  advogado: z.string().optional().nullable(),
  escritorio: z.string().optional().nullable(),
  tipoProcesso: z.string().optional().nullable(),
  valorCausa: z.coerce.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(['EM_ANDAMENTO', 'ARQUIVADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO']).optional(),
  parcelas: z.array(parcelaSchema).optional().default([]),
  // Novos campos de pagamento
  custasProcessuais: z.coerce.number().optional().nullable(),
  contribuicoesPrevidenciarias: z.coerce.number().optional().nullable(),
  honorariosPericiais: z.coerce.number().optional().nullable(),
  dadosPagamento: z.string().optional().nullable(),
  contasBancarias: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { numeroProcesso: { contains: search, mode: 'insensitive' } },
        { reclamante: { contains: search, mode: 'insensitive' } },
        { advogado: { contains: search, mode: 'insensitive' } },
        { escritorio: { contains: search, mode: 'insensitive' } },
        { tipoProcesso: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const processos = await prisma.processoJuridico.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Converter Decimal para number para serialização JSON
    const processosSerializados = processos.map((p) => ({
      ...p,
      valorCausa: p.valorCausa ? Number(p.valorCausa) : null,
      custasProcessuais: (p as any).custasProcessuais ? Number((p as any).custasProcessuais) : null,
      contribuicoesPrevidenciarias: (p as any).contribuicoesPrevidenciarias ? Number((p as any).contribuicoesPrevidenciarias) : null,
      honorariosPericiais: (p as any).honorariosPericiais ? Number((p as any).honorariosPericiais) : null,
      dadosPagamento: (p as any).dadosPagamento || null,
      contasBancarias: (p as any).contasBancarias || null,
      parcelas: p.parcelas.map((parcela) => ({
        ...parcela,
        valor: Number(parcela.valor),
        comprovantePagamentoUrl: (parcela as any).comprovantePagamentoUrl || null,
        marcadoComoPagoPor: (parcela as any).marcadoComoPagoPor || null,
        marcadoComoPagoEm: (parcela as any).marcadoComoPagoEm || null,
        naoPago: (parcela as any).naoPago || false,
        marcadoPor: (parcela as any).marcadoPor || null,
      })),
    }));

    return NextResponse.json({ processos: processosSerializados });
  } catch (error: any) {
    console.error('Erro ao listar processos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar processos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // Apenas MASTER e JURIDICO podem criar processos (editar valores)
    if (!['MASTER', 'JURIDICO'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Apenas usuários Jurídico podem criar processos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = processoSchema.parse(body);

    const processo = await prisma.processoJuridico.create({
      data: {
        numeroProcesso: validatedData.numeroProcesso,
        reclamante: validatedData.reclamante,
        advogado: validatedData.advogado,
        escritorio: validatedData.escritorio,
        tipoProcesso: validatedData.tipoProcesso,
        valorCausa: validatedData.valorCausa ? new Decimal(validatedData.valorCausa) : null,
        observacoes: validatedData.observacoes,
        status: validatedData.status || 'EM_ANDAMENTO',
        custasProcessuais: validatedData.custasProcessuais ? new Decimal(validatedData.custasProcessuais) : null,
        contribuicoesPrevidenciarias: validatedData.contribuicoesPrevidenciarias ? new Decimal(validatedData.contribuicoesPrevidenciarias) : null,
        honorariosPericiais: validatedData.honorariosPericiais ? new Decimal(validatedData.honorariosPericiais) : null,
        dadosPagamento: validatedData.dadosPagamento,
        contasBancarias: validatedData.contasBancarias,
        criadoPorId: session.user.id,
        parcelas: {
          create: validatedData.parcelas?.map((parcela) => ({
            valor: new Decimal(parcela.valor),
            diaVencimento: parcela.diaVencimento,
            mesVencimento: parcela.mesVencimento,
            anoVencimento: parcela.anoVencimento,
            observacoes: parcela.observacoes,
          })) || [],
        },
      } as any,
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

    return NextResponse.json({ processo: processoSerializado }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao criar processo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar processo' },
      { status: 500 }
    );
  }
}
