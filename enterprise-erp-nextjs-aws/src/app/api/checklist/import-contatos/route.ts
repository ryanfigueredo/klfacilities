import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface RowData {
  'GRUPO': string;
  'CARGO': string;
  'NOME': string;
  'SUPERVISOR'?: string;
  'CRACHA'?: string;
  'WHATS APP'?: string;
  'WHATSAPP'?: string;
  'WHATSAPP SUP'?: string;
  'WHATSAPP LIDER'?: string;
}

function parseGrupo(grupo: string): {
  grupos: string[];
  unidade?: string;
} {
  const trimmed = grupo.trim();
  
  if (!trimmed) {
    return { grupos: [] };
  }

  if (trimmed.includes('/')) {
    const grupos = trimmed
      .split('/')
      .map(g => g.trim())
      .filter(Boolean);
    return { grupos, unidade: undefined };
  }

  const gruposConhecidos = ['Spani', 'Giga', 'Profarma', 'Mundial', 'Mercantil', 'Gbarbosa', 'TotalAtacado'];
  
  const palavras = trimmed.split(/\s+/);
  
  if (palavras.length >= 2) {
    const primeiroNome = palavras[0];
    
    if (gruposConhecidos.includes(primeiroNome)) {
      const unidade = palavras.slice(1).join(' ');
      return { grupos: [primeiroNome], unidade };
    }
  }

  return { grupos: [trimmed], unidade: undefined };
}

function parseCargo(cargo: string | undefined): 'LIDER' | 'SUPERVISOR' | null {
  if (!cargo) return null;
  const upper = cargo.toUpperCase().trim();
  if (upper.includes('LÍDER') || upper.includes('LIDER') || upper.includes('NOTURNO')) {
    return 'LIDER';
  }
  if (upper.includes('SUPERVISOR') || upper.includes('SUPER')) {
    return 'SUPERVISOR';
  }
  return null;
}

function parseWhatsApp(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw === '-' || raw === '--') return null;
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) return null;
  return cleaned;
}

function extractWhatsApp(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    const parsed = parseWhatsApp(candidate);
    if (parsed) return parsed;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json<RowData>(worksheet);

    const stats = {
      gruposCriados: 0,
      unidadesCriadas: 0,
      contatosAtualizados: 0,
      erros: [] as string[],
      linhasProcessadas: 0,
    };

    // Buscar todos os grupos e unidades existentes
    const gruposExistentes = await prisma.grupo.findMany({
      select: { id: true, nome: true },
    });
    const unidadesExistentes = await prisma.unidade.findMany({
      select: { id: true, nome: true },
    });

    const gruposMap = new Map(gruposExistentes.map(g => [g.nome, g]));
    const unidadesMap = new Map(unidadesExistentes.map(u => [u.nome, u]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linha = i + 2;
      
      if (!row['GRUPO'] || !row['CARGO'] || !row['NOME']) {
        if (!row['GRUPO'] && !row['CARGO'] && !row['NOME']) {
          continue;
        }
        stats.erros.push(`Linha ${linha}: Dados incompletos`);
        continue;
      }

      const cargo = parseCargo(row['CARGO']);
      if (!cargo) {
        stats.erros.push(`Linha ${linha}: Cargo inválido`);
        continue;
      }

      const whatsappLider = extractWhatsApp(
        row['WHATSAPP LIDER'],
        row['WHATS APP'],
        row['WHATSAPP']
      );
      const whatsappSupervisor = extractWhatsApp(
        row['WHATSAPP SUP'],
        row['WHATS APP'],
        row['WHATSAPP']
      );

      const targetWhatsApp =
        cargo === 'LIDER' ? whatsappLider : whatsappSupervisor;

      if (!targetWhatsApp) {
        stats.erros.push(`Linha ${linha}: WhatsApp inválido`);
        continue;
      }

      const { grupos: gruposParseados, unidade } = parseGrupo(row['GRUPO']);
      
      if (gruposParseados.length === 0) {
        stats.erros.push(`Linha ${linha}: Não foi possível identificar o grupo`);
        continue;
      }

      // Processar cada grupo (caso tenha múltiplos)
      for (const grupoNome of gruposParseados) {
        // Criar ou buscar grupo
        let grupo = gruposMap.get(grupoNome);
        if (!grupo) {
          grupo = await prisma.grupo.create({
            data: { nome: grupoNome, ativo: true },
          });
          gruposMap.set(grupoNome, grupo);
          stats.gruposCriados++;
        }

        // Criar ou buscar unidade (se tiver)
        let unidadeRecord = null;
        if (unidade) {
          unidadeRecord = unidadesMap.get(unidade);
          if (!unidadeRecord) {
            unidadeRecord = await prisma.unidade.create({
              data: { nome: unidade, ativa: true },
            });
            unidadesMap.set(unidade, unidadeRecord);
            stats.unidadesCriadas++;
          }
        }

        // Atualizar contatos na unidade
        if (unidadeRecord) {
          const updateData: any = {};

          if (whatsappLider && (cargo === 'LIDER' || !updateData.whatsappLider)) {
            updateData.whatsappLider = whatsappLider;
          }
          if (whatsappSupervisor && (cargo === 'SUPERVISOR' || !updateData.whatsappSupervisor)) {
            updateData.whatsappSupervisor = whatsappSupervisor;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.unidade.update({
              where: { id: unidadeRecord.id },
              data: updateData,
            });
            stats.contatosAtualizados++;
          }
        }

        // Criar mapeamento se não existir
        if (unidadeRecord) {
          // Buscar responsável padrão ou criar
          let responsavel = await prisma.responsavel.findFirst({
            where: { nome: 'Sem Responsável' },
          });

          if (!responsavel) {
            responsavel = await prisma.responsavel.create({
              data: { nome: 'Sem Responsável', ativo: true },
            });
          }

          // Criar ou atualizar mapeamento
          await prisma.mapeamentoGrupoUnidadeResponsavel.upsert({
            where: {
              grupoId_unidadeId_responsavelId: {
                grupoId: grupo.id,
                unidadeId: unidadeRecord.id,
                responsavelId: responsavel.id,
              },
            },
            update: { ativo: true },
            create: {
              grupoId: grupo.id,
              unidadeId: unidadeRecord.id,
              responsavelId: responsavel.id,
              ativo: true,
            },
          });
        }
      }

      stats.linhasProcessadas++;
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Erro ao importar contatos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
