export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils/slugify';

async function getGrupoAndUnidades(grupoSlug: string) {
  // Primeiro tenta busca exata (case insensitive)
  let grupo = await prisma.grupo.findFirst({
    where: {
      ativo: true,
      nome: { equals: grupoSlug, mode: 'insensitive' },
    },
    select: { id: true, nome: true },
  });

  // Se não encontrar, tenta busca por slug (converte hífens para espaços)
  if (!grupo) {
    const nomeGrupo = grupoSlug.replace(/-/g, ' ');
    grupo = await prisma.grupo.findFirst({
      where: {
        ativo: true,
        nome: { equals: nomeGrupo, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
    });
  }

  // Se ainda não encontrar, tenta busca por startsWith
  if (!grupo) {
    grupo = await prisma.grupo.findFirst({
      where: {
        ativo: true,
        nome: { startsWith: grupoSlug, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
    });
  }

  if (!grupo) return null as any;

  // Unidades vinculadas via mapeamento (fonte única)
  const maps = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
    where: { grupoId: grupo.id, ativo: true, unidade: { ativa: true } },
    include: { unidade: true },
    orderBy: { unidade: { nome: 'asc' } },
  });
  const seen = new Set<string>();
  const unidades = maps
    .filter(m => m.unidade && !seen.has(m.unidade.id) && seen.add(m.unidade.id))
    .map(m => ({ id: m.unidade!.id, nome: m.unidade!.nome }));

  return { grupo, unidades };
}

export default async function GrupoPage({
  params,
}: {
  params: Promise<{ grupo: string }>;
}) {
  const { grupo: grupoSlug } = await params;
  const data = await getGrupoAndUnidades(grupoSlug);
  if (!data) {
    return (
      <div className="space-y-2 p-4">
        <h1 className="text-xl font-semibold">Grupo não encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Verifique se o grupo está ativo ou se possui colaboradores vinculados.
        </p>
        <Link href="/ponto/supervisor" className="underline text-blue-600">
          Voltar
        </Link>
      </div>
    );
  }

  const { grupo, unidades } = data;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{grupo.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Selecione a unidade com colaboradores para acessar o QR/link.
        </p>
      </div>

      {unidades.length === 0 ? (
        <div className="text-sm">
          Nenhuma unidade com colaboradores neste grupo.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {unidades.map((u: { id: string; nome: string }) => (
            <Link
              key={u.id}
              href={`/ponto/${encodeURIComponent(slugify(grupo.nome))}/${encodeURIComponent(
                slugify(u.nome)
              )}`}
              className="border rounded p-4 hover:bg-muted/50"
            >
              <div className="font-medium">{u.nome}</div>
              <div className="text-xs text-muted-foreground">Abrir unidade</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
