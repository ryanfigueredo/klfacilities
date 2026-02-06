import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createManifestacaoSchema = z.object({
  tipo: z.enum(['ELOGIO', 'SUGESTAO', 'DENUNCIA']),
  mensagem: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  funcionarioNome: z.string().optional(),
  funcionarioCpf: z.string().optional(),
  grupoId: z.string().optional(),
  unidadeId: z.string().optional(),
});

// POST - Criar manifestação (público)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createManifestacaoSchema.parse(body);

    const manifestacao = await prisma.manifestacaoFuncionario.create({
      data: {
        tipo: validated.tipo,
        mensagem: validated.mensagem,
        funcionarioNome: validated.funcionarioNome || null,
        funcionarioCpf: validated.funcionarioCpf || null,
        grupoId: validated.grupoId || null,
        unidadeId: validated.unidadeId || null,
        status: 'PENDENTE',
      },
    });

    return NextResponse.json({
      ok: true,
      manifestacao: {
        id: manifestacao.id,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar manifestação:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Erro de validação' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Erro ao criar manifestação' },
      { status: 500 }
    );
  }
}

// GET - Listar manifestações (autenticado, apenas ADMIN e RH)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = session.user.role;
    // MASTER, RH e OPERACIONAL podem acessar manifestações
    if (!['MASTER', 'RH', 'OPERACIONAL'].includes(userRole)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const unidadeId = searchParams.get('unidadeId');
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');

    const where: any = {};
    if (unidadeId) where.unidadeId = unidadeId;
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;

    const manifestacoes = await prisma.manifestacaoFuncionario.findMany({
      where,
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
          },
        },
        respondidoPor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      ok: true,
      manifestacoes,
    });
  } catch (error: any) {
    console.error('Erro ao listar manifestações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar manifestações' },
      { status: 500 }
    );
  }
}

