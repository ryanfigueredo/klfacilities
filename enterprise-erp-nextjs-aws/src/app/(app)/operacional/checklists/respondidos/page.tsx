import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChecklistRespostaStatus } from '@prisma/client';
import { ChecklistsRespondidosClient } from './_components/ChecklistsRespondidosClient';

export default async function ChecklistsRespondidosPage() {
  const me = await getCurrentUser();
  if (!me) {
    redirect('/login');
  }

  // Verificar se o usuário pode ver checklists respondidos (OPERACIONAL, MASTER, ADMIN)
  if (!['OPERACIONAL', 'MASTER', 'ADMIN'].includes(me.role)) {
    redirect('/operacional/checklists');
  }

  // Buscar checklists respondidos (aprovados/concluídos) e em aberto
  // OPERACIONAL, MASTER e ADMIN veem todos os checklists sem limite
  const respostas = await prisma.checklistResposta.findMany({
    where: {
      status: {
        in: [
          ChecklistRespostaStatus.CONCLUIDO,
          ChecklistRespostaStatus.RASCUNHO,
          ChecklistRespostaStatus.PENDENTE_APROVACAO,
        ],
      },
    },
    include: {
      template: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
        },
      },
      unidade: {
        select: {
          id: true,
          nome: true,
          mapeamentos: {
            where: { ativo: true },
            select: {
              grupo: {
                select: {
                  id: true,
                  nome: true,
                },
              },
            },
            take: 1,
          },
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
    orderBy: [
      {
        updatedAt: 'desc',
      },
      {
        submittedAt: 'desc',
      },
    ],
    // Removido o limite para OPERACIONAL, MASTER e ADMIN verem todos os checklists
  });

  return (
    <div className="container mx-auto py-6">
      <ChecklistsRespondidosClient
        userRole={me.role}
        respostasIniciais={respostas.map(r => {
          // Usar o grupo atual da unidade (do mapeamento) ao invés do grupo salvo na resposta
          const grupoAtual = r.unidade.mapeamentos[0]?.grupo || r.grupo;
          
          return {
            id: r.id,
            template: r.template,
            unidade: {
              id: r.unidade.id,
              nome: r.unidade.nome,
            },
            grupo: grupoAtual ? {
              id: grupoAtual.id,
              nome: grupoAtual.nome,
            } : null,
            supervisor: r.supervisor,
            observacoes: r.observacoes,
            protocolo: r.protocolo,
            status: r.status,
            escopoId: r.escopoId,
            submittedAt: r.submittedAt?.toISOString() || r.createdAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
            confirmacoes: r.confirmacoesRelatorio.map(c => ({
              id: c.id,
              confirmado: c.confirmado,
              confirmadoEm: c.confirmadoEm?.toISOString() || null,
              clienteFinal: c.clienteFinal,
            })),
          };
        })}
      />
    </div>
  );
}

