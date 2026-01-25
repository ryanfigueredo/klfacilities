import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';

import { ChecklistResponderClient } from './_components/ChecklistResponderClient';

interface ResponderPageProps {
  params: {
    escopoId: string;
  };
  searchParams?: {
    grupoId?: string;
    unidadeId?: string;
  };
}

export default async function ChecklistResponderPage({
  params,
  searchParams = {},
}: ResponderPageProps) {
  const me = await getCurrentUser();

  if (!me?.id) {
    redirect('/login');
  }

  if (!can(me.role, 'checklists', 'list')) {
    redirect('/unauthorized');
  }

  const { grupoId, unidadeId } = searchParams;

  const escopo = await prisma.checklistEscopo.findUnique({
    where: { id: params.escopoId },
    include: {
      unidade: {
        select: { id: true, nome: true },
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

  if (!escopo || !escopo.ativo || !escopo.template.ativo) {
    redirect('/operacional/checklists');
  }

  if (unidadeId && escopo.unidadeId !== unidadeId) {
    redirect('/operacional/checklists');
  }

  if (grupoId && escopo.grupoId && escopo.grupoId !== grupoId) {
    redirect('/operacional/checklists');
  }

  if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.includes(escopo.unidadeId)) {
      redirect('/unauthorized');
    }
    if (!unidadeId || escopo.unidadeId !== unidadeId) {
      redirect('/operacional/checklists');
    }
  }

  const payload = {
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
        })),
      })),
    },
  };

  // Apenas MASTER pode gerenciar templates
  const canManageTemplates = me.role === 'MASTER';

  return (
    <div className="mx-auto flex w-full max-w-full md:max-w-5xl flex-col gap-4 p-0 md:p-3 pb-20 md:gap-6 md:p-8">
      <ChecklistResponderClient
        escopo={payload}
        canManageTemplates={canManageTemplates}
      />
    </div>
  );
}

