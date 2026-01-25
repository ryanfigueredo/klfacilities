import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistRespostaStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser(request);
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar checklists em aberto (RASCUNHO ou PENDENTE_APROVACAO) do supervisor atual
    const respostas = await prisma.checklistResposta.findMany({
      where: {
        supervisorId: me.id,
        status: {
          in: [ChecklistRespostaStatus.RASCUNHO, ChecklistRespostaStatus.PENDENTE_APROVACAO],
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
        escopo: {
          select: {
            id: true,
            ativo: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[em-aberto] Buscando rascunhos para supervisor ${me.id}, encontrados: ${respostas.length}`);
      respostas.forEach(r => {
        console.log(`[em-aberto] Rascunho ${r.id}: escopoId=${r.escopoId}, unidade=${r.unidade?.nome}`);
      });
    }

    return NextResponse.json({
      respostas: respostas.map(r => {
        const grupoAtual = r.unidade.mapeamentos[0]?.grupo || r.grupo;
        
        const resposta = {
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
          status: r.status,
          observacoes: r.observacoes,
          startedAt: r.startedAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          escopoId: r.escopoId,
        };
        
        // Validar que escopoId existe
        if (!r.escopoId) {
          console.error(`[em-aberto] Rascunho ${r.id} sem escopoId!`);
        }
        
        return resposta;
      }),
    });
  } catch (error) {
    console.error('Erro ao buscar checklists em aberto:', error);
    
    // Se for erro de conexão com banco de dados, retornar array vazio
    if (error instanceof Error && (
      error.message.includes('database') ||
      error.message.includes('connection') ||
      error.message.includes('P1001') ||
      error.message.includes('P1000')
    )) {
      console.warn('Erro de conexão com banco de dados, retornando array vazio');
      return NextResponse.json({
        respostas: [],
      });
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

