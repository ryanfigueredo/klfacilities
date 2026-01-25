import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const unidadeId = searchParams.get('unidadeId');

    if (!grupoId) {
      return NextResponse.json(
        { error: 'grupoId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar unidades para o grupo (apenas unidades ativas)
    const mapeamentos = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: {
        grupoId,
        ativo: true,
        unidade: {
          ativa: true,
        },
      },
      include: {
        unidade: {
          select: {
            id: true,
            nome: true,
            ativa: true,
          },
        },
      },
    });

    // Usar Set para garantir unidades únicas
    const unidadesMap = new Map<string, { id: string; nome: string }>();
    mapeamentos.forEach(m => {
      if (m.unidade && m.unidade.ativa && !unidadesMap.has(m.unidade.id)) {
        unidadesMap.set(m.unidade.id, {
          id: m.unidade.id,
          nome: m.unidade.nome,
        });
      }
    });

    const unidadesData = Array.from(unidadesMap.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    // Se unidadeId foi especificado, buscar responsáveis
    let responsaveisData: any[] = [];

    if (unidadeId) {
      const responsaveis =
        await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
          where: {
            grupoId,
            unidadeId,
            ativo: true,
          },
          include: {
            responsavel: true,
          },
          distinct: ['responsavelId'],
        });

      responsaveisData = responsaveis.map(m => ({
        id: m.responsavel.id,
        nome: m.responsavel.nome,
      }));
    }

    return NextResponse.json({
      unidades: unidadesData,
      responsaveis: responsaveisData,
    });
  } catch (error) {
    console.error('Erro ao buscar mapeamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
