export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { QrCard } from './QrCard';
import { ExportFuncionario } from './ExportFuncionario';
import { slugify } from '@/lib/utils/slugify';
import { getBaseUrl } from '@/lib/get-base-url';

async function getGrupoAndUnidade(
  grupoSlug: string,
  unidadeSlug: string,
  selectedMonth?: string
) {
  // Busca grupo com múltiplas estratégias
  let grupo = await prisma.grupo.findFirst({
    where: {
      ativo: true,
      nome: { equals: grupoSlug, mode: 'insensitive' },
    },
    select: { id: true, nome: true },
  });

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

  if (!grupo) {
    grupo = await prisma.grupo.findFirst({
      where: {
        ativo: true,
        nome: { startsWith: grupoSlug, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
    });
  }

  // Busca unidade com múltiplas estratégias
  let unidade = await prisma.unidade.findFirst({
    where: {
      ativa: true,
      nome: { equals: unidadeSlug, mode: 'insensitive' },
    },
    select: { id: true, nome: true },
  });

  if (!unidade) {
    const nomeUnidade = unidadeSlug.replace(/-/g, ' ');
    unidade = await prisma.unidade.findFirst({
      where: {
        ativa: true,
        nome: { equals: nomeUnidade, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
    });
  }

  if (!unidade) {
    unidade = await prisma.unidade.findFirst({
      where: {
        ativa: true,
        nome: { startsWith: unidadeSlug, mode: 'insensitive' },
      },
      select: { id: true, nome: true },
    });
  }

  if (!grupo || !unidade) return null as any;
  // Meses disponíveis com batidas
  const monthRows = (await prisma.$queryRawUnsafe(
    `SELECT to_char(date_trunc('month', "timestamp"), 'YYYY-MM') AS mes, COUNT(*) AS cnt
     FROM "RegistroPonto"
     WHERE "unidadeId" = $1
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT 36`,
    unidade.id
  )) as Array<{ mes: string; cnt: string | number }>;
  const availableMonths = monthRows.map(r => String(r.mes));

  const qr = await prisma.pontoQrCode.findFirst({
    where: { unidadeId: unidade.id, ativo: true },
    select: { code: true },
  });
  // Faixa do mês selecionado (YYYY-MM) ou mês atual
  const now = new Date();
  const monthStrDefault = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, '0')}`;
  const monthStr = selectedMonth || monthStrDefault;
  const [year, monthNum] = monthStr
    .split('-')
    .map((n: string) => parseInt(n, 10));
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));

  const rows = await prisma.registroPonto.findMany({
    where: { unidadeId: unidade.id, timestamp: { gte: start, lt: end } },
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: {
      funcionario: { select: { id: true, nome: true } },
    },
  });
  // KPIs simples
  const totalRegistros = await prisma.registroPonto.count({
    where: { unidadeId: unidade.id, timestamp: { gte: start, lt: end } },
  });
  const uniq = await prisma.registroPonto.findMany({
    where: { unidadeId: unidade.id, timestamp: { gte: start, lt: end } },
    select: { funcionarioId: true },
    distinct: ['funcionarioId'],
  });
  const kpis = {
    mesRef: monthStr,
    totalRegistros,
    funcionariosAtivos: uniq.filter(x => !!x.funcionarioId).length,
  };
  return { grupo, unidade, qr, rows, kpis, availableMonths };
}

export default async function UnidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ grupo: string; unidade: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { grupo: grupoSlug, unidade: unidadeSlug } = await params;
  const { m: selectedMonth } = await searchParams;
  const data = await getGrupoAndUnidade(grupoSlug, unidadeSlug, selectedMonth);
  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Não encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Grupo/unidade não vinculados ou inativos.
        </p>
      </div>
    );
  }
  const { grupo, unidade, qr, rows, kpis, availableMonths } = data;
  const unidadeSlugEncoded = encodeURIComponent(slugify(unidade.nome));
  // Use absolute URL para QR funcionar fora do domínio atual
  const base = getBaseUrl();
  const checkinUrl = qr?.code
    ? `${base}/ponto/scan?code=${encodeURIComponent(qr.code)}`
    : `${base}/ponto/u/${unidadeSlugEncoded}`;
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          {grupo.nome} • {unidade.nome}
        </h1>
        <div className="text-sm text-muted-foreground">
          Aponte a câmera para o QR impresso ou abra o link abaixo.
        </div>
      </div>

      <div className="border rounded p-4 space-y-2">
        <div className="font-medium">Link de batida</div>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="px-2 py-1 rounded bg-muted text-xs">
            {checkinUrl}
          </code>
          <Link href={checkinUrl} className="text-blue-600 underline">
            Abrir
          </Link>
        </div>
        {/* QR visual e botão Imprimir abaixo do link */}
        <div className="mt-2">
          <QrCard url={checkinUrl} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Mês</div>
          <form method="GET" className="mt-1">
            <select
              name="m"
              defaultValue={kpis.mesRef}
              className="border rounded px-2 py-1 text-sm"
            >
              {(availableMonths.length ? availableMonths : [kpis.mesRef]).map(
                (opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                )
              )}
            </select>
            <button className="ml-2 text-sm underline" type="submit">
              Aplicar
            </button>
          </form>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Registros</div>
          <div className="text-lg font-semibold">{kpis.totalRegistros}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">
            Funcionários com batida
          </div>
          <div className="text-lg font-semibold">{kpis.funcionariosAtivos}</div>
        </div>
      </div>

      <ExportFuncionario
        month={kpis.mesRef}
        unidadeId={unidade.id}
        baseUrl={getBaseUrl()}
      />

      <div className="space-y-2">
        <div className="font-medium">Últimas batidas (mês atual)</div>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-2">Data</th>
                <th className="p-2">Hora</th>
                <th className="p-2">Funcionário</th>
                <th className="p-2">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const dt = new Date(r.timestamp as any);
                const dateBr = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'America/Sao_Paulo',
                }).format(dt);
                const timeBr = new Intl.DateTimeFormat('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                  timeZone: 'America/Sao_Paulo',
                }).format(dt);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{dateBr}</td>
                    <td className="p-2">{timeBr}</td>
                    <td className="p-2">{r.funcionario?.nome || '-'}</td>
                    <td className="p-2">{r.tipo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
