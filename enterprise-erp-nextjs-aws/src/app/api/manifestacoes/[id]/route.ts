import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateManifestacaoSchema = z.object({
  status: z.enum(['PENDENTE', 'EM_ANALISE', 'RESOLVIDA', 'ARQUIVADA']).optional(),
  resposta: z.string().optional(),
});

// PUT - Atualizar manifestação (responder, mudar status)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = session.user.role;
    // MASTER, RH e OPERACIONAL podem atualizar manifestações
    if (!['MASTER', 'RH', 'OPERACIONAL'].includes(userRole)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateManifestacaoSchema.parse(body);

    const updateData: any = {};
    if (validated.status) updateData.status = validated.status;
    if (validated.resposta !== undefined) {
      updateData.resposta = validated.resposta;
      updateData.respondidoPorId = session.user.id;
      updateData.respondidoEm = new Date();
    }

    const manifestacao = await prisma.manifestacaoFuncionario.update({
      where: { id },
      data: updateData,
      include: {
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
    });

    return NextResponse.json({
      ok: true,
      manifestacao,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar manifestação:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Erro de validação' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar manifestação' },
      { status: 500 }
    );
  }
}

