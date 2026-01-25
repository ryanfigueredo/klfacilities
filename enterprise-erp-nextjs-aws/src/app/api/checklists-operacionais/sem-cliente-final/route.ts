import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!can(me.role, 'checklists', 'list')) {
      return NextResponse.json(forbiddenPayload('checklists', 'list'), {
        status: 403,
      });
    }

    // Buscar checklists concluídos dos últimos 30 dias
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const respostas = await prisma.checklistResposta.findMany({
      where: {
        status: 'CONCLUIDO', // Apenas checklists aprovados
        submittedAt: {
          gte: trintaDiasAtras,
        },
      },
      include: {
        template: {
          select: {
            id: true,
            titulo: true,
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
          },
        },
        confirmacoesRelatorio: {
          select: {
            id: true,
            clienteFinalId: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Verificar quais não têm cliente final cadastrado
    const pendencias: Array<{
      respostaId: string;
      templateTitulo: string;
      unidadeNome: string;
      grupoNome: string | null;
      grupoId: string | null;
      supervisorNome: string | null;
      submittedAt: Date;
      protocolo: string | null;
    }> = [];

    for (const resposta of respostas) {
      // Verificar se há cliente final para o grupo ou unidade
      const clientesFinais = await prisma.clienteFinal.findMany({
        where: {
          ativo: true,
          OR: [
            {
              grupos: {
                some: {
                  grupoId: resposta.grupoId || undefined,
                },
              },
            },
            { unidadeId: resposta.unidadeId },
          ],
        },
        select: {
          id: true,
        },
        take: 1,
      });

      // Se não há cliente final E não há confirmação de relatório (significa que não foi enviado)
      if (clientesFinais.length === 0 && resposta.confirmacoesRelatorio.length === 0) {
        pendencias.push({
          respostaId: resposta.id,
          templateTitulo: resposta.template.titulo,
          unidadeNome: resposta.unidade.nome,
          grupoNome: resposta.grupo?.nome || null,
          grupoId: resposta.grupoId,
          supervisorNome: resposta.supervisor.name,
          submittedAt: resposta.submittedAt || resposta.createdAt,
          protocolo: resposta.protocolo,
        });
      }
    }

    // Agrupar por grupo para facilitar visualização
    const pendenciasPorGrupo = new Map<
      string,
      {
        grupoId: string;
        grupoNome: string;
        count: number;
        pendencias: typeof pendencias;
      }
    >();

    for (const pendencia of pendencias) {
      const grupoKey = pendencia.grupoId || 'sem-grupo';
      const grupoNome = pendencia.grupoNome || 'Sem grupo';

      if (!pendenciasPorGrupo.has(grupoKey)) {
        pendenciasPorGrupo.set(grupoKey, {
          grupoId: pendencia.grupoId || '',
          grupoNome,
          count: 0,
          pendencias: [],
        });
      }

      const grupo = pendenciasPorGrupo.get(grupoKey)!;
      grupo.count++;
      grupo.pendencias.push(pendencia);
    }

    return NextResponse.json({
      total: pendencias.length,
      porGrupo: Array.from(pendenciasPorGrupo.values()),
      pendencias: pendencias.slice(0, 50), // Limitar a 50 mais recentes
    });
  } catch (error) {
    console.error('Erro ao buscar checklists sem cliente final:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar pendências',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

