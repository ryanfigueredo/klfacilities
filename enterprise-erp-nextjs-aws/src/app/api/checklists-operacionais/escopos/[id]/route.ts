import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';

export const maxDuration = 60;
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { id } = await params;

  const escopo = await prisma.checklistEscopo.findUnique({
    where: { id },
    include: {
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      grupo: {
        select: {
          id: true,
          nome: true,
        },
      },
      template: {
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
      },
    },
  });

  if (!escopo || !escopo.template.ativo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.length) {
      return NextResponse.json(
        {
          error: 'Sem permissão',
          message:
            'Você não está vinculado a nenhuma unidade ou grupo. Peça a um administrador para configurar seu escopo em Supervisores.',
          code: 'scope_vazio',
        },
        { status: 403 }
      );
    }
    if (!scope.unidadeIds.includes(escopo.unidadeId)) {
      return NextResponse.json(
        {
          error: 'Sem permissão para este checklist',
          message:
            'Esta unidade não está no seu escopo. Você só pode acessar checklists das unidades/grupos aos quais está vinculado.',
          code: 'unidade_fora_do_escopo',
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    escopo: {
      id: escopo.id,
      unidade: escopo.unidade,
      grupo: escopo.grupo,
      template: {
        id: escopo.template.id,
        titulo: escopo.template.titulo,
        descricao: escopo.template.descricao,
        grupos: escopo.template.grupos.map(grupo => ({
          id: grupo.id,
          titulo: grupo.titulo,
          descricao: grupo.descricao,
          ordem: grupo.ordem,
          perguntas: grupo.perguntas.map(pergunta => ({
            id: pergunta.id,
            titulo: pergunta.titulo,
            descricao: pergunta.descricao,
            tipo: pergunta.tipo,
            obrigatoria: pergunta.obrigatoria,
            ordem: pergunta.ordem,
            instrucoes: pergunta.instrucoes,
            opcoes: pergunta.opcoes,
            peso: pergunta.peso,
            permiteMultiplasFotos: pergunta.permiteMultiplasFotos,
            permiteAnexarFoto: pergunta.permiteAnexarFoto,
          })),
        })),
      },
    },
  });
}

