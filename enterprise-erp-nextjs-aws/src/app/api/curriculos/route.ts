import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

// GET - Listar currículos (apenas RH, OPERACIONAL e SUPERVISOR)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // MASTER, RH, OPERACIONAL e SUPERVISOR podem acessar banco de talentos
    if (!['MASTER', 'RH', 'OPERACIONAL', 'SUPERVISOR'].includes(user.role)) {
      console.error('GET /api/curriculos: Role inválida', user.role);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const unidadeId = searchParams.get('unidadeId');
    const status = searchParams.get('status');

    const where: any = {};
    let allowedUnidades: string[] | null = null;

    if (user.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(user.id);
      allowedUnidades = scope.unidadeIds;
      if (!allowedUnidades.length) {
        return NextResponse.json({ curriculos: [] });
      }
      if (unidadeId) {
        if (!allowedUnidades.includes(unidadeId)) {
          return NextResponse.json({ curriculos: [] });
        }
        where.unidadeId = unidadeId;
      } else {
        where.unidadeId = { in: allowedUnidades };
      }
    } else if (unidadeId) {
      where.unidadeId = unidadeId;
    }
    if (status) {
      where.status = status;
    }

    const curriculos = await prisma.curriculo.findMany({
      where,
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        telefone: true,
        email: true,
        endereco: true,
        arquivoUrl: true,
        observacoes: true,
        status: true,
        origem: true,
        origemId: true,
        origemDados: true,
        createdAt: true,
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

    return NextResponse.json({ curriculos });
  } catch (error: any) {
    console.error('Erro ao listar currículos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar currículos' },
      { status: 500 }
    );
  }
}

// POST - Criar currículo manualmente (apenas RH e OPERACIONAL)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // MASTER, RH e OPERACIONAL podem criar currículos
    if (!user || !['MASTER', 'RH', 'OPERACIONAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      nome,
      sobrenome,
      telefone,
      estado,
      cidade,
      email,
      endereco,
      observacoes,
    } = body;

    // Validações obrigatórias
    if (!nome || !sobrenome || !telefone || !estado || !cidade) {
      return NextResponse.json(
        {
          error: 'Nome, sobrenome, telefone, estado e cidade são obrigatórios',
        },
        { status: 400 }
      );
    }

    // Buscar ou criar uma unidade na cidade/estado informados
    let unidade = await prisma.unidade.findFirst({
      where: {
        cidade: cidade.trim(),
        estado: estado.trim().toUpperCase(),
        ativa: true,
      },
    });

    if (!unidade) {
      // Criar uma unidade temporária se não existir
      unidade = await prisma.unidade.create({
        data: {
          nome: `${cidade.trim()} - ${estado.trim().toUpperCase()}`,
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
          ativa: true,
        },
      });
    }

    // Criar currículo sem arquivo (arquivoUrl placeholder)
    const curriculo = await prisma.curriculo.create({
      data: {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim(),
        email: email?.trim() || null,
        endereco: endereco?.trim() || null,
        observacoes: observacoes?.trim() || null,
        unidadeId: unidade.id,
        arquivoUrl: 'manual://sem-arquivo', // Placeholder para currículos criados manualmente
        status: 'PENDENTE',
        origem: 'MANUAL', // Currículos criados manualmente
      },
      include: {
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

    return NextResponse.json({ curriculo }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar currículo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar currículo' },
      { status: 500 }
    );
  }
}
