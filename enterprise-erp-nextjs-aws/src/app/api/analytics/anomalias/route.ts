import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsFiltersSchema } from '../_schemas';
import { buildWhere } from '../_where';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão para visualizar analytics
    if (!can(user.role as any, 'relatorios', 'read')) {
      return NextResponse.json(forbiddenPayload('relatorios', 'read'), {
        status: 403,
      });
    }
    const { searchParams } = new URL(request.url);
    const filters = AnalyticsFiltersSchema.parse({
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      grupoId: searchParams.getAll('grupoId'),
      unidadeId: searchParams.getAll('unidadeId'),
      categoria: searchParams.getAll('categoria'),
      tipo: searchParams.getAll('tipo') as any,
      search: searchParams.get('search') || undefined,
    });

    const where = buildWhere(filters);

    // 1. Duplicidades (dataLanc (dia), valor, grupo/fornecedor (se existir), descricao normalizada inteira)
    const duplicidades = await prisma.$queryRaw`
      WITH base AS (
        SELECT
          id,
          descricao,
          "dataLanc",
          valor,
          "grupoId",
          responsavel,
          UPPER(regexp_replace(trim(coalesce(descricao, '')),'\s+',' ','g')) AS desc_norm,
          DATE("dataLanc") AS data_dia,
          categoria
        FROM "Movimento"
        WHERE "deletedAt" IS NULL
      ),
      dups AS (
        SELECT
          data_dia,
          valor,
          coalesce("grupoId"::text,'') AS grupo_key,
          coalesce(responsavel,'') AS forn_key,
          desc_norm,
          COUNT(*) AS cnt
        FROM base
        GROUP BY data_dia, valor, grupo_key, forn_key, desc_norm
        HAVING COUNT(*) > 1
      )
      SELECT b.id, b.descricao, b."dataLanc", b.valor, b."grupoId", b.categoria, d.cnt as count
      FROM base b
      JOIN dups d
        ON b.data_dia = d.data_dia
       AND b.valor = d.valor
       AND coalesce(b."grupoId"::text,'') = d.grupo_key
       AND coalesce(b.responsavel,'') = d.forn_key
       AND b.desc_norm = d.desc_norm
      ORDER BY b."dataLanc" DESC
      LIMIT 50
    `;

    // 2. Sem categoria
    const semCategoria = await prisma.movimento.findMany({
      where: {
        ...where,
        categoria: null,
        categoriaId: null,
      },
      include: {
        grupo: { select: { nome: true } },
        unidade: { select: { nome: true } },
      },
      orderBy: {
        dataLanc: 'desc',
      },
      take: 50,
    });

    // 3. Outliers por z-score de despesa mensal por categoria
    const outliers = await prisma.$queryRaw`
      WITH categoria_stats AS (
        SELECT 
          categoria,
          AVG(CAST(valor AS DECIMAL)) as mean,
          STDDEV(CAST(valor AS DECIMAL)) as stddev
        FROM "Movimento"
        WHERE "deletedAt" IS NULL 
          AND tipo = 'DESPESA'
          AND categoria IS NOT NULL
        GROUP BY categoria
        HAVING STDDEV(CAST(valor AS DECIMAL)) > 0
      ),
      outliers AS (
        SELECT 
          m.id,
          m.descricao,
          m."dataLanc",
          m.valor,
          m.categoria,
          m."grupoId",
          ABS((CAST(m.valor AS DECIMAL) - cs.mean) / cs.stddev) as z_score
        FROM "Movimento" m
        INNER JOIN categoria_stats cs ON m.categoria = cs.categoria
        WHERE m."deletedAt" IS NULL 
          AND m.tipo = 'DESPESA'
          AND m.categoria IS NOT NULL
          AND ABS((CAST(m.valor AS DECIMAL) - cs.mean) / cs.stddev) > 2.5
      )
      SELECT * FROM outliers
      ORDER BY z_score DESC
      LIMIT 50
    `;

    return NextResponse.json({
      duplicidades: (duplicidades as any[]).map((d: any) => ({
        id: d.id,
        descricao: d.descricao,
        dataLanc: d.dataLanc,
        valor: Number(d.valor),
        grupoId: d.grupoId,
        categoria: d.categoria,
        count: Number(d.count),
      })),
      semCategoria: semCategoria.map(m => ({
        id: m.id,
        descricao: m.descricao,
        dataLanc: m.dataLanc,
        valor: Number(m.valor),
        grupo: m.grupo?.nome,
        unidade: m.unidade?.nome,
      })),
      outliers: (outliers as any[]).map((o: any) => ({
        id: o.id,
        descricao: o.descricao,
        dataLanc: o.dataLanc,
        valor: Number(o.valor),
        categoria: o.categoria,
        grupoId: o.grupoId,
        zScore: Number(o.z_score),
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar anomalias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
