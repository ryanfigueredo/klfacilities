import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar cliente final pelo email
    const clienteFinal = await prisma.clienteFinal.findUnique({
      where: { email },
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
        { error: 'Email não cadastrado' },
        { status: 404 }
      );
    }

    if (!clienteFinal.ativo) {
      return NextResponse.json(
        { error: 'Email cadastrado está inativo' },
        { status: 403 }
      );
    }

    // Se o cliente tem unidade específica vinculada, retornar apenas essa
    if (clienteFinal.unidadeId && clienteFinal.unidade) {
      // Buscar o grupo da unidade através do mapeamento
      const mapeamento = await prisma.mapeamentoGrupoUnidadeResponsavel.findFirst({
        where: {
          unidadeId: clienteFinal.unidadeId,
          ativo: true,
        },
        include: {
          grupo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });

      return NextResponse.json({
        grupo: mapeamento?.grupo || null,
        grupos: mapeamento?.grupo ? [mapeamento.grupo] : [],
        unidades: [clienteFinal.unidade],
        clienteFinal: {
          nome: clienteFinal.nome,
          email: clienteFinal.email,
        },
      });
    }

    // Se o cliente tem grupos vinculados, buscar todas as unidades de todos os grupos
    if (clienteFinal.grupos && clienteFinal.grupos.length > 0) {
      const grupoIds = clienteFinal.grupos.map(cfg => cfg.grupoId);
      
      // Buscar todas as unidades de todos os grupos vinculados
      const mapeamentos = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
        where: {
          grupoId: { in: grupoIds },
          ativo: true,
        },
        include: {
          grupo: {
            select: {
              id: true,
              nome: true,
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
        distinct: ['unidadeId'],
      });

      const unidades = mapeamentos
        .map(m => {
          if (!m.unidade || !m.unidade.id) return null;
          return {
            id: m.unidade.id,
            nome: m.unidade.nome,
            cidade: m.unidade.cidade,
            estado: m.unidade.estado,
            grupoId: m.grupoId,
          };
        })
        .filter((u): u is NonNullable<typeof u> => u !== null);

      const grupos = clienteFinal.grupos
        .map(cfg => cfg.grupo)
        .filter((g): g is NonNullable<typeof g> => g !== null && g.id !== null)
        .map(g => ({
          id: g.id,
          nome: g.nome,
        }));

      return NextResponse.json({
        grupo: grupos.length === 1 ? grupos[0] : null,
        grupos: grupos,
        unidades: unidades,
        clienteFinal: {
          nome: clienteFinal.nome,
          email: clienteFinal.email,
        },
      });
    }

    // Se não tiver vinculação, retornar vazio
    return NextResponse.json({
      grupo: null,
      grupos: [],
      unidades: [],
      clienteFinal: {
        nome: clienteFinal.nome,
        email: clienteFinal.email,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar opções de chamado:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar opções' },
      { status: 500 }
    );
  }
}

