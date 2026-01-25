import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Listar todos os funcionários e status de assinatura
export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || (me.role !== 'ADMIN' && me.role !== 'RH')) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const grupoId = searchParams.get('grupoId') || undefined;
    const unidadeId = searchParams.get('unidadeId') || undefined;
    const apenasNaoAssinados = searchParams.get('apenasNaoAssinados') === 'true';

    const where: any = {};
    if (grupoId) where.grupoId = grupoId;
    if (unidadeId) where.unidadeId = unidadeId;

    const funcionarios = await prisma.funcionario.findMany({
      where,
      include: {
        grupo: true,
        unidade: true,
        termoCiencia: true,
      },
      orderBy: { nome: 'asc' },
    });

    let resultado = funcionarios.map((f) => ({
      id: f.id,
      nome: f.nome,
      cpf: f.cpf,
      grupo: f.grupo.nome,
      unidade: f.unidade?.nome || 'Não definida',
      assinado: !!f.termoCiencia,
      assinadoEm: f.termoCiencia?.assinadoEm || null,
      versaoTermo: f.termoCiencia?.versaoTermo || null,
    }));

    if (apenasNaoAssinados) {
      resultado = resultado.filter((f) => !f.assinado);
    }

    const stats = {
      total: funcionarios.length,
      assinados: funcionarios.filter((f) => !!f.termoCiencia).length,
      naoAssinados: funcionarios.filter((f) => !f.termoCiencia).length,
      percentualAssinados:
        funcionarios.length > 0
          ? Math.round(
              (funcionarios.filter((f) => !!f.termoCiencia).length /
                funcionarios.length) *
                100
            )
          : 0,
    };

    return NextResponse.json({
      funcionarios: resultado,
      estatisticas: stats,
    });
  } catch (error: any) {
    console.error('Erro ao listar termos de ciência:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar termos de ciência' },
      { status: 500 }
    );
  }
}

