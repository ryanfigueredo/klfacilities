import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChecklistVisualizarClient } from './_components/ChecklistVisualizarClient';

export default async function ChecklistVisualizarPage({
  params,
}: {
  params: Promise<{ respostaId: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) {
    redirect('/login');
  }

  // Verificar se o usuário pode ver checklists (OPERACIONAL, MASTER, ADMIN)
  if (!['OPERACIONAL', 'MASTER', 'ADMIN'].includes(me.role)) {
    redirect('/operacional/checklists');
  }

  const { respostaId } = await params;

  // Buscar resposta completa
  const resposta = await prisma.checklistResposta.findUnique({
    where: { id: respostaId },
    include: {
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
      supervisor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      gerenteAssinadoPor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      respostas: {
        include: {
          pergunta: true,
        },
      },
      confirmacoesRelatorio: {
        select: {
          id: true,
          confirmado: true,
          confirmadoEm: true,
          clienteFinal: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!resposta) {
    redirect('/operacional/checklists');
  }

  // Converter campos Decimal para Number para serialização
  const respostaSerializada = {
    ...resposta,
    lat: resposta.lat ? Number(resposta.lat) : null,
    lng: resposta.lng ? Number(resposta.lng) : null,
    accuracy: resposta.accuracy ? Number(resposta.accuracy) : null,
  };

  return (
    <div className="container mx-auto py-6">
      <ChecklistVisualizarClient resposta={respostaSerializada as any} />
    </div>
  );
}

