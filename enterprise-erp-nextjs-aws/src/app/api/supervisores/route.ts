import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão básica
    if (!can(me.role as any, 'usuarios', 'list')) {
      return NextResponse.json(forbiddenPayload('usuarios', 'list'), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId') || undefined;
    const unidadeId = searchParams.get('unidadeId') || undefined;

    // Buscar supervisores (usuários com role SUPERVISOR)
    let where: any = {
      role: 'SUPERVISOR',
      ativo: true,
    };

    // Se foi especificado grupo ou unidade, filtrar pelos SupervisorScopes
    if (grupoId || unidadeId) {
      const scopes = await prisma.supervisorScope.findMany({
        where: {
          ...(grupoId && { grupoId }),
          ...(unidadeId && { unidadeId }),
        },
        select: { supervisorId: true },
      });

      const supervisorIds = Array.from(
        new Set(scopes.map(s => s.supervisorId))
      );

      if (supervisorIds.length === 0) {
        return NextResponse.json([]);
      }

      where.id = { in: supervisorIds };
    }

    const supervisores = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        supervisorScopes: {
          select: {
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

    // Formatar resposta com informações de grupos e unidades
    const formatted = supervisores.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      grupos: Array.from(
        new Set(
          s.supervisorScopes
            .filter(scope => scope.grupo)
            .map(scope => scope.grupo!.nome)
        )
      ),
      unidades: Array.from(
        new Set(
          s.supervisorScopes
            .filter(scope => scope.unidade)
            .map(scope => scope.unidade!.nome)
        )
      ),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Erro ao buscar supervisores:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar supervisores' },
      { status: 500 }
    );
  }
}

