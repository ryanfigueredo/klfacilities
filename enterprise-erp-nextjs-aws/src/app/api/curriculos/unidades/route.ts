import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Listar estados e cidades de unidades ativas para o formulário público
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    if (estado) {
      // Retornar apenas cidades do estado solicitado
      const unidades = await prisma.unidade.findMany({
        where: {
          ativa: true,
          cidade: { not: null },
          estado: estado.toUpperCase(),
        },
        select: {
          cidade: true,
        },
        distinct: ['cidade'],
        orderBy: {
          cidade: 'asc',
        },
      });

      const cidades = unidades
        .map((u) => u.cidade)
        .filter((c): c is string => Boolean(c));

      return NextResponse.json({ cidades });
    }

    // Retornar estados únicos com suas cidades
    const unidades = await prisma.unidade.findMany({
      where: {
        ativa: true,
        cidade: { not: null },
        estado: { not: null },
      },
      select: {
        estado: true,
        cidade: true,
      },
      orderBy: [
        { estado: 'asc' },
        { cidade: 'asc' },
      ],
    });

    // Agrupar por estado
    const estadosMap = new Map<string, Set<string>>();
    unidades.forEach((u) => {
      if (u.estado && u.cidade) {
        if (!estadosMap.has(u.estado)) {
          estadosMap.set(u.estado, new Set());
        }
        estadosMap.get(u.estado)!.add(u.cidade);
      }
    });

    // Converter para array de estados com cidades
    const estados = Array.from(estadosMap.entries())
      .map(([sigla, cidadesSet]) => ({
        sigla,
        cidades: Array.from(cidadesSet).sort(),
      }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla));

    return NextResponse.json({ estados });
  } catch (error: any) {
    console.error('Erro ao listar estados/cidades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
