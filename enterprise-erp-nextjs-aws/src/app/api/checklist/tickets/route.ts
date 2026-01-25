import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authz';

export async function GET(request: NextRequest) {
  try {
    await requireRole(['read'], 'checklist');

    const { searchParams } = new URL(request.url);
    const unidadeId = searchParams.get('unidadeId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticketChecklist.findMany({
        where,
        include: {
          checklist: {
            select: {
              tipo: true,
              timestamp: true,
              servicosLimpeza: true,
              insumosSolicitados: true,
              avaliacaoLimpeza: true,
              fatoresInfluencia: true,
              comentarios: true,
            },
          },
          unidade: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticketChecklist.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
