import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

interface DuplicatePayload {
  titulo?: string;
  unidadeId?: string;
  descricao?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();

  if (!me?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'create')) {
    return NextResponse.json(forbiddenPayload('checklists', 'create'), {
      status: 403,
    });
  }

  const { id } = await params;

  const payload = (await request.json().catch(() => ({}))) as DuplicatePayload;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: {
      grupos: {
        orderBy: { ordem: 'asc' },
        include: {
          perguntas: {
            orderBy: { ordem: 'asc' },
          },
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let grupoId: string | null = null;

  if (payload.unidadeId) {
    const unidade = await prisma.unidade.findUnique({
      where: { id: payload.unidadeId },
      select: {
        id: true,
        mapeamentos: {
          where: { ativo: true },
          select: { grupoId: true },
          take: 1,
        },
      },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'unit_not_found', message: 'Unidade não encontrada.' },
        { status: 404 }
      );
    }

    grupoId = unidade.mapeamentos[0]?.grupoId ?? null;
  }

  const novoTemplate = await prisma.checklistTemplate.create({
    data: {
      titulo: payload.titulo?.trim() || `${template.titulo} · Personalizado`,
      descricao: payload.descricao ?? template.descricao,
      ativo: true,
      criadoPorId: me.id,
      atualizadoPorId: me.id,
      grupos: {
        create: template.grupos.map(grupo => ({
          titulo: grupo.titulo,
          descricao: grupo.descricao,
          ordem: grupo.ordem,
          perguntas: {
            create: grupo.perguntas.map(pergunta => ({
              titulo: pergunta.titulo,
              descricao: pergunta.descricao,
              tipo: pergunta.tipo,
              obrigatoria: pergunta.obrigatoria,
              ordem: pergunta.ordem,
              instrucoes: pergunta.instrucoes,
              opcoes: pergunta.opcoes,
            })),
          },
        })),
      },
    },
    select: { id: true, titulo: true },
  });

  if (payload.unidadeId) {
    await prisma.checklistEscopo.create({
      data: {
        templateId: novoTemplate.id,
        unidadeId: payload.unidadeId,
        grupoId,
      },
    });
  }

  return NextResponse.json({ template: novoTemplate }, { status: 201 });
}


