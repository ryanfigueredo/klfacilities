import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Opt = { id: string; nome: string };
const dedupe = <T extends { id: string }>(arr: T[]) => {
  const s = new Set<string>();
  return arr.filter(x => !s.has(x.id) && s.add(x.id));
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grupoId = searchParams.get('grupoId') || undefined;

  const grupos: Opt[] = (
    await prisma.grupo.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    })
  ).map(g => ({ id: g.id, nome: g.nome }));

  let responsaveis: Opt[] = [];
  if (grupoId) {
    const maps = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: { grupoId },
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: [{ responsavel: { nome: 'asc' } }],
    });
    responsaveis = dedupe(
      maps
        .filter(m => !!m.responsavel)
        .map(m => ({
          id: m.responsavel!.id,
          nome: m.responsavel!.nome,
        }))
    );
    // fallback: se não houver mapeamento ainda, liste todos os responsáveis para escolha
    if (responsaveis.length === 0) {
      responsaveis = (
        await prisma.responsavel.findMany({
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true },
        })
      ).map(r => ({ id: r.id, nome: r.nome }));
    }
  } else {
    responsaveis = (
      await prisma.responsavel.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      })
    ).map(r => ({ id: r.id, nome: r.nome }));
  }

  return NextResponse.json({ grupos, responsaveis });
}
