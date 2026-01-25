export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { normName } from '@/lib/utils/currency';

const COMPETENCIA = new Date('2025-07-01T00:00:00-03:00');
const DATA_LANC = new Date('2025-08-06T00:00:00-03:00');

const tipoToCategoria: Record<string, string> = {
  VR: 'VALE REFEIÇÃO',
  VT: 'VALE TRANSPORTE',
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const items = (await req.json()) as Array<{
      nome: string;
      tipo: string;
      valor: number;
    }>;

    const grupo = await prisma.grupo.findFirst({
      where: { nome: { contains: 'PROFARMA', mode: 'insensitive' } },
    });
    if (!grupo) throw new Error('Grupo PROFARMA não encontrado');

    const out: any[] = [];

    for (const it of items || []) {
      const nome = normName(it.nome);
      const catNome = tipoToCategoria[(it.tipo || '').toUpperCase()];
      if (!nome || !catNome || !it.valor) continue;
      const cat = await prisma.categoria.upsert({
        where: { nome_tipo: { nome: catNome, tipo: 'DESPESA' } } as any,
        update: {},
        create: { nome: catNome, tipo: 'DESPESA' },
      });
      const func = await prisma.funcionario.upsert({
        where: { nome },
        update: { grupoId: grupo.id },
        create: { nome, grupoId: grupo.id },
      });
      const m = await prisma.movimento.create({
        data: {
          tipo: 'DESPESA',
          dataLanc: DATA_LANC,
          competencia: COMPETENCIA,
          descricao: `${nome} - ${catNome} 07/2025`,
          valor: it.valor,
          valorAssinado: -it.valor,
          grupoId: grupo.id,
          categoriaId: cat.id,
          funcionarioId: func.id,
          criadoPorId: session.user.id,
        },
      } as any);
      out.push(m);
    }

    return NextResponse.json({ count: out.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro' }, { status: 400 });
  }
}
