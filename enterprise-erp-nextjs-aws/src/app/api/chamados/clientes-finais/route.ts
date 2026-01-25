import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

// GET - Listar todos os clientes finais
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !['MASTER', 'ADMIN', 'OPERACIONAL'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get('ativo');
    const grupoId = searchParams.get('grupoId');
    const unidadeId = searchParams.get('unidadeId');

    const where: any = {};

    if (ativo !== null) {
      where.ativo = ativo === 'true';
    }

    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    if (grupoId) {
      where.grupos = {
        some: {
          grupoId: grupoId,
        },
      };
    }

    const clientesFinais = await prisma.clienteFinal.findMany({
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
            cidade: true,
            estado: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ data: clientesFinais });
  } catch (error) {
    console.error('Erro ao buscar clientes finais:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clientes finais' },
      { status: 500 }
    );
  }
}

// POST - Criar novo cliente final
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !['MASTER', 'ADMIN', 'OPERACIONAL'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, email, whatsapp, grupoIds, unidadeId, ativo } = body;

    // Validações
    if (!nome || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const emailExistente = await prisma.clienteFinal.findUnique({
      where: { email },
    });

    if (emailExistente) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Validar grupos se fornecidos
    const grupoIdsArray = Array.isArray(grupoIds) ? grupoIds.filter((id: string) => id && id !== '__none__') : [];
    
    if (grupoIdsArray.length > 0) {
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
    if (unidadeId && unidadeId !== '__none__') {
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

    const clienteFinal = await prisma.clienteFinal.create({
      data: {
        nome,
        email,
        whatsapp: whatsapp || null,
        unidadeId: unidadeId && unidadeId !== '__none__' ? unidadeId : null,
        ativo: ativo !== undefined ? ativo : true,
        grupos: grupoIdsArray.length > 0 ? {
          create: grupoIdsArray.map((grupoId: string) => ({
            grupoId,
          })),
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
            cidade: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json({ data: clienteFinal }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar cliente final:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar cliente final' },
      { status: 500 }
    );
  }
}

