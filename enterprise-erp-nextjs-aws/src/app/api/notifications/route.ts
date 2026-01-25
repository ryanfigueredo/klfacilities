export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getProvisionamentoAlertsToday } from '@/server/services/provisionamento.service';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = session.user.role;
    
    // Apenas OPERACIONAL, ADMIN e MASTER podem ver notificações
    if (!['OPERACIONAL', 'ADMIN', 'MASTER'].includes(userRole)) {
      return NextResponse.json({ 
        provisoes: { vencidos: 0, venceHoje: 0, items: [] },
        manifestacoes: { pendentes: 0, items: [] },
        total: 0
      });
    }

    // Buscar provisões de hoje
    const provisoes = await getProvisionamentoAlertsToday();

    // Buscar manifestações pendentes
    const manifestacoesPendentes = await prisma.manifestacaoFuncionario.findMany({
      where: {
        status: 'PENDENTE',
      },
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const manifestacoes = {
      pendentes: manifestacoesPendentes.length,
      items: manifestacoesPendentes.map(m => ({
        id: m.id,
        tipo: m.tipo,
        mensagem: m.mensagem.substring(0, 100) + (m.mensagem.length > 100 ? '...' : ''),
        funcionarioNome: m.funcionarioNome,
        grupoNome: m.grupo?.nome || 'N/A',
        unidadeNome: m.unidade?.nome || 'N/A',
        createdAt: m.createdAt.toISOString(),
      })),
    };

    const total = provisoes.venceHoje + manifestacoes.pendentes;

    return NextResponse.json({
      provisoes,
      manifestacoes,
      total,
    });
  } catch (e: any) {
    console.error('notifications error', e);
    return NextResponse.json({ 
      provisoes: { vencidos: 0, venceHoje: 0, items: [] },
      manifestacoes: { pendentes: 0, items: [] },
      total: 0
    });
  }
}

