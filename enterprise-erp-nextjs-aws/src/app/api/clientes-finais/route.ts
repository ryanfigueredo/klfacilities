import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const createClienteFinalSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().optional().nullable(),
  grupoId: z.string().min(1, 'Grupo é obrigatório'),
  unidadeId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas MASTER, OPERACIONAL e ADMIN podem ver clientes finais
    const allowedRoles = ['MASTER', 'OPERACIONAL', 'ADMIN'];
    if (!allowedRoles.includes(me.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar clientes finais' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const unidadeId = searchParams.get('unidadeId');
    const ativo = searchParams.get('ativo');

    const where: any = {};
    if (grupoId) {
      where.grupos = {
        some: {
          grupoId: grupoId,
        },
      };
    }
    if (unidadeId) where.unidadeId = unidadeId;
    if (ativo !== null) where.ativo = ativo === 'true';

    const clientes = await prisma.clienteFinal.findMany({
      where,
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
      orderBy: {
        nome: 'asc',
      },
    });

    return NextResponse.json({ clientes });
  } catch (error) {
    console.error('Erro ao buscar clientes finais:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clientes finais' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas MASTER, OPERACIONAL e ADMIN podem criar clientes finais
    const allowedRoles = ['MASTER', 'OPERACIONAL', 'ADMIN'];
    if (!allowedRoles.includes(me.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para criar clientes finais' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createClienteFinalSchema.parse(body);

    // Verificar se email já existe
    const existing = await prisma.clienteFinal.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Validar que grupo foi informado
    if (!data.grupoId) {
      return NextResponse.json(
        { error: 'Grupo é obrigatório' },
        { status: 400 }
      );
    }

    // Se unidade foi informada, verificar se está vinculada ao grupo
    if (data.unidadeId) {
      const mapeamento = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
        where: {
          grupoId: data.grupoId,
          unidadeId: data.unidadeId,
          ativo: true,
        },
      });

      if (!mapeamento) {
        return NextResponse.json(
          {
            error:
              'Unidade não está vinculada ao grupo selecionado. Por favor, selecione uma unidade válida ou deixe em branco.',
          },
          { status: 400 }
        );
      }
    }

    const cliente = await prisma.clienteFinal.create({
      data: {
        nome: data.nome,
        email: data.email,
        whatsapp: data.whatsapp || null,
        unidadeId: data.unidadeId || null,
        grupos: data.grupoId ? {
          create: {
            grupoId: data.grupoId,
          },
        } : undefined,
      },
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

    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar cliente final:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cliente final' },
      { status: 500 }
    );
  }
}

