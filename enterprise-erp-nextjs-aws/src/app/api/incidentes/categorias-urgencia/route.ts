import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/auth/policy';
import { getUrgenciaConfig, type UrgenciaNivel } from '@/lib/urgencia-helper';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser(request);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Apenas ADMIN, OPERACIONAL e MASTER podem ver categorias
    if (!can(me.role, 'incidentes', 'list')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const categorias = await prisma.categoriaUrgenciaChamado.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error('Erro ao listar categorias de urgência:', error);
    return NextResponse.json(
      { error: 'Erro ao listar categorias de urgência' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await getCurrentUser(request);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Apenas ADMIN, OPERACIONAL e MASTER podem criar categorias
    if (!can(me.role, 'incidentes', 'create')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { urgenciaNivel, nome } = body;

    if (!urgenciaNivel || !nome) {
      return NextResponse.json(
        { error: 'Urgência e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar nível de urgência
    const niveisValidos: UrgenciaNivel[] = ['CRITICA', 'ALTA', 'NORMAL', 'BAIXA', 'MUITO_BAIXA'];
    if (!niveisValidos.includes(urgenciaNivel)) {
      return NextResponse.json(
        { error: 'Nível de urgência inválido' },
        { status: 400 }
      );
    }

    // Calcular prazo, descrição e ordem baseado no nível de urgência
    const config = getUrgenciaConfig(urgenciaNivel);

    const categoria = await prisma.categoriaUrgenciaChamado.create({
      data: {
        urgenciaNivel,
        nome,
        prazoHoras: config.prazoHoras,
        descricao: config.descricao,
        ordem: config.ordem,
        ativo: true,
      },
    });

    return NextResponse.json({ categoria }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar categoria de urgência:', error);
    return NextResponse.json(
      { error: 'Erro ao criar categoria de urgência' },
      { status: 500 }
    );
  }
}

