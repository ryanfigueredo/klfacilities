export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { createHash } from 'crypto';

type Row = {
  DATA?: any;
  CATEGORIA?: string;
  VALOR?: any;
  GRUPO?: string;
  UNIDADE?: string;
  // Atenção: chave com acento
  ['DESCRIÇÃO']?: string;
  PAGO?: any;
};

// Aliases vindos da planilha (sempre caixa alta) -> nome canônico (igual ao salvo no banco)
const GRUPO_ALIASES: Record<string, string> = {
  SPANI: 'Spani',
  'SPANI ATACADISTA': 'Spani',
  GIGA: 'Giga',
  'GIGA ATACADO': 'Giga',
  GBARBOSA: 'Gbarbosa',
  MERCANTIL: 'Mercantil',
  TOTAL: 'Total Atacado',
  'TOTAL ATACADO': 'Total Atacado',
  PROFARMA: 'Profarma',
  ROFATTO: 'Rofatto',
  PREZUNIC: 'Prezunic',
  'PÓS OBRA': 'Pós Obra',
  'POS OBRA': 'Pós Obra',
  RESSARCIMENTOS: 'Ressarcimentos',
  'DESPESAS OPERACIONAIS': 'Despesas Operacionais',
};

// Prefixo para compor/identificar UNIDADE (chave = nome canônico do banco)
const GRUPO_PREFIX: Record<string, string> = {
  Spani: 'SPANI',
  Giga: 'GIGA',
  Gbarbosa: 'GBARBOSA',
  Mercantil: 'MERCANTIL',
  Profarma: 'PROFARMA',
  Rofatto: 'ROFATTO',
  'Total Atacado': 'TOTAL ATACADO',
  Prezunic: 'PREZUNIC',
  'Pós Obra': 'PÓS OBRA',
  Ressarcimentos: 'RESSARCIMENTOS',
  'Despesas Operacionais': 'DESPESAS OPERACIONAIS',
};

function norm(s?: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function titleCasePt(s: string) {
  // Primeira maiúscula; mantém preposições usuais minúsculas
  const lower = (s || '').toLowerCase().trim();
  const min = new Set([
    'de',
    'da',
    'do',
    'das',
    'dos',
    'e',
    'a',
    'o',
    'em',
    'para',
  ]);
  return lower
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && min.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ');
}

function resolveGrupoCanonico(
  grupoPlanilha: string,
  gruposByNorm: Map<string, any>
) {
  const raw = (grupoPlanilha || '').trim();
  const upper = raw.toUpperCase();
  const canon = GRUPO_ALIASES[upper] ?? titleCasePt(raw);
  return (
    gruposByNorm.get(norm(canon)) || gruposByNorm.get(norm(titleCasePt(canon)))
  );
}

function splitUnidades(raw?: string): string[] {
  if (!raw) return [];
  // separadores: " e ", "/", "+", "&", ","
  return raw
    .split(/\s+E\s+|\/|\+|&|,/i)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseDate(anyDate: any): Date | null {
  if (!anyDate) return null;
  // Já veio Date (do XLSX com cellDates=true)
  if (anyDate instanceof Date && !isNaN(+anyDate)) {
    const y = anyDate.getFullYear();
    const m = anyDate.getMonth();
    const d = anyDate.getDate();
    // Normaliza para UTC meio-dia para evitar mudança de dia por fuso
    return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
  }
  // Número (serial do Excel)
  if (typeof anyDate === 'number' && isFinite(anyDate)) {
    const epoch = Date.UTC(1899, 11, 30); // base 1900
    const ms = Math.round(anyDate * 86400 * 1000);
    const dt = new Date(epoch + ms);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const d = dt.getUTCDate();
    return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
  }
  const s = String(anyDate).trim();
  // dd/mm/aaaa (aa opcional) com ou sem hora (ignoramos hora)
  const m1 = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/
  );
  if (m1) {
    const d = Number(m1[1]);
    const mo = Number(m1[2]) - 1;
    const y = Number(m1[3] || new Date().getFullYear());
    const Y = y < 100 ? 2000 + y : y;
    return new Date(Date.UTC(Y, mo, d, 12, 0, 0, 0));
  }
  // Tenta ISO/string válida
  const dt = new Date(s);
  if (isNaN(+dt)) return null;
  return new Date(
    Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0, 0)
  );
}

function parseValor(v: any): number {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim();
  s = s
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function hashImport(obj: any) {
  const h = createHash('sha256');
  h.update(JSON.stringify(obj));
  return h.digest('hex').slice(0, 32);
}

function similarity(a: string, b: string) {
  const A = new Set(a.match(/.{1,2}/g) || []);
  const B = new Set(b.match(/.{1,2}/g) || []);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return A.size || B.size ? inter / (A.size + B.size - inter) : 0;
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me?.id)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!can(me.role as any, 'movimentos', 'create')) {
    return NextResponse.json(forbiddenPayload('movimentos', 'create'), {
      status: 403,
    });
  }

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file)
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // 🔒 recorta a planilha para começar na linha 10 (header real)
    const ref = ws['!ref'] as string;
    const full = XLSX.utils.decode_range(ref);
    const HEADER_ROW = 0; // zero-based -> linha visual 10
    const slicedRef = XLSX.utils.encode_range(
      { r: HEADER_ROW, c: full.s.c },
      full.e
    );
    const sliced = { ...ws, '!ref': slicedRef };

    // lê a primeira linha (header) para indexar colunas
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sliced, {
      header: 1,
      defval: '',
    });
    const header = (rawRows[0] || []).map((h: any) =>
      String(h || '')
        .trim()
        .toUpperCase()
    );

    // índice helper (aceita DESCRIÇÃO e DESCRICAO)
    const idx = (name: string) => header.findIndex(h => h === name);
    const idxDATA = idx('DATA');
    const idxCATEGORIA = idx('CATEGORIA');
    const idxVALOR = idx('VALOR');
    const idxGRUPO = idx('GRUPO');
    const idxUNIDADE = idx('UNIDADE');
    const idxDESC1 = idx('DESCRIÇÃO');
    const idxDESC2 = idx('DESCRICAO');
    const idxPAGO = idx('PAGO');

    // valida header mínimo
    const must = [idxDATA, idxVALOR, idxGRUPO];
    if (must.some(i => i < 0)) {
      return NextResponse.json(
        {
          error:
            'Cabeçalho inválido: faltam colunas mínimas (DATA, VALOR, GRUPO)',
        },
        { status: 400 }
      );
    }

    // transforma linhas de dados (da linha 11 em diante)
    const rows: Row[] = rawRows.slice(1).map((arr: any[]) => ({
      DATA: idxDATA >= 0 ? arr[idxDATA] : '',
      CATEGORIA: idxCATEGORIA >= 0 ? arr[idxCATEGORIA] : '',
      VALOR: idxVALOR >= 0 ? arr[idxVALOR] : '',
      GRUPO: idxGRUPO >= 0 ? arr[idxGRUPO] : '',
      UNIDADE: idxUNIDADE >= 0 ? arr[idxUNIDADE] : '',
      DESCRIÇÃO:
        (idxDESC1 >= 0 ? arr[idxDESC1] : '') ||
        (idxDESC2 >= 0 ? arr[idxDESC2] : ''),
      PAGO: idxPAGO >= 0 ? arr[idxPAGO] : '',
    }));

    // Dimensões atuais
    const [grupos, unidades, mapeamentos, categoriasDespesa] =
      await Promise.all([
        prisma.grupo.findMany({ where: { ativo: true } }),
        prisma.unidade.findMany({ where: { ativa: true } }),
        prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
          where: { ativo: true },
        }),
        prisma.categoria.findMany({ where: { ativo: true, tipo: 'DESPESA' } }),
      ]);

    // Índices auxiliares
    const gruposByNorm = new Map(grupos.map(g => [norm(g.nome), g]));
    const unidadesByNorm = new Map(unidades.map(u => [norm(u.nome), u]));
    const catByNorm = new Map(categoriasDespesa.map(c => [norm(c.nome), c]));

    // Índice de unidades para matching por similaridade (sem prefixar grupo)
    const unidadesIndex: { id: string; nome: string; n: string }[] =
      unidades.map(u => ({ id: u.id, nome: u.nome, n: norm(u.nome) }));

    // Cria batch para possibilitar reversão do upload
    const batch = await prisma.importBatch.create({
      data: {
        origem: 'CSV_MOVIMENTOS',
        filename: (file as any)?.name || 'upload.xlsx',
        totalLinhas: 0,
        status: 'EM_ANDAMENTO',
        createdById: me.id,
      },
    });

    const summary = {
      lidas: 0,
      importadas: 0,
      puladas: 0,
      duplicadas: 0,
      unidadesCriadas: 0,
      provisoes: 0,
    };
    const report: any[] = [];

    for (const r of rows) {
      summary.lidas++;

      // 1) Extrair & normalizar campos-base
      const dataLanc = parseDate(r.DATA);
      const valor = parseValor(r.VALOR);
      const desc = String(r['DESCRIÇÃO'] || '').trim();
      const descKey = norm(desc || 'IMPORTADO DO CSV');

      // Categoria: forçar Primeira Maiúscula
      const categoriaTexto = r.CATEGORIA
        ? titleCasePt(String(r.CATEGORIA))
        : '';
      const categoriaRel = categoriaTexto
        ? catByNorm.get(norm(categoriaTexto))
        : undefined;
      const categoriaKey = categoriaRel?.nome
        ? norm(categoriaRel.nome)
        : norm(categoriaTexto || '');

      // Coluna PAGO: valores esperados SIM/NAO
      const pagoRaw = String((r as any).PAGO || '');
      const pagoNorm = norm(pagoRaw);
      const pagoToken = pagoNorm.split(/\s|\//)[0];
      const YES = new Set(['S', 'SIM', 'PAGO', 'PAGOU', 'OK', 'TRUE', '1']);
      const isPago = YES.has(pagoToken);

      // Grupo: resolver por alias/canônico
      let grupoInput = String(r.GRUPO || '').trim();
      if (!grupoInput) {
        summary.puladas++;
        report.push({
          linha: summary.lidas,
          status: 'pulado',
          motivo: 'grupo_vazio',
        });
        continue;
      }
      const grupo = resolveGrupoCanonico(grupoInput, gruposByNorm);
      if (!grupo) {
        summary.puladas++;
        report.push({
          linha: summary.lidas,
          status: 'pulado',
          motivo: 'grupo_inexistente',
          grupo_original: grupoInput,
        });
        continue;
      }

      // UNIDADES: pode vir "default", vazio, simples ou multiplas
      const unidadesParsed = (() => {
        const raw = String(r.UNIDADE || '').trim();
        if (!raw || norm(raw) === 'DEFAULT') return [];
        return splitUnidades(raw);
      })();

      if (!dataLanc || !valor) {
        summary.puladas++;
        report.push({
          linha: summary.lidas,
          status: 'pulado',
          motivo: 'dados_insuficientes',
          data: r.DATA,
          valor,
          grupo: grupo.nome,
        });
        continue;
      }

      // Resolve uma lista final de unidades (se 0 => usar padrão "Geral")
      let unidadesDestino: { id: string; nome: string }[] = [];

      if (unidadesParsed.length > 0) {
        for (const unRaw of unidadesParsed) {
          const candidatoNome = titleCasePt(unRaw);
          const candidatoNorm = norm(candidatoNome);

          // 1) Match exato por normalização
          const existenteExato = unidadesByNorm.get(candidatoNorm);
          if (existenteExato) {
            unidadesDestino.push({
              id: existenteExato.id,
              nome: existenteExato.nome,
            });
            continue;
          }

          // 2) Fuzzy match global, sem prefixo de grupo
          const match = unidadesIndex
            .map(u => ({
              ...u,
              score: similarity(u.n, candidatoNorm),
            }))
            .sort((a, b) => b.score - a.score)[0];

          if (match && match.score >= 0.9) {
            unidadesDestino.push({ id: match.id, nome: match.nome });
          } else {
            // 3) Criar unidade apenas com o nome limpo da planilha
            const created = await prisma.unidade.create({
              data: { nome: candidatoNome },
            });
            unidadesByNorm.set(norm(created.nome), created);
            unidadesIndex.push({
              id: created.id,
              nome: created.nome,
              n: norm(created.nome),
            });
            unidadesDestino.push({ id: created.id, nome: created.nome });
            summary.unidadesCriadas++;
            report.push({
              linha: summary.lidas,
              status: 'unidade_criada',
              motivo: `unidade_inexistente(${unRaw})`,
              grupo: grupo.nome,
              unidade: created.nome,
            });
          }
        }
      } else {
        // Sem unidade informada -> usar/ criar unidade global "Geral"
        const nomeDefault = 'Geral';
        const existe = unidadesByNorm.get(norm(nomeDefault));
        let defId: string, defNome: string;
        if (existe) {
          defId = existe.id;
          defNome = existe.nome;
        } else {
          const created = await prisma.unidade.create({
            data: { nome: nomeDefault },
          });
          unidadesByNorm.set(norm(created.nome), created);
          unidadesIndex.push({
            id: created.id,
            nome: created.nome,
            n: norm(created.nome),
          });
          defId = created.id;
          defNome = created.nome;
          summary.unidadesCriadas++;
        }
        unidadesDestino.push({ id: defId, nome: defNome });
      }

      // hash base p/ dedupe por grupo + conjunto de unidades + data/valor/descricao
      const baseHash = hashImport({
        tipo: 'DESPESA',
        data: dataLanc.toISOString().slice(0, 10),
        valor,
        grupo: grupo.id,
        unidades: [...unidadesDestino.map(u => u.id)].sort(),
        descricao: descKey,
        categoria: categoriaKey,
      });

      // Inserir 1 registro POR UNIDADE destino
      for (const un of unidadesDestino) {
        const rowHash = hashImport({ baseHash, unidadeId: un.id });
        const documento = `IMPORT#${rowHash}`;

        // Idempotência forte: se já existe ImportItem (origem+checksum), pular
        const existingItem = await prisma.importItem.findFirst({
          where: { origem: 'CSV_MOVIMENTOS', checksum: rowHash },
          select: { id: true },
        });
        if (existingItem) {
          summary.duplicadas++;
          report.push({
            linha: summary.lidas,
            status: 'duplicado_importitem',
            grupo: grupo.nome,
            unidade: un.nome,
            valor,
          });
          continue;
        }

        if (isPago) {
          // MOVIMENTO (pago = SIM)
          const dup = await prisma.movimento.findFirst({
            where: { documento },
          });
          if (dup) {
            summary.duplicadas++;
            report.push({
              linha: summary.lidas,
              status: 'duplicado',
              grupo: grupo.nome,
              unidade: un.nome,
              valor,
            });
            continue;
          }

          const competencia = new Date(
            Date.UTC(
              dataLanc.getUTCFullYear(),
              dataLanc.getUTCMonth(),
              1,
              12,
              0,
              0,
              0
            )
          );

          const createdMov = await prisma.movimento.create({
            data: {
              tipo: 'DESPESA',
              dataLanc,
              competencia,
              descricao: desc || 'Importado do CSV',
              grupoId: grupo.id,
              unidadeId: un.id,
              // categoria: texto (fallback) + categoriaId se encontrado
              categoria: categoriaRel ? null : categoriaTexto || null,
              categoriaId: categoriaRel?.id ?? null,
              responsavel: null,
              valor,
              valorAssinado: -valor,
              documento,
              criadoPorId: me.id,
            },
          });

          // Registrar item do batch para reversão
          await prisma.importItem.create({
            data: {
              batchId: batch.id,
              data: dataLanc as any,
              valor: valor as any,
              descricao: desc || 'Importado do CSV',
              documento,
              origem: 'CSV_MOVIMENTOS',
              checksum: rowHash,
              status: 'IMPORTED',
              movimentoId: createdMov.id,
              grupoId: grupo.id,
              unidadeId: un.id,
              rawJson: {
                categoria: categoriaRel?.nome || categoriaTexto || null,
              },
            },
          });

          summary.importadas++;
          report.push({
            linha: summary.lidas,
            status: 'importado',
            grupo: grupo.nome,
            unidade: un.nome,
            categoria: categoriaRel?.nome || categoriaTexto || '',
            valor,
            data: dataLanc.toISOString().slice(0, 10),
          });
        } else {
          // PROVISIONAMENTO (pago = NAO)
          const dupProv = await prisma.provisionamento.findFirst({
            where: { documento, status: 'PENDENTE' as any },
          } as any);
          if (dupProv) {
            summary.duplicadas++;
            report.push({
              linha: summary.lidas,
              status: 'provisionamento_duplicado',
              grupo: grupo.nome,
              unidade: un.nome,
              valor,
            });
            continue;
          }

          await prisma.provisionamento.create({
            data: {
              tipo: 'DESPESA' as any,
              descricao: desc || 'Importado do CSV',
              valor: valor as any,
              dataVenc: dataLanc as any,
              documento,
              formaPagamento: null,
              grupoId: grupo.id,
              unidadeId: un.id,
              categoriaId: categoriaRel?.id ?? null,
              status: 'PENDENTE' as any,
            },
          } as any);

          // Registrar item mesmo para provisão (sem vínculo de movimento)
          await prisma.importItem.create({
            data: {
              batchId: batch.id,
              data: dataLanc as any,
              valor: valor as any,
              descricao: desc || 'Importado do CSV',
              documento,
              origem: 'CSV_MOVIMENTOS',
              checksum: rowHash,
              status: 'IMPORTED',
              grupoId: grupo.id,
              unidadeId: un.id,
              rawJson: {
                tipo: 'PROV',
                categoria: categoriaRel?.nome || categoriaTexto || null,
              },
            },
          });

          summary.provisoes++;
          report.push({
            linha: summary.lidas,
            status: 'provisionamento_criado',
            grupo: grupo.nome,
            unidade: un.nome,
            categoria: categoriaRel?.nome || categoriaTexto || '',
            valor,
            data: dataLanc.toISOString().slice(0, 10),
          });
        }
      }
    }

    // Finaliza batch
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'CONCLUIDO', totalLinhas: summary.lidas },
    });

    // CSV de reporte
    const cols = [
      'linha',
      'status',
      'motivo',
      'grupo',
      'unidade',
      'categoria',
      'valor',
      'data',
    ];
    const csv = [
      cols.join(','),
      ...report.map(r =>
        cols
          .map(c => {
            const v = r[c] ?? '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(',')
      ),
    ].join('\n');

    return NextResponse.json({
      ok: true,
      summary,
      report,
      reportCsv: csv,
      batchId: batch.id,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
