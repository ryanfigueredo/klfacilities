import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request): Promise<Response> {
  try {
    const me = await getCurrentUser();
    const role = me?.role;
    if (!can(role as any, 'logs', 'list')) {
      return NextResponse.json(forbiddenPayload('logs', 'list'), {
        status: 403,
      });
    }
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const action = url.searchParams.get('action') || '';
    const userId = url.searchParams.get('userId') || '';
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';
    const take = Number(url.searchParams.get('take') || 50);
    const cursor = url.searchParams.get('cursor') || undefined;

    const where: any = {};
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' as const } },
        { resource: { contains: q, mode: 'insensitive' as const } },
        { error: { contains: q, mode: 'insensitive' as const } },
        { requestId: { contains: q, mode: 'insensitive' as const } },
        {
          details: {
            path: ['description'],
            string_contains: q,
            mode: 'insensitive' as const,
          },
        },
      ];
    }
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (start || end) {
      where.timestamp = {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end + 'T23:59:59.999Z') : undefined,
      };
    }

    // Filtrar por role - cada role vê apenas seus recursos relevantes
    if (role === 'RH') {
      // RH vê apenas logs relacionados às suas páginas:
      // - colaboradores/funcionarios (rh/colaboradores)
      // - banco de talentos/curriculos (rh/banco-talentos)
      // - processos jurídicos (rh/processos)
      // - central de atendimento (rh/central-atendimento)
      const rhResources = [
        'funcionarios',
        'colaboradores',
        'curriculos',
        'processos-juridicos',
        'banco-talentos',
        'manifestacoes',
      ];
      const rhActions = [
        'funcionario',
        'colaborador',
        'curriculo',
        'processo',
        'banco-talentos',
        'manifestacao',
      ];

      // Criar filtro combinado
      const rhFilter = {
        OR: [
          { resource: { in: rhResources } },
          ...rhActions.map(a => ({ action: { contains: a, mode: 'insensitive' as const } })),
        ],
      };

      // Combinar com filtros existentes
      if (where.OR) {
        where.AND = [{ OR: where.OR }, rhFilter];
        delete where.OR;
      } else {
        Object.assign(where, rhFilter);
      }
    } else if (role === 'JURIDICO') {
      // JURIDICO vê apenas: processos jurídicos
      const juridicoFilter = {
        OR: [
          { resource: { in: ['processos-juridicos'] } },
          { action: { contains: 'processo', mode: 'insensitive' as const } },
        ],
      };

      // Combinar com filtros existentes
      if (where.OR) {
        where.AND = [{ OR: where.OR }, juridicoFilter];
        delete where.OR;
      } else {
        Object.assign(where, juridicoFilter);
      }
    }
    // MASTER e ADMIN vêem tudo (não aplica filtro de role)
    // OPERACIONAL também vê tudo relacionado a ponto e RH

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const nextCursor = logs.length > take ? logs[take].id : null;
    
    // Buscar registros de ponto relacionados para mostrar nome do funcionário
    // Pontos anônimos têm userId null, então filtramos por action/resource
    const pontoLogs = logs.slice(0, take).filter(
      l => l.resourceId && l.userId === null && 
      (l.action?.includes('ponto') || l.resource?.includes('Ponto') || l.resource?.includes('ponto'))
    );
    
    const pontoResourceIds = pontoLogs
      .map(l => l.resourceId)
      .filter((id): id is string => id !== null);
    
    const registrosPonto = pontoResourceIds.length > 0
      ? await prisma.registroPonto.findMany({
          where: { id: { in: pontoResourceIds } },
          include: { funcionario: { select: { nome: true, cpf: true } } },
        })
      : [];
    
    const funcionarioMap = new Map(
      registrosPonto
        .filter(r => r.funcionario)
        .map(r => [r.id, r.funcionario!])
    );
    
    return NextResponse.json({
      items: logs.slice(0, take).map(l => {
        const user = l.user;
        // Priorizar nome, depois email, depois ID do usuário, senão usar email do details
        let userDisplay = null;
        
        // Se for ponto anônimo (userId null) e tiver registro de ponto com funcionário, mostrar nome do funcionário
        if (l.userId === null && l.resourceId) {
          const funcionario = funcionarioMap.get(l.resourceId);
          if (funcionario) {
            userDisplay = `${funcionario.nome} (via CPF)`;
          } else {
            userDisplay = 'Ponto Público';
          }
        } else if (user) {
          userDisplay = user.name || user.email || user.id;
        } else if (l.details && typeof l.details === 'object' && 'userEmail' in l.details) {
          userDisplay = (l.details as any).userEmail;
        } else if (l.userId) {
          userDisplay = `Usuário ${l.userId.substring(0, 8)}...`;
        }

        return {
          id: l.id,
          ts: l.timestamp.toISOString(),
          user: userDisplay,
          userRole: user?.role ?? null,
          userId: l.userId,
          action: l.action,
          resource: l.resource,
          resourceId: l.resourceId,
          success: l.success,
          error: l.error,
          ip: l.ip,
          ua: l.userAgent,
          requestId: l.requestId,
          origin: l.origin,
          details: l.details,
          description:
            l.details &&
            typeof l.details === 'object' &&
            'description' in l.details
              ? (l.details as any).description
              : null,
        };
      }),
      nextCursor,
    });
  } catch (error) {
    console.error('Erro na API de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
