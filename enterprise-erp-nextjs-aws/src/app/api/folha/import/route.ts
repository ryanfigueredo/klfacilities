import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { can, forbiddenPayload } from '@/lib/auth/policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ItemSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().positive(),
  data: z.string().optional(), // yyyy-MM-dd
});

const BodySchema = z.object({
  grupoId: z.string().min(1),
  categoriaId: z.string().min(1),
  valorTotal: z.number().positive(),
  formaPagamento: z.string().optional(),
  dataPai: z.string().optional(), // yyyy-MM-dd
  items: z.array(ItemSchema).min(1),
  force: z.boolean().optional(),
});

function toUTCNoon(dateStr?: string): Date {
  const base = dateStr ? new Date(dateStr) : new Date();
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      12,
      0,
      0,
      0
    )
  );
}

function competenciaFrom(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function checksumStr(nome: string, valor: number, dataISO?: string) {
  return `${nome.trim().toUpperCase()}|${valor.toFixed(2)}|${dataISO || ''}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.role) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!can(session.user.role as any, 'movimentos', 'create')) {
      return NextResponse.json(forbiddenPayload('movimentos', 'create'), {
        status: 403,
      });
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const {
      grupoId,
      categoriaId,
      valorTotal,
      formaPagamento,
      dataPai,
      items,
      force,
    } = parsed.data;

    // Validação do total
    const soma = items.reduce((a, b) => a + b.valor, 0);
    if (Math.abs(soma - valorTotal) > 0.05) {
      return NextResponse.json(
        {
          error: `Soma dos salários (${soma.toFixed(2)}) difere do total (${valorTotal.toFixed(
            2
          )})`,
        },
        { status: 400 }
      );
    }

    const dataLancPai = toUTCNoon(dataPai);
    const competenciaPai = competenciaFrom(dataLancPai);

    // Buscar nome da categoria para compor descrição
    const cat = await prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { nome: true },
    });
    const categoriaNome = (cat?.nome || 'Salário').toString();

    // Normalizar itens e calcular checksum fora do loop/transação
    const itemsNorm = items.map(it => {
      const dataISO =
        it.data || dataPai || dataLancPai.toISOString().slice(0, 10);
      const dataLanc = toUTCNoon(dataISO);
      const competencia = competenciaFrom(dataLanc);
      const checksum = checksumStr(it.nome, it.valor, dataISO);
      return { ...it, dataISO, dataLanc, competencia, checksum };
    });

    const result = await prisma.$transaction(
      async tx => {
        // ImportBatch
        const batch = await tx.importBatch.create({
          data: {
            origem: 'FOLHA_SALARIAL',
            filename: null,
            totalLinhas: items.length,
            status: 'CONCLUIDO',
            createdById: session.user.id,
          },
        });

        let importadas = 0;
        // Verificar duplicados em lote
        const existing = await tx.importItem.findMany({
          where: {
            origem: 'FOLHA_SALARIAL',
            checksum: { in: itemsNorm.map(x => x.checksum) },
          },
          select: { checksum: true },
        });
        const existingSet = new Set(existing.map(e => e.checksum));
        let candidates = itemsNorm.filter(x => !existingSet.has(x.checksum));
        if (force && candidates.length !== itemsNorm.length) {
          await tx.importItem.deleteMany({
            where: {
              origem: 'FOLHA_SALARIAL',
              checksum: { in: itemsNorm.map(x => x.checksum) },
            },
          });
          candidates = itemsNorm;
        }
        const duplicadas = itemsNorm.length - candidates.length;

        for (const it of candidates) {
          const mov = await tx.movimento.create({
            data: {
              tipo: 'DESPESA',
              dataLanc: it.dataLanc,
              competencia: it.competencia,
              descricao: `${categoriaNome} - ${it.nome}`,
              grupoId,
              unidadeId: null,
              categoriaId,
              formaPagamento: formaPagamento || 'SOMAPAY',
              valor: it.valor,
              valorAssinado: -it.valor,
              criadoPorId: session.user.id,
              origem: 'FOLHA_SALARIAL',
              responsavel: it.nome,
            },
          });

          await tx.importItem.create({
            data: {
              batchId: batch.id,
              data: it.dataLanc,
              valor: it.valor,
              descricao: `${categoriaNome} - ${it.nome}`,
              documento: null,
              origem: 'FOLHA_SALARIAL',
              checksum: it.checksum,
              status: 'IMPORTED',
              movimentoId: mov.id,
              grupoId,
              unidadeId: null,
              rawJson: { nome: it.nome },
            },
          });
          importadas++;
        }

        return { importadas, duplicadas, batchId: batch.id };
      },
      { timeout: 30000 }
    );

    revalidatePath('/dashboard');
    revalidatePath('/movimentos');

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[FOLHA_IMPORT][POST]', e);
    return NextResponse.json(
      { error: e?.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
