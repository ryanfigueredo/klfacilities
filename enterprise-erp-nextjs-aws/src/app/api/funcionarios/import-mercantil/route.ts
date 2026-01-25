export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

function cleanCpf(s: string): string {
  return (s || '').replace(/\D/g, '');
}

function normName(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}


export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  // MASTER, ADMIN, RH e OPERACIONAL podem importar
  if (
    !session?.user?.id ||
    !['MASTER', 'ADMIN', 'RH', 'OPERACIONAL'].includes(session.user.role)
  ) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file)
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );

    // Buscar grupo MERCANTIL
    const grupoMercantil = await prisma.grupo.findFirst({
      where: {
        nome: {
          contains: 'MERCANTIL',
          mode: 'insensitive',
        },
      },
    });

    if (!grupoMercantil) {
      return NextResponse.json(
        { error: 'Grupo MERCANTIL não encontrado no sistema' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, {
      header: 1,
      defval: '',
      raw: true,
    });

    const entries: Array<{
      codigo: number | null;
      nome: string;
      cpf: string;
      grupoId: string;
      unidadeId: string | null;
      unidadeNome: string;
    }> = [];

    const invalid: Array<{ row: number; reason: string }> = [];
    const unmatched: Array<{ row: number; unidadeNome: string }> = [];

    // Primeiro, buscar todas as unidades do grupo uma vez para cache
    const mapeamentos = await prisma.mapeamentoGrupoUnidadeResponsavel.findMany({
      where: {
        grupoId: grupoMercantil.id,
        ativo: true,
        unidade: {
          ativa: true,
        },
      },
      include: {
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    const unidadesCache = mapeamentos
      .map((m) => m.unidade)
      .filter((u): u is { id: string; nome: string } => u !== null);

    // Função otimizada que usa cache
    const findUnidadeByMatchingCached = (unidadeNome: string): string | null => {
      const nomeNormalizado = normName(unidadeNome)
        .replace(/MERCANTIL\s*/gi, '')
        .replace(/^\d+\s*-\s*/i, '')
        .replace(/CENTRO\s*/gi, '')
        .trim();

      // Match exato
      for (const unidade of unidadesCache) {
        const nomeUnidadeNorm = normName(unidade.nome);
        if (nomeNormalizado === nomeUnidadeNorm) {
          return unidade.id;
        }
      }

      // Match parcial
      for (const unidade of unidadesCache) {
        const nomeUnidadeNorm = normName(unidade.nome);
        if (
          nomeNormalizado.includes(nomeUnidadeNorm) ||
          nomeUnidadeNorm.includes(nomeNormalizado)
        ) {
          return unidade.id;
        }
      }

      // Match por palavras-chave
      const palavras = nomeNormalizado.split(/\s+/).filter((w) => w.length > 2);
      for (const unidade of unidadesCache) {
        const nomeUnidadeNorm = normName(unidade.nome);
        const palavrasUnidade = nomeUnidadeNorm.split(/\s+/).filter((w) => w.length > 2);
        const matches = palavras.filter((p) =>
          palavrasUnidade.some((u) => u.includes(p) || p.includes(u))
        );
        if (matches.length >= Math.min(2, palavras.length)) {
          return unidade.id;
        }
      }

      return null;
    };

    let currentUnidadeNome = '';
    let currentUnidadeId: string | null = null;

    // Debug: log das primeiras linhas para diagnóstico
    const debugInfo: any[] = [];
    
    // Processar linha por linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any[];

      if (!row || row.length === 0) continue;

      // Verificar se é linha de "Servico:" (define grupo/unidade)
      const colC = String(row[2] || '').trim().toUpperCase();
      const colH = String(row[7] || '').trim();

      if (colC === 'SERVICO:' && colH) {
        // Extrair nome da unidade da coluna H
        // Formato: "24 - MERCANTIL CALCADA - CNPJ: ..."
        const match = colH.match(/^\d+\s*-\s*MERCANTIL\s+(.+?)\s*-/i);
        if (match && match[1]) {
          currentUnidadeNome = match[1].trim();
          // Fazer matching da unidade usando cache
          currentUnidadeId = findUnidadeByMatchingCached(currentUnidadeNome);
          if (!currentUnidadeId) {
            unmatched.push({
              row: i + 1,
              unidadeNome: currentUnidadeNome,
            });
          }
        }
        continue;
      }

      // Processar linhas de funcionários (a partir da linha 7)
      if (i < 6) continue; // Pular cabeçalhos

      // Colunas: A=código, E=nome, AC=CPF (índice 28)
      const codigoCell = row[0]; // A
      const nomeRaw = row[4]; // E
      const cpfCell = row[28]; // AC

      // Debug: guardar primeiras linhas processadas
      if (debugInfo.length < 10 && codigoCell != null && codigoCell !== '') {
        debugInfo.push({
          linha: i + 1,
          codigoRaw: codigoCell,
          nomeRaw: nomeRaw,
          cpfRaw: cpfCell,
          tipoCodigo: typeof codigoCell,
        });
      }

      // Verificar se tem código válido (3 dígitos numéricos)
      const codigo = (() => {
        if (codigoCell == null || codigoCell === '') return null;
        const num = Number(
          typeof codigoCell === 'number'
            ? Math.trunc(codigoCell)
            : String(codigoCell).replace(/\D/g, '')
        );
        // Código deve ser numérico de 3 dígitos (relaxado: aceita 1-999)
        if (Number.isFinite(num) && num >= 1 && num <= 999) {
          return num;
        }
        return null;
      })();

      // Se não tem código válido, ignorar
      if (!codigo) continue;

      const nome = normName(String(nomeRaw || '').trim());
      let cpf = cleanCpf(
        typeof cpfCell === 'number'
          ? String(Math.trunc(cpfCell))
          : String(cpfCell || '').trim()
      );

      if (cpf.length < 11 && cpf.length >= 9) cpf = cpf.padStart(11, '0');

      if (!nome) {
        invalid.push({ row: i + 1, reason: 'Nome vazio' });
        continue;
      }

      // CPF pode ser opcional - se não tiver, usar string vazia
      if (cpf.length > 0 && (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf))) {
        invalid.push({ row: i + 1, reason: `CPF inválido: ${cpf}` });
        // Não bloquear por CPF inválido, apenas registrar
        cpf = '';
      }

      // Ignorar linhas de total
      if (nome.includes('TOTAL DE EMPREGADOS')) continue;

      entries.push({
        codigo,
        nome,
        cpf: cpf || '', // CPF pode ser vazio
        grupoId: grupoMercantil.id,
        unidadeId: currentUnidadeId,
        unidadeNome: currentUnidadeNome,
      });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { 
          error: 'Nenhum colaborador encontrado na planilha',
          debug: {
            totalLinhas: rows.length,
            debugInfo: debugInfo.slice(0, 10),
            invalid: invalid.slice(0, 10),
            unmatched: unmatched.slice(0, 5),
          }
        },
        { status: 400 }
      );
    }

    let criados = 0,
      atualizados = 0,
      ignorados = 0;
    const detalhes: any[] = [];

    // Processar em lotes menores para evitar timeout de transação
    const BATCH_SIZE = 50;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(
        async tx => {
          for (const e of batch) {
            // Buscar por CPF primeiro, depois por nome/grupo
            let exists = await tx.funcionario.findFirst({
              where: { cpf: e.cpf },
            });

            if (!exists) {
              // Tentar buscar por nome e grupo
              exists = await tx.funcionario.findFirst({
                where: {
                  nome: e.nome,
                  grupoId: e.grupoId,
                },
              });
            }

            if (exists) {
              await tx.funcionario.update({
                where: { id: exists.id },
                data: {
                  nome: e.nome,
                  codigo: e.codigo ?? null,
                  cpf: e.cpf || null,
                  grupoId: e.grupoId,
                  unidadeId: e.unidadeId || exists.unidadeId || null,
                } as any,
              });
              atualizados++;
              detalhes.push({
                status: 'update',
                id: exists.id,
                nome: e.nome,
                cpf: e.cpf,
                codigo: e.codigo,
                unidade: e.unidadeNome,
              });
            } else {
              try {
                const created = await tx.funcionario.create({
                  data: {
                    nome: e.nome,
                    cpf: e.cpf || null,
                    codigo: e.codigo,
                    grupoId: e.grupoId,
                    unidadeId: e.unidadeId || null,
                  } as any,
                });
                criados++;
                detalhes.push({
                  status: 'create',
                  id: created.id,
                  nome: e.nome,
                  cpf: e.cpf,
                  codigo: e.codigo,
                  unidade: e.unidadeNome,
                });
              } catch (createError: any) {
                // Se falhar por duplicata (nome único), tenta atualizar
                if (createError?.code === 'P2002') {
                  const existing = await tx.funcionario.findFirst({
                    where: { nome: e.nome },
                  });
                  if (existing) {
                    await tx.funcionario.update({
                      where: { id: existing.id },
                      data: {
                        codigo: e.codigo ?? null,
                        cpf: e.cpf || null,
                        grupoId: e.grupoId,
                        unidadeId: e.unidadeId || existing.unidadeId || null,
                      } as any,
                    });
                    atualizados++;
                    detalhes.push({
                      status: 'update',
                      id: existing.id,
                      nome: e.nome,
                      cpf: e.cpf,
                      codigo: e.codigo,
                      unidade: e.unidadeNome,
                    });
                  }
                } else {
                  throw createError;
                }
              }
            }
          }
        },
        {
          timeout: 30000, // 30 segundos por lote
        }
      );
    }

    return NextResponse.json({
      ok: true,
      total: entries.length,
      criados,
      atualizados,
      ignorados,
      detalhes,
      invalid,
      unmatched: unmatched.length > 0 ? unmatched : undefined,
    });
  } catch (e: any) {
    console.error('Erro ao importar planilha Mercantil:', e);
    return NextResponse.json(
      { error: e?.message || 'Erro no import' },
      { status: 500 }
    );
  }
}

