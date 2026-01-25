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
    const grupoId = String(form.get('grupoId') || '') || undefined;
    const unidadeId = String(form.get('unidadeId') || '') || undefined;

    if (!file)
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );
    if (!grupoId)
      return NextResponse.json({ error: 'grupoId requerido' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    let entries: Array<{ codigo: number | null; nome: string; cpf: string }> =
      [];
    const invalid: Array<{ row: number; reason: string }> = [];
    const duplicateInSheet: Array<{ row: number; cpf: string }> = [];

    const isPdf =
      (file.type || '').includes('pdf') || /\.pdf$/i.test(file.name || '');
    if (isPdf) {
      const pdfParse = (await import('pdf-parse')).default as any;
      const data = await pdfParse(buf);
      const text: string = String(data.text || '');
      const lines = text
        .split(/\r?\n/)
        .map(l => l.replace(/\s{2,}/g, ' ').trim())
        .filter(Boolean);
      const cpfRegex = /(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2})/;
      const setCpfs = new Set<string>();
      for (let idx = 0; idx < lines.length; idx++) {
        const l = lines[idx];
        const m = l.match(cpfRegex);
        if (!m) continue;
        let cpf = cleanCpf(m[1]);
        if (cpf.length < 11 && cpf.length >= 9) cpf = cpf.padStart(11, '0');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
          invalid.push({ row: idx + 1, reason: 'CPF inválido' });
          continue;
        }
        let nome = l.slice(0, l.indexOf(m[1])).trim();
        nome = nome.replace(/^\d+\s+/, '').trim();
        if (!nome) {
          invalid.push({ row: idx + 1, reason: 'Nome vazio' });
          continue;
        }
        if (setCpfs.has(cpf)) {
          duplicateInSheet.push({ row: idx + 1, cpf });
          continue;
        }
        setCpfs.add(cpf);
        entries.push({ codigo: null, nome: normName(nome), cpf });
      }
    } else {
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, {
        header: 1,
        defval: '',
        raw: true,
      });
      const seen = new Set<string>();
      // Sem cabeçalho: começar da linha 1 (índice 0)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;
        const codigoCell = row[0]; // A
        const nomeRaw = row[2]; // C
        const cpfCell = row[14]; // O (índice 14)

        // Ignorar linhas totalmente vazias (A,C,O)
        if (
          (codigoCell === '' || codigoCell == null) &&
          (nomeRaw === '' || nomeRaw == null) &&
          (cpfCell === '' || cpfCell == null)
        )
          continue;

        const codigo = (() => {
          if (codigoCell == null || codigoCell === '') return null;
          const n = Number(
            typeof codigoCell === 'number'
              ? Math.trunc(codigoCell)
              : String(codigoCell).replace(/\D/g, '')
          );
          return Number.isFinite(n) ? n : null;
        })();

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
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
          invalid.push({ row: i + 1, reason: 'CPF inválido' });
          continue;
        }
        if (seen.has(cpf)) {
          duplicateInSheet.push({ row: i + 1, cpf });
          continue;
        }
        seen.add(cpf);
        entries.push({ codigo, nome, cpf });
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum colaborador encontrado na planilha' },
        { status: 400 }
      );
    }

    let criados = 0,
      atualizados = 0,
      ignorados = 0;
    const detalhes: any[] = [];

    await prisma.$transaction(async tx => {
      for (const e of entries) {
        const exists = await tx.funcionario.findFirst({
          where: { cpf: e.cpf },
        });
        if (exists) {
          await tx.funcionario.update({
            where: { id: exists.id },
            data: {
              nome: e.nome,
              codigo: e.codigo ?? null,
              grupoId: grupoId!,
              unidadeId: unidadeId || exists.unidadeId || null,
            } as any,
          });
          atualizados++;
          detalhes.push({
            status: 'update',
            id: exists.id,
            nome: e.nome,
            cpf: e.cpf,
            codigo: e.codigo,
          });
        } else {
          const created = await tx.funcionario.create({
            data: {
              nome: e.nome,
              cpf: e.cpf,
              codigo: e.codigo,
              grupoId: grupoId!,
              unidadeId: unidadeId || null,
            } as any,
          });
          criados++;
          detalhes.push({
            status: 'create',
            id: created.id,
            nome: e.nome,
            cpf: e.cpf,
            codigo: e.codigo,
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      total: entries.length,
      criados,
      atualizados,
      ignorados,
      detalhes,
      invalid,
      duplicateInSheet,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erro no import' },
      { status: 500 }
    );
  }
}
