import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// ============================================================================
// CONFIGURAÇÃO DO ORGANOGRAMA - DEFINA AQUI
// ============================================================================

/**
 * CEO - Defina quem é o CEO do organograma
 * Opções:
 * - Por ID: { tipo: 'id', valor: 'user-id-aqui' }
 * - Por Nome: { tipo: 'nome', valor: 'Nome Completo' }
 * - Por Email: { tipo: 'email', valor: 'email@exemplo.com' }
 */
const CONFIG_CEO = {
  tipo: 'nome' as 'id' | 'nome' | 'email',
  valor: 'Luciano Tuyuty',
};

/**
 * DEPARTAMENTOS - Defina os departamentos e como mapear roles para eles
 *
 * Estrutura:
 * - nome: Nome que aparecerá no organograma
 * - roles: Array de roles (do enum Role) que pertencem a este departamento
 * - ordem: Ordem de exibição (menor = aparece primeiro)
 */
const CONFIG_DEPARTAMENTOS = [
  {
    nome: 'RH',
    roles: ['RH'] as string[],
    ordem: 1,
  },
  {
    nome: 'ADM',
    roles: ['ADMIN', 'AUXILIAR_ADMIN'] as string[],
    ordem: 2,
  },
  {
    nome: 'Financeiro',
    roles: ['FINANCEIRO'] as string[],
    ordem: 3,
  },
  {
    nome: 'Jurídico',
    roles: ['JURIDICO'] as string[],
    ordem: 4,
  },
  {
    nome: 'Operacional',
    roles: ['OPERACIONAL'] as string[],
    ordem: 5,
  },
  {
    nome: 'TI',
    roles: [] as string[], // TI aparece mesmo sem roles específicos
    ordem: 6,
  },
  // Adicione mais departamentos aqui se necessário
];

// ============================================================================
// FIM DA CONFIGURAÇÃO
// ============================================================================

// Função helper para converter BigInt para string recursivamente
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Apenas MASTER pode acessar
    if (user.role !== 'MASTER') {
      return NextResponse.json(
        {
          error: 'Acesso negado. Apenas MASTER pode visualizar o organograma.',
        },
        { status: 403 }
      );
    }

    // Buscar todos os grupos
    const grupos = await prisma.grupo.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        supervisorScopes: {
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                photoUrl: true,
                ativo: true,
              },
            },
          },
        },
      },
    });

    // Buscar todas as unidades
    const unidades = await prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      include: {
        mapeamentos: {
          where: { ativo: true },
          include: {
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          take: 1, // Pegar o primeiro grupo ativo (assumindo uma unidade tem um grupo principal)
        },
        supervisorScopes: {
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                photoUrl: true,
                ativo: true,
              },
            },
          },
        },
        funcionarios: {
          where: { unidadeId: { not: null } },
          select: {
            id: true,
            nome: true,
            cargo: true,
            fotoUrl: true,
            grupoId: true,
            unidadeId: true,
          },
          orderBy: { nome: 'asc' },
        },
      },
    });

    // Buscar todos os supervisores (Users com role SUPERVISOR)
    const supervisores = await prisma.user.findMany({
      where: {
        role: 'SUPERVISOR',
        ativo: true,
      },
      include: {
        supervisorScopes: {
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
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Buscar funcionários agrupados por cargo
    const funcionariosPorCargo = await prisma.funcionario.groupBy({
      by: ['cargo'],
      where: {
        cargo: { not: null },
        unidadeId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Buscar CEO conforme configuração
    let ceo = null;
    if (CONFIG_CEO.tipo === 'id') {
      ceo = await prisma.user.findUnique({
        where: {
          id: CONFIG_CEO.valor,
          ativo: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      });
    } else if (CONFIG_CEO.tipo === 'nome') {
      ceo = await prisma.user.findFirst({
        where: {
          name: CONFIG_CEO.valor,
          ativo: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      });
    } else if (CONFIG_CEO.tipo === 'email') {
      ceo = await prisma.user.findFirst({
        where: {
          email: CONFIG_CEO.valor,
          ativo: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      });
    }

    // Buscar todos os usuários ativos para mapear aos departamentos
    const todosUsuarios = await prisma.user.findMany({
      where: {
        ativo: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
      },
    });

    // Mapear usuários para departamentos conforme configuração
    const usuariosPorDepartamento = CONFIG_DEPARTAMENTOS.map(dept => {
      const usuarios = todosUsuarios.filter(u => dept.roles.includes(u.role));
      return {
        nome: dept.nome,
        usuarios: usuarios.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          photoUrl: u.photoUrl,
        })),
        ordem: dept.ordem,
      };
    }); // Mostrar todos os departamentos configurados

    // Estruturar dados para o organograma
    const data = {
      ceo: ceo
        ? {
            id: ceo.id,
            name: ceo.name,
            email: ceo.email,
            photoUrl: ceo.photoUrl,
          }
        : null,
      departamentos: usuariosPorDepartamento
        .sort((a, b) => a.ordem - b.ordem)
        .map(dept => ({
          nome: dept.nome,
          usuarios: dept.usuarios,
        })),
      grupos: grupos.map(g => ({
        id: g.id,
        nome: g.nome,
        supervisores: g.supervisorScopes.map(ss => ({
          id: ss.supervisor.id,
          name: ss.supervisor.name,
          email: ss.supervisor.email,
          photoUrl: ss.supervisor.photoUrl,
        })),
      })),
      unidades: unidades.map(u => ({
        id: u.id,
        nome: u.nome,
        cidade: u.cidade,
        estado: u.estado,
        grupoId: u.mapeamentos[0]?.grupo?.id || null,
        grupoNome: u.mapeamentos[0]?.grupo?.nome || null,
        supervisores: u.supervisorScopes.map(ss => ({
          id: ss.supervisor.id,
          name: ss.supervisor.name,
          email: ss.supervisor.email,
          photoUrl: ss.supervisor.photoUrl,
        })),
        funcionarios: u.funcionarios.map(f => ({
          id: f.id,
          nome: f.nome,
          cargo: f.cargo,
          fotoUrl: f.fotoUrl,
        })),
      })),
      supervisores: supervisores.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        photoUrl: s.photoUrl,
        scopes: s.supervisorScopes.map(ss => ({
          grupoId: ss.grupoId,
          grupoNome: ss.grupo?.nome,
          unidadeId: ss.unidadeId,
          unidadeNome: ss.unidade?.nome,
        })),
      })),
      cargos: funcionariosPorCargo
        .filter(f => f.cargo)
        .map(f => ({
          cargo: f.cargo,
          quantidade: f._count.id,
        })),
    };

    return NextResponse.json({
      ok: true,
      data: serializeBigInt(data),
    });
  } catch (error: any) {
    console.error('Erro ao buscar organograma:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do organograma', details: error.message },
      { status: 500 }
    );
  }
}
