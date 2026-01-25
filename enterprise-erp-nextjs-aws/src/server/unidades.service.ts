import { prisma } from '@/lib/prisma';
import type { ListUnidadesParams, UnidadeRow } from '@/types/unidades';

export async function listUnidades(params: ListUnidadesParams) {
  const {
    q,
    grupoId,
    responsavelId,
    cidade,
    estado,
    includeUnlinked = true,
    coordenadas = 'todas',
    status = 'todas',
    sort = 'unidade',
    order = 'asc',
    page = 1,
    pageSize = 25,
  } = params;

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 25);
  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  // Filtro por status na entidade Unidade
  const unidadeAtivaWhere =
    status === 'ativas'
      ? { ativa: true }
      : status === 'inativas'
        ? { ativa: false }
        : {};

  // Filtros para mapeamentos (vinculados)
  const whereMapped: any = {
    grupoId: grupoId ?? undefined,
    responsavelId: responsavelId ?? undefined,
    OR: q
      ? [
          { unidade: { nome: { contains: q, mode: 'insensitive' } } },
          { grupo: { nome: { contains: q, mode: 'insensitive' } } },
          { responsavel: { nome: { contains: q, mode: 'insensitive' } } },
          { unidade: { cidade: { contains: q, mode: 'insensitive' } } },
          { unidade: { estado: { contains: q, mode: 'insensitive' } } },
        ]
      : undefined,
    unidade: {
      ...unidadeAtivaWhere,
      ...(cidade ? { cidade: { contains: cidade, mode: 'insensitive' } } : {}),
      ...(estado ? { estado: { equals: estado, mode: 'insensitive' } } : {}),
      // Filtro por coordenadas
      ...(coordenadas === 'com'
        ? { AND: [{ lat: { not: null } }, { lng: { not: null } }] }
        : coordenadas === 'sem'
          ? { OR: [{ lat: null }, { lng: null }] }
          : {}),
    },
  };

  // Ordenação dinâmica para a consulta de mapeamentos
  const o = order === 'desc' ? 'desc' : 'asc';
  const orderByMapped: any[] = (() => {
    switch (sort) {
      case 'grupo':
        return [
          { grupo: { nome: o } },
          { unidade: { nome: 'asc' } },
          { responsavel: { nome: 'asc' } },
        ];
      case 'responsavel':
        return [
          { responsavel: { nome: o } },
          { unidade: { nome: 'asc' } },
          { grupo: { nome: 'asc' } },
        ];
      case 'cidade':
        return [
          { unidade: { cidade: o } },
          { unidade: { nome: 'asc' } },
          { grupo: { nome: 'asc' } },
        ];
      case 'estado':
        return [
          { unidade: { estado: o } },
          { unidade: { cidade: 'asc' } },
          { unidade: { nome: 'asc' } },
        ];
      case 'createdAt':
        return [{ unidade: { createdAt: o as any } }];
      case 'unidade':
      default:
        return [
          { unidade: { nome: o } },
          { grupo: { nome: 'asc' } },
          { responsavel: { nome: 'asc' } },
        ];
    }
  })();

  const [mapped, mappedCount] = await Promise.all([
    prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: whereMapped,
      include: {
        grupo: true,
        unidade: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
            ativa: true,
            lat: true,
            lng: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        responsavel: true,
      },
      orderBy: orderByMapped as any,
      skip,
      take,
    }),
    prisma.mapeamentoGrupoUnidadeResponsavel.count({ where: whereMapped }),
  ]);

  // Não vinculados
  let unlinked: any[] = [];
  let unlinkedCount = 0;
  if (includeUnlinked && !grupoId && !responsavelId) {
    // Construir condições base
    const baseConditions: any = {
      ...unidadeAtivaWhere,
      mapeamentos: { none: {} },
      ...(cidade ? { cidade: { contains: cidade, mode: 'insensitive' } } : {}),
      ...(estado ? { estado: { equals: estado, mode: 'insensitive' } } : {}),
    };

    // Adicionar filtro de coordenadas
    if (coordenadas === 'com') {
      baseConditions.lat = { not: null };
      baseConditions.lng = { not: null };
    } else if (coordenadas === 'sem') {
      baseConditions.OR = [
        { lat: null },
        { lng: null },
      ];
    }

    // Adicionar filtro de busca (q) - precisa ser combinado com AND se já tiver OR
    const whereUnlinked: any = { ...baseConditions };
    
    if (q) {
      const searchConditions = [
        { nome: { contains: q, mode: 'insensitive' } },
        { cidade: { contains: q, mode: 'insensitive' } },
        { estado: { contains: q, mode: 'insensitive' } },
      ];

      // Se já tiver OR (coordenadas === 'sem'), precisamos usar AND para combinar
      if (whereUnlinked.OR) {
        whereUnlinked.AND = [
          { OR: whereUnlinked.OR },
          { OR: searchConditions },
        ];
        delete whereUnlinked.OR;
      } else {
        whereUnlinked.OR = searchConditions;
      }
    }

    const [rows, cnt] = await Promise.all([
      prisma.unidade.findMany({
        where: whereUnlinked,
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
          ativa: true,
          lat: true,
          lng: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy:
          sort === 'createdAt' ? { createdAt: o as any } : { nome: o as any },
        skip,
        take,
      }),
      prisma.unidade.count({ where: whereUnlinked }),
    ]);
    unlinked = rows;
    unlinkedCount = cnt;
  }

  // Normalize rows
  const rowsMapped: UnidadeRow[] = mapped.map(m => ({
    id: m.id,
    unidadeId: m.unidadeId,
    unidadeNome: m.unidade?.nome ?? '(?)',
    cidade: m.unidade?.cidade ?? null,
    estado: m.unidade?.estado ?? null,
    grupoId: m.grupoId,
    grupoNome: m.grupo?.nome ?? null,
    responsavelId: m.responsavelId,
    responsavelNome: m.responsavel?.nome ?? null,
    ativa: !!m.unidade?.ativa,
    lat: m.unidade?.lat ? Number(m.unidade.lat) : null,
    lng: m.unidade?.lng ? Number(m.unidade.lng) : null,
    createdAt: m.unidade?.createdAt?.toISOString(),
    updatedAt: m.unidade?.updatedAt
      ? m.unidade.updatedAt.toISOString()
      : undefined,
    dupIndex: 0,
    dupTotal: 1,
  }));

  const rowsUnlinked: UnidadeRow[] = unlinked.map(u => ({
    id: `${u.id}-unlinked`,
    unidadeId: u.id,
    unidadeNome: u.nome,
    cidade: u.cidade ?? null,
    estado: u.estado ?? null,
    grupoId: null,
    grupoNome: 'Não vinculado',
    responsavelId: null,
    responsavelNome: 'Não vinculado',
    ativa: !!u.ativa,
    createdAt: u.createdAt?.toISOString?.(),
    updatedAt: u.updatedAt?.toISOString?.(),
    dupIndex: 0,
    dupTotal: 1,
  }));

  const all = [...rowsMapped, ...rowsUnlinked];

  // Badge "n de total" por unidadeNome
  const counts = new Map<string, number>();
  for (const r of all)
    counts.set(r.unidadeNome, (counts.get(r.unidadeNome) ?? 0) + 1);
  const seenIdx = new Map<string, number>();
  for (const r of all) {
    const idx = (seenIdx.get(r.unidadeNome) ?? 0) + 1;
    seenIdx.set(r.unidadeNome, idx);
    r.dupIndex = idx;
    r.dupTotal = counts.get(r.unidadeNome) ?? 1;
  }

  const total =
    mappedCount +
    (includeUnlinked && !grupoId && !responsavelId ? unlinkedCount : 0);

  return { rows: all, page: safePage, pageSize: safePageSize, total };
}
