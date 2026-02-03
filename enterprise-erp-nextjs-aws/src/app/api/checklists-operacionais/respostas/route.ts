import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createHash } from 'crypto';
import { ChecklistPerguntaTipo, ChecklistRespostaStatus } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import {
  respostaListSelect,
  serializeResposta,
} from '@/lib/checklists-operacionais/serializer';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import { getSupervisorScope } from '@/lib/supervisor-scope';

// Helper function to convert IP string to BigInt
function ipToBigInt(ip: string): bigint | undefined {
  if (!ip) return undefined;

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
      return BigInt(
        parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3]
      );
    }
  }

  // Handle IPv6 (simplified - just convert to BigInt if possible)
  if (ip.includes(':')) {
    try {
      // For simplicity, we'll hash IPv6 addresses to a BigInt
      const hash = createHash('sha256').update(ip).digest();
      return BigInt('0x' + hash.slice(0, 8).toString('hex'));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

type AnswerPayload = {
  perguntaId: string;
  tipo: ChecklistPerguntaTipo;
  valorTexto?: string | null;
  valorBoolean?: boolean | string | null;
  valorNumero?: number | string | null;
  valorOpcao?: string | null;
  nota?: number | null;
  fotoUrl?: string | null;
};

export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Permitir que SUPERVISOR e LAVAGEM leiam seus próprios rascunhos
  // Outros roles precisam de permissão 'read'
  if (me.role !== 'SUPERVISOR' && me.role !== 'LAVAGEM') {
    if (!can(me.role, 'checklists', 'read')) {
      return NextResponse.json(forbiddenPayload('checklists', 'read'), {
        status: 403,
      });
    }
  } else {
    // SUPERVISOR e LAVAGEM precisam pelo menos de 'list' ou 'create'
    if (
      !can(me.role, 'checklists', 'list') &&
      !can(me.role, 'checklists', 'create')
    ) {
      return NextResponse.json(forbiddenPayload('checklists', 'read'), {
        status: 403,
      });
    }
  }

  const { searchParams } = new URL(request.url);
  const escopoId = searchParams.get('escopoId');

  if (!escopoId) {
    return NextResponse.json(
      { error: 'escopoId é obrigatório' },
      { status: 400 }
    );
  }

  // Buscar rascunho existente para este escopo e supervisor
  if (process.env.NODE_ENV === 'development') {
    console.log('[API GET /respostas] Buscando rascunho:', {
      escopoId,
      supervisorId: me.id,
      status: ChecklistRespostaStatus.RASCUNHO,
    });
  }

  const rascunho = await prisma.checklistResposta.findFirst({
    where: {
      escopoId,
      supervisorId: me.id,
      status: ChecklistRespostaStatus.RASCUNHO,
    },
    include: {
      respostas: {
        include: {
          pergunta: true,
        },
      },
      template: {
        include: {
          grupos: {
            orderBy: { ordem: 'asc' },
            include: {
              perguntas: {
                orderBy: { ordem: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!rascunho) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API GET /respostas] ⚠️ Rascunho NÃO encontrado para:', {
        escopoId,
        supervisorId: me.id,
      });
    }
    return NextResponse.json({ rascunho: null }, { status: 200 });
  }

  // Log para debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[API GET /respostas] Rascunho encontrado:', {
      id: rascunho.id,
      totalRespostas: rascunho.respostas.length,
      respostas: rascunho.respostas.map(r => ({
        perguntaId: r.perguntaId,
        tipo: r.pergunta.tipo,
        valorTexto: r.valorTexto,
        valorBoolean: r.valorBoolean,
        valorNumero: r.valorNumero,
        valorOpcao: r.valorOpcao,
        nota: r.nota,
      })),
    });
  }

  const respostaFormatada = {
    rascunho: {
      id: rascunho.id,
      escopoId: rascunho.escopoId,
      observacoes: rascunho.observacoes,
      startedAt: rascunho.startedAt,
      updatedAt: rascunho.updatedAt,
      lat: rascunho.lat,
      lng: rascunho.lng,
      accuracy: rascunho.accuracy,
      respostas: rascunho.respostas.map(r => ({
        perguntaId: r.perguntaId,
        valorTexto: r.valorTexto,
        valorBoolean: r.valorBoolean,
        valorNumero: r.valorNumero,
        valorOpcao: r.valorOpcao,
        fotoUrl: r.fotoUrl,
        observacao: r.observacao,
        nota: r.nota,
        pergunta: {
          id: r.pergunta.id,
          tipo: r.pergunta.tipo,
        },
      })),
    },
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[API GET /respostas] Retornando rascunho:', {
      rascunhoId: respostaFormatada.rascunho.id,
      totalRespostas: respostaFormatada.rascunho.respostas.length,
      respostas: respostaFormatada.rascunho.respostas.map(r => ({
        perguntaId: r.perguntaId,
        tipo: r.pergunta.tipo,
        valorBoolean: r.valorBoolean,
        temNota: r.nota !== undefined && r.nota !== null,
        nota: r.nota,
      })),
    });
  }

  return NextResponse.json(respostaFormatada);
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser(request);

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Verificar permissão de criar checklists
  // SUPERVISOR e LAVAGEM têm permissão 'create', então devem passar
  if (!can(me.role, 'checklists', 'create')) {
    return NextResponse.json(forbiddenPayload('checklists', 'create'), {
      status: 403,
    });
  }

  const formData = await request.formData();

  const escopoId = String(formData.get('escopoId') ?? '').trim();
  const observacoesRaw = formData.get('observacoes');
  const observacoes = observacoesRaw ? String(observacoesRaw).trim() : null;
  const answersRaw = formData.get('answers');
  // Verificar se é rascunho (se não especificado, assume que não é)
  const isDraft = formData.get('isDraft') === 'true';
  const respostaIdRaw = formData.get('respostaId'); // Para atualizar rascunho existente
  const respostaId = respostaIdRaw ? String(respostaIdRaw).trim() : null;

  // Dados de assinatura
  const assinaturaFoto = formData.get('assinaturaFoto');
  const assinaturaGerenteDataUrl = formData.get('assinaturaGerenteDataUrl');
  const lat = formData.get('lat') ? Number(formData.get('lat')) : undefined;
  const lng = formData.get('lng') ? Number(formData.get('lng')) : undefined;
  const accuracy = formData.get('accuracy')
    ? Number(formData.get('accuracy'))
    : undefined;

  // Log para debug (apenas em desenvolvimento) - depois de declarar lat/lng
  if (process.env.NODE_ENV === 'development') {
    console.log('Recebendo checklist:', {
      escopoId,
      respostaId,
      isDraft,
      hasObservacoes: !!observacoes,
      observacoesValue:
        typeof observacoes === 'string'
          ? observacoes.substring(0, 50)
          : observacoes,
      hasAnswers: !!answersRaw,
      answersLength: typeof answersRaw === 'string' ? answersRaw.length : 0,
      lat,
      lng,
    });
  }
  const endereco = String(formData.get('endereco') ?? '').trim() || null;
  const deviceId = String(formData.get('deviceId') ?? '').trim();
  const userAgent = request.headers.get('user-agent') || '';
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || '';

  if (!escopoId) {
    return NextResponse.json(
      { error: 'validation_error', message: 'escopoId é obrigatório.' },
      { status: 422 }
    );
  }

  if (typeof answersRaw !== 'string') {
    return NextResponse.json(
      { error: 'validation_error', message: 'answers inválido.' },
      { status: 422 }
    );
  }

  let answers: AnswerPayload[] = [];

  try {
    if (!answersRaw || typeof answersRaw !== 'string') {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'answers é obrigatório e deve ser uma string JSON.',
        },
        { status: 422 }
      );
    }
    const parsed = JSON.parse(answersRaw);
    if (Array.isArray(parsed)) {
      answers = parsed as AnswerPayload[];

      if (process.env.NODE_ENV === 'development') {
        console.log('[respostas POST] Answers parseados:', {
          total: answers.length,
          answers: answers.map(a => ({
            perguntaId: a.perguntaId,
            tipo: a.tipo,
            temValorTexto: !!a.valorTexto,
            temValorBoolean:
              a.valorBoolean !== undefined && a.valorBoolean !== null,
            valorBoolean: a.valorBoolean,
            temValorNumero:
              a.valorNumero !== undefined && a.valorNumero !== null,
            temValorOpcao: !!a.valorOpcao,
            temNota: a.nota !== undefined && a.nota !== null,
            nota: a.nota,
          })),
        });
      }
    } else {
      return NextResponse.json(
        { error: 'validation_error', message: 'answers deve ser um array.' },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Erro ao parsear respostas do checklist:', error);
    console.error('Conteúdo de answersRaw:', answersRaw);
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `Erro ao processar respostas: ${error instanceof Error ? error.message : 'JSON inválido'}.`,
      },
      { status: 422 }
    );
  }

  const escopo = await prisma.checklistEscopo.findUnique({
    where: { id: escopoId },
    include: {
      template: {
        select: {
          id: true,
          titulo: true,
          ativo: true,
          grupos: {
            include: {
              perguntas: true,
            },
          },
        },
      },
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      grupo: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!escopo || !escopo.template.ativo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (me.role === 'SUPERVISOR' || me.role === 'LAVAGEM') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.length) {
      return NextResponse.json(
        {
          error: 'Sem permissão para enviar checklist',
          message:
            'Você não está vinculado a nenhuma unidade ou grupo. Peça a um administrador para configurar seu escopo em Supervisores.',
          code: 'scope_vazio',
        },
        { status: 403 }
      );
    }
    if (!scope.unidadeIds.includes(escopo.unidadeId)) {
      return NextResponse.json(
        {
          error: 'Sem permissão para enviar checklist nesta unidade',
          message:
            'Esta unidade não está no seu escopo. Você só pode enviar checklists para unidades/grupos aos quais está vinculado.',
          code: 'unidade_fora_do_escopo',
        },
        { status: 403 }
      );
    }
  }

  const perguntas = escopo.template.grupos.flatMap(grupo => grupo.perguntas);

  const respostasProcessadas: Array<{
    perguntaId: string;
    valorTexto?: string | null;
    valorBoolean?: boolean | null;
    valorNumero?: number | null;
    valorOpcao?: string | null;
    fotoUrl?: string | null;
    observacao?: string | null;
    nota?: number | null;
  }> = [];

  for (const pergunta of perguntas) {
    const payload = answers.find(item => item.perguntaId === pergunta.id);

    if (process.env.NODE_ENV === 'development' && payload) {
      console.log('[respostas POST] Processando pergunta:', {
        perguntaId: pergunta.id,
        tipo: pergunta.tipo,
        payload: {
          perguntaId: payload.perguntaId,
          tipo: payload.tipo,
          temValorBoolean:
            payload.valorBoolean !== undefined && payload.valorBoolean !== null,
          valorBoolean: payload.valorBoolean,
          temNota: payload.nota !== undefined && payload.nota !== null,
          nota: payload.nota,
        },
      });
    }

    switch (pergunta.tipo) {
      case ChecklistPerguntaTipo.TEXTO: {
        const value = payload?.valorTexto?.toString().trim() ?? '';
        if (pergunta.obrigatoria && !value && !isDraft) {
          return NextResponse.json(
            {
              error: 'validation_error',
              message: `A pergunta "${pergunta.titulo}" é obrigatória.`,
            },
            { status: 422 }
          );
        }
        if (value) {
          const resposta: (typeof respostasProcessadas)[0] = {
            perguntaId: pergunta.id,
            valorTexto: value,
          };
          // Adicionar nota se existir no payload
          if (payload?.nota !== undefined && payload.nota !== null) {
            resposta.nota =
              typeof payload.nota === 'number'
                ? payload.nota
                : Number(payload.nota);
          }
          respostasProcessadas.push(resposta);
        }
        break;
      }
      case ChecklistPerguntaTipo.FOTO: {
        // Verificar se permite múltiplas fotos
        const permiteMultiplas = pergunta.permiteMultiplasFotos ?? false;

        // Helper: extrair URLs do payload (fotos já salvas no rascunho, vindas do mobile)
        const parseFotoUrlFromPayload = (): string[] | null => {
          const raw = payload?.fotoUrl;
          if (!raw || typeof raw !== 'string') return null;
          try {
            const parsed = raw.trim().startsWith('[') ? JSON.parse(raw) : [raw];
            const urls = Array.isArray(parsed)
              ? parsed.filter(
                  (u: unknown) =>
                    typeof u === 'string' &&
                    (u.startsWith('http://') || u.startsWith('https://'))
                )
              : [];
            return urls.length > 0 ? urls : null;
          } catch {
            return typeof raw === 'string' &&
              (raw.startsWith('http://') || raw.startsWith('https://'))
              ? [raw]
              : null;
          }
        };

        if (permiteMultiplas) {
          // Coletar fotos do FormData (novas fotos sendo enviadas)
          const filesToUpload: Array<{ file: File; index: number }> = [];
          let index = 0;

          while (true) {
            const file = formData.get(`foto_${pergunta.id}_${index}`);
            if (!(file instanceof Blob) || file.size === 0) break;
            filesToUpload.push({ file: file as File, index });
            index++;
          }

          let fotos: string[];

          if (filesToUpload.length > 0) {
            // Fazer uploads em paralelo
            const uploadPromises = filesToUpload.map(
              async ({ file, index }) => {
                const buffer = Buffer.from(await file.arrayBuffer());
                return uploadBufferToS3({
                  buffer,
                  originalName:
                    file.name || `checklist-${pergunta.id}-${index}.jpg`,
                  contentType: file.type || 'image/jpeg',
                  prefix: `checklists/${escopo.template.id}`,
                });
              }
            );
            const fotosNovas = await Promise.all(uploadPromises);
            // Mesclar com URLs já existentes no payload (fotos do rascunho)
            const urlsFromPayload = parseFotoUrlFromPayload();
            fotos = urlsFromPayload
              ? [...urlsFromPayload, ...fotosNovas]
              : fotosNovas;
          } else {
            // Sem arquivos no FormData: verificar se payload tem fotoUrl (fotos já salvas no rascunho)
            const urlsFromPayload = parseFotoUrlFromPayload();
            if (urlsFromPayload) {
              fotos = urlsFromPayload;
            } else {
              // Sem fotos: não exige (supervisor sabe que deve enviar; quando tiver, envia certinho)
              break;
            }
          }

          const resposta: (typeof respostasProcessadas)[0] = {
            perguntaId: pergunta.id,
            fotoUrl: JSON.stringify(fotos),
          };
          if (payload?.nota !== undefined && payload.nota !== null) {
            resposta.nota =
              typeof payload.nota === 'number'
                ? payload.nota
                : Number(payload.nota);
          }
          respostasProcessadas.push(resposta);
        } else {
          // Processar foto única (comportamento original)
          const file = formData.get(`foto_${pergunta.id}`);

          let photoUrl: string;

          if (file instanceof Blob && file.size > 0) {
            const buffer = Buffer.from(await file.arrayBuffer());
            photoUrl = await uploadBufferToS3({
              buffer,
              originalName:
                (file as File).name || `checklist-${pergunta.id}.jpg`,
              contentType: file.type || 'image/jpeg',
              prefix: `checklists/${escopo.template.id}`,
            });
          } else {
            // Sem arquivo no FormData: verificar se payload tem fotoUrl (foto já salva no rascunho)
            const urlsFromPayload = parseFotoUrlFromPayload();
            if (urlsFromPayload && urlsFromPayload.length > 0) {
              photoUrl = urlsFromPayload[0];
            } else {
              // Sem foto: não exige (supervisor sabe que deve enviar; quando tiver, envia certinho)
              break;
            }
          }

          const resposta: (typeof respostasProcessadas)[0] = {
            perguntaId: pergunta.id,
            fotoUrl: photoUrl,
          };
          if (payload?.nota !== undefined && payload.nota !== null) {
            resposta.nota =
              typeof payload.nota === 'number'
                ? payload.nota
                : Number(payload.nota);
          }
          respostasProcessadas.push(resposta);
        }
        break;
      }
      case ChecklistPerguntaTipo.BOOLEANO: {
        // Para perguntas booleanas, false também é uma resposta válida
        // Apenas undefined/null indica que não foi respondida
        if (
          payload?.valorBoolean === undefined ||
          payload.valorBoolean === null
        ) {
          if (pergunta.obrigatoria && !isDraft) {
            return NextResponse.json(
              {
                error: 'validation_error',
                message: `Informe uma resposta (Conforme ou Não Conforme) para "${pergunta.titulo}".`,
              },
              { status: 422 }
            );
          }
          // Para rascunhos, mesmo sem valor boolean, se tiver nota, adicionar a resposta
          if (isDraft && payload?.nota !== undefined && payload.nota !== null) {
            const resposta: (typeof respostasProcessadas)[0] = {
              perguntaId: pergunta.id,
              valorBoolean: null,
              observacao: null,
              nota:
                typeof payload.nota === 'number'
                  ? payload.nota
                  : Number(payload.nota),
            };
            respostasProcessadas.push(resposta);
          }
          break;
        }

        const value =
          typeof payload.valorBoolean === 'boolean'
            ? payload.valorBoolean
            : payload.valorBoolean === 'true';

        // Buscar observação de não conformidade se existir
        const observacaoRaw = formData.get(`observacao_${pergunta.id}`);
        let observacao: string | null = null;

        if (observacaoRaw && typeof observacaoRaw === 'string') {
          try {
            const details = JSON.parse(observacaoRaw);
            observacao = `Motivo: ${details.motivo}\n\nO que foi feito para resolver: ${details.resolucao}`;
          } catch {
            // Se não conseguir parsear, usar o valor direto
            observacao = observacaoRaw;
          }
        }

        // Sempre adiciona a resposta, mesmo que seja false (Não Conforme)
        const resposta: (typeof respostasProcessadas)[0] = {
          perguntaId: pergunta.id,
          valorBoolean: value,
          observacao,
        };
        // Adicionar nota se existir no payload
        if (payload?.nota !== undefined && payload.nota !== null) {
          resposta.nota =
            typeof payload.nota === 'number'
              ? payload.nota
              : Number(payload.nota);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[respostas POST] Processando resposta BOOLEANO:', {
            perguntaId: pergunta.id,
            valorBoolean: value,
            temNota: resposta.nota !== undefined && resposta.nota !== null,
            nota: resposta.nota,
            temObservacao: !!observacao,
            respostaCompleta: resposta,
          });
        }

        respostasProcessadas.push(resposta);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[respostas POST] ✅ Resposta BOOLEANO adicionada ao array. Total:',
            respostasProcessadas.length
          );
        }
        break;
      }
      case ChecklistPerguntaTipo.NUMERICO: {
        const raw =
          typeof payload?.valorNumero === 'number'
            ? payload.valorNumero
            : Number(payload?.valorNumero);
        if (
          (payload?.valorNumero === undefined || Number.isNaN(raw)) &&
          pergunta.obrigatoria &&
          !isDraft
        ) {
          return NextResponse.json(
            {
              error: 'validation_error',
              message: `Informe um valor numérico para "${pergunta.titulo}".`,
            },
            { status: 422 }
          );
        }
        if (!Number.isNaN(raw)) {
          const resposta: (typeof respostasProcessadas)[0] = {
            perguntaId: pergunta.id,
            valorNumero: raw,
          };
          // Adicionar nota se existir no payload
          if (payload?.nota !== undefined && payload.nota !== null) {
            resposta.nota =
              typeof payload.nota === 'number'
                ? payload.nota
                : Number(payload.nota);
          }
          respostasProcessadas.push(resposta);
        }
        break;
      }
      case ChecklistPerguntaTipo.SELECAO: {
        const value = payload?.valorOpcao?.toString() ?? '';
        if (pergunta.obrigatoria && !value && !isDraft) {
          return NextResponse.json(
            {
              error: 'validation_error',
              message: `Selecione uma opção para "${pergunta.titulo}".`,
            },
            { status: 422 }
          );
        }
        if (value && !pergunta.opcoes.includes(value)) {
          return NextResponse.json(
            {
              error: 'validation_error',
              message: `Opção inválida para "${pergunta.titulo}".`,
            },
            { status: 422 }
          );
        }
        if (value) {
          const resposta: (typeof respostasProcessadas)[0] = {
            perguntaId: pergunta.id,
            valorOpcao: value,
          };
          // Adicionar nota se existir no payload
          if (payload?.nota !== undefined && payload.nota !== null) {
            resposta.nota =
              typeof payload.nota === 'number'
                ? payload.nota
                : Number(payload.nota);
          }
          respostasProcessadas.push(resposta);
        }
        break;
      }
      default: {
        break;
      }
    }

    // Processar fotos anexadas de TODAS as perguntas (disponível para todos os tipos, incluindo FOTO)
    try {
      const fotosAnexadas: File[] = [];
      let index = 0;

      while (true) {
        const file = formData.get(`foto_anexada_${pergunta.id}_${index}`);
        if (!(file instanceof Blob) || file.size === 0) break;
        fotosAnexadas.push(file as File);
        index++;
      }

      if (fotosAnexadas.length > 0) {
        // Fazer uploads em paralelo
        const uploadPromises = fotosAnexadas.map(async (file, idx) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          return uploadBufferToS3({
            buffer,
            originalName:
              file.name || `checklist-anexada-${pergunta.id}-${idx}.jpg`,
            contentType: file.type || 'image/jpeg',
            prefix: `checklists/${escopo.template.id}/anexadas`,
          });
        });

        const fotosUrls = await Promise.all(uploadPromises);

        // Adicionar fotos na resposta existente ou criar uma nova
        const respostaExistente = respostasProcessadas.find(
          r => r.perguntaId === pergunta.id
        );
        if (respostaExistente) {
          // Se já existe resposta, adicionar fotos no campo fotoUrl
          // Se já houver fotos, combinar com as novas
          if (respostaExistente.fotoUrl) {
            try {
              const fotosExistentes = JSON.parse(respostaExistente.fotoUrl);
              if (Array.isArray(fotosExistentes)) {
                respostaExistente.fotoUrl = JSON.stringify([
                  ...fotosExistentes,
                  ...fotosUrls,
                ]);
              } else {
                respostaExistente.fotoUrl = JSON.stringify([
                  fotosExistentes,
                  ...fotosUrls,
                ]);
              }
            } catch {
              // Se não conseguir parsear, criar novo array
              respostaExistente.fotoUrl = JSON.stringify([
                respostaExistente.fotoUrl,
                ...fotosUrls,
              ]);
            }
          } else {
            // Se não tem fotos ainda, adicionar as novas
            respostaExistente.fotoUrl =
              fotosUrls.length === 1 ? fotosUrls[0] : JSON.stringify(fotosUrls);
          }
        } else {
          // Se não existe resposta, criar uma apenas para as fotos anexadas
          respostasProcessadas.push({
            perguntaId: pergunta.id,
            fotoUrl:
              fotosUrls.length === 1 ? fotosUrls[0] : JSON.stringify(fotosUrls),
          });
        }
      }
    } catch (error) {
      console.error(
        `Erro ao processar fotos anexadas da pergunta ${pergunta.id}:`,
        error
      );
      // Não bloquear o envio se houver erro no upload de fotos anexadas
    }
  }

  // Log final do estado de respostas processadas
  if (process.env.NODE_ENV === 'development') {
    console.log('[respostas POST] Resumo final de respostas processadas:', {
      total: respostasProcessadas.length,
      isDraft,
      respostas: respostasProcessadas.map(r => ({
        perguntaId: r.perguntaId,
        temValorTexto: !!r.valorTexto,
        temValorBoolean:
          r.valorBoolean !== undefined && r.valorBoolean !== null,
        valorBoolean: r.valorBoolean,
        temValorNumero: r.valorNumero !== undefined && r.valorNumero !== null,
        temValorOpcao: !!r.valorOpcao,
        temFotoUrl: !!r.fotoUrl,
        temNota: r.nota !== undefined && r.nota !== null,
        nota: r.nota,
      })),
    });
  }

  // Confirmar que todas as perguntas obrigatórias foram respondidas (apenas se não for rascunho)
  if (!isDraft) {
    const perguntasObrigatorias = perguntas.filter(p => p.obrigatoria);

    if (process.env.NODE_ENV === 'development') {
      console.log('[respostas POST] Validando perguntas obrigatórias:', {
        totalObrigatorias: perguntasObrigatorias.length,
        perguntasObrigatorias: perguntasObrigatorias.map(p => ({
          id: p.id,
          titulo: p.titulo,
          tipo: p.tipo,
        })),
        totalRespostasProcessadas: respostasProcessadas.length,
      });
    }

    for (const pergunta of perguntasObrigatorias) {
      const resposta = respostasProcessadas.find(
        r => r.perguntaId === pergunta.id
      );

      if (!resposta) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `[respostas POST] ❌ Pergunta obrigatória SEM resposta: ${pergunta.titulo} (${pergunta.id})`
          );
        }
        return NextResponse.json(
          {
            error: 'validation_error',
            message: `A pergunta "${pergunta.titulo}" é obrigatória e não foi respondida.`,
            perguntaFaltante: {
              id: pergunta.id,
              titulo: pergunta.titulo,
              tipo: pergunta.tipo,
            },
          },
          { status: 422 }
        );
      }

      // Verificar se a resposta tem valor válido
      let temValor = false;
      switch (pergunta.tipo) {
        case ChecklistPerguntaTipo.TEXTO:
          temValor =
            !!resposta.valorTexto && resposta.valorTexto.trim().length > 0;
          break;
        case ChecklistPerguntaTipo.BOOLEANO:
          temValor =
            resposta.valorBoolean !== undefined &&
            resposta.valorBoolean !== null;
          break;
        case ChecklistPerguntaTipo.NUMERICO:
          temValor =
            resposta.valorNumero !== undefined && resposta.valorNumero !== null;
          break;
        case ChecklistPerguntaTipo.SELECAO:
          temValor =
            !!resposta.valorOpcao && resposta.valorOpcao.trim().length > 0;
          break;
        case ChecklistPerguntaTipo.FOTO:
          temValor = !!resposta.fotoUrl;
          break;
        default:
          temValor = false;
      }

      if (!temValor) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `[respostas POST] ❌ Pergunta obrigatória com resposta vazia: ${pergunta.titulo} (${pergunta.id})`,
            {
              tipo: pergunta.tipo,
              resposta: {
                temValorTexto: !!resposta.valorTexto,
                temValorBoolean:
                  resposta.valorBoolean !== undefined &&
                  resposta.valorBoolean !== null,
                valorBoolean: resposta.valorBoolean,
                temValorNumero:
                  resposta.valorNumero !== undefined &&
                  resposta.valorNumero !== null,
                temValorOpcao: !!resposta.valorOpcao,
                temFotoUrl: !!resposta.fotoUrl,
              },
            }
          );
        }
        return NextResponse.json(
          {
            error: 'validation_error',
            message: `A pergunta "${pergunta.titulo}" é obrigatória e precisa de uma resposta válida.`,
            perguntaFaltante: {
              id: pergunta.id,
              titulo: pergunta.titulo,
              tipo: pergunta.tipo,
            },
          },
          { status: 422 }
        );
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[respostas POST] ✅ Todas as perguntas obrigatórias foram respondidas corretamente'
      );
    }
  }

  // Processar assinaturas em paralelo para acelerar
  const uploadPromises: Promise<{
    tipo: 'supervisor' | 'gerente';
    url: string | null;
  }>[] = [];

  // Upload da assinatura do supervisor
  if (assinaturaFoto && assinaturaFoto instanceof Blob) {
    uploadPromises.push(
      (async () => {
        try {
          const arrayBuffer = await assinaturaFoto.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const timestamp = Date.now();
          const url = await uploadBufferToS3({
            buffer,
            originalName: `assinatura-${timestamp}-${me.id}.jpg`,
            contentType: 'image/jpeg',
            prefix: `checklists/assinaturas/${escopoId}`,
          });
          return { tipo: 'supervisor' as const, url };
        } catch (error) {
          console.error('Erro ao fazer upload da foto de assinatura:', error);
          // Retornar null em caso de erro para não bloquear o envio
          return { tipo: 'supervisor' as const, url: null };
        }
      })()
    );
  } else {
    uploadPromises.push(
      Promise.resolve({ tipo: 'supervisor' as const, url: null })
    );
  }

  // Upload da assinatura do gerente (data URL)
  if (
    assinaturaGerenteDataUrl &&
    typeof assinaturaGerenteDataUrl === 'string'
  ) {
    uploadPromises.push(
      (async () => {
        try {
          // Converter data URL para Buffer
          const base64Data = assinaturaGerenteDataUrl.replace(
            /^data:image\/\w+;base64,/,
            ''
          );
          const buffer = Buffer.from(base64Data, 'base64');
          const timestamp = Date.now();

          const url = await uploadBufferToS3({
            buffer,
            originalName: `assinatura-gerente-${timestamp}-${escopoId}.png`,
            contentType: 'image/png',
            prefix: `checklists/assinaturas-gerente/${escopoId}`,
          });
          return { tipo: 'gerente' as const, url };
        } catch (error) {
          console.error(
            'Erro ao fazer upload da assinatura do gerente:',
            error
          );
          // Não bloquear o envio se falhar a assinatura do gerente
          return { tipo: 'gerente' as const, url: null };
        }
      })()
    );
  } else {
    uploadPromises.push(
      Promise.resolve({ tipo: 'gerente' as const, url: null })
    );
  }

  // Aguardar todos os uploads em paralelo
  let assinaturaFotoUrl: string | null = null;
  let gerenteAssinaturaFotoUrl: string | null = null;

  try {
    const uploadResults = await Promise.all(uploadPromises);
    for (const result of uploadResults) {
      if (result.tipo === 'supervisor') {
        assinaturaFotoUrl = result.url;
      } else if (result.tipo === 'gerente') {
        gerenteAssinaturaFotoUrl = result.url;
      }
    }
  } catch (error) {
    console.error('Erro ao fazer upload das assinaturas:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível processar as assinaturas.',
      },
      { status: 500 }
    );
  }

  // Gerar protocolo e hash (apenas se não for rascunho ou se for finalizar)
  const now = new Date();
  let protocolo: string | null = null;
  let hash: string | null = null;

  if (!isDraft) {
    const canonical = [
      `ts=${now.toISOString()}`,
      `supervisor=${me.id}`,
      `unidade=${escopo.unidadeId}`,
      `template=${escopo.templateId}`,
      `escopo=${escopo.id}`,
      `ip=${ip || ''}`,
      `device=${deviceId || ''}`,
    ].join('|');
    hash = createHash('sha256').update(canonical).digest('hex');
    protocolo = `KL-${now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${hash.slice(0, 8).toUpperCase()}`;
  }

  try {
    const resposta = await prisma.$transaction(async tx => {
      // Se for rascunho e tiver respostaId, buscar rascunho existente para atualizar
      let rascunhoExistente = null;
      if (isDraft && respostaId) {
        rascunhoExistente = await tx.checklistResposta.findUnique({
          where: { id: respostaId },
        });

        // Verificar se o rascunho pertence ao supervisor e está em rascunho
        if (
          rascunhoExistente &&
          rascunhoExistente.supervisorId === me.id &&
          rascunhoExistente.status === ChecklistRespostaStatus.RASCUNHO
        ) {
          // Buscar respostas antigas para preservar fotos que não foram reenviadas
          const respostasAntigas = await tx.checklistRespostaPergunta.findMany({
            where: { respostaId: respostaId },
          });

          // Criar um mapa de fotos antigas por perguntaId
          const fotosAntigasMap = new Map<string, string | null>();
          respostasAntigas.forEach(r => {
            if (r.fotoUrl) {
              fotosAntigasMap.set(r.perguntaId, r.fotoUrl);
            }
          });

          // Atualizar rascunho existente
          const observacoesValue =
            typeof observacoes === 'string' && observacoes.trim()
              ? observacoes.trim()
              : null;

          if (process.env.NODE_ENV === 'development') {
            console.log('[respostas POST] Atualizando rascunho:', {
              respostaId,
              observacoesLength: observacoesValue?.length || 0,
              observacoesPreview:
                observacoesValue?.substring(0, 50) || '(null)',
              lat,
              lng,
              answersCount: respostasProcessadas.length,
            });
          }

          const updated = await tx.checklistResposta.update({
            where: { id: respostaId },
            data: {
              observacoes: observacoesValue,
              lat: lat !== undefined ? lat : null,
              lng: lng !== undefined ? lng : null,
              accuracy: accuracy !== undefined ? accuracy : null,
              endereco: endereco || null,
              userAgent: userAgent || null,
              deviceId: deviceId || null,
              updatedAt: new Date(),
            },
          });

          // Deletar respostas antigas
          await tx.checklistRespostaPergunta.deleteMany({
            where: { respostaId: respostaId },
          });

          // Log detalhado antes de salvar
          if (process.env.NODE_ENV === 'development') {
            console.log('[respostas POST] Estado antes de salvar respostas:', {
              respostaId,
              answersLength: answers.length,
              respostasProcessadasLength: respostasProcessadas.length,
              answers: answers.map(a => ({
                perguntaId: a.perguntaId,
                tipo: a.tipo,
                temValorTexto: !!a.valorTexto,
                temValorBoolean:
                  a.valorBoolean !== undefined && a.valorBoolean !== null,
                valorBoolean: a.valorBoolean,
                temValorNumero:
                  a.valorNumero !== undefined && a.valorNumero !== null,
                temValorOpcao: !!a.valorOpcao,
                temNota: a.nota !== undefined && a.nota !== null,
                nota: a.nota,
              })),
              respostasProcessadas: respostasProcessadas.map(r => ({
                perguntaId: r.perguntaId,
                temValorTexto: !!r.valorTexto,
                temValorBoolean:
                  r.valorBoolean !== undefined && r.valorBoolean !== null,
                valorBoolean: r.valorBoolean,
                temValorNumero:
                  r.valorNumero !== undefined && r.valorNumero !== null,
                temValorOpcao: !!r.valorOpcao,
                temFotoUrl: !!r.fotoUrl,
                temNota: r.nota !== undefined && r.nota !== null,
                nota: r.nota,
              })),
            });
          }

          // Criar novas respostas, preservando fotos antigas se não houver foto nova
          if (respostasProcessadas.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[respostas POST] Criando novas respostas:', {
                respostaId,
                totalRespostas: respostasProcessadas.length,
                respostas: respostasProcessadas.map(r => ({
                  perguntaId: r.perguntaId,
                  temValorTexto: !!r.valorTexto,
                  temValorBoolean:
                    r.valorBoolean !== undefined && r.valorBoolean !== null,
                  temValorNumero:
                    r.valorNumero !== undefined && r.valorNumero !== null,
                  temValorOpcao: !!r.valorOpcao,
                  temFotoUrl: !!r.fotoUrl,
                  temNota: r.nota !== undefined && r.nota !== null,
                })),
              });
            }

            const respostasParaSalvar = respostasProcessadas.map(
              respostaProcessada => {
                // Se não tem fotoUrl nova mas tinha foto antiga, preservar a antiga
                const fotoUrlFinal =
                  respostaProcessada.fotoUrl ??
                  fotosAntigasMap.get(respostaProcessada.perguntaId) ??
                  null;

                return {
                  respostaId: respostaId,
                  perguntaId: respostaProcessada.perguntaId,
                  valorTexto: respostaProcessada.valorTexto ?? null,
                  valorBoolean:
                    respostaProcessada.valorBoolean === undefined
                      ? null
                      : respostaProcessada.valorBoolean,
                  valorNumero:
                    respostaProcessada.valorNumero === undefined
                      ? null
                      : respostaProcessada.valorNumero,
                  valorOpcao: respostaProcessada.valorOpcao ?? null,
                  fotoUrl: fotoUrlFinal,
                  observacao: respostaProcessada.observacao ?? null,
                  nota: respostaProcessada.nota ?? null,
                };
              }
            );

            if (process.env.NODE_ENV === 'development') {
              console.log('[respostas POST] Dados que serão salvos no banco:', {
                respostaId,
                total: respostasParaSalvar.length,
                dados: respostasParaSalvar.map(r => ({
                  perguntaId: r.perguntaId,
                  valorBoolean: r.valorBoolean,
                  valorTexto: r.valorTexto?.substring(0, 50),
                  nota: r.nota,
                })),
              });
            }

            await tx.checklistRespostaPergunta.createMany({
              data: respostasParaSalvar,
            });

            if (process.env.NODE_ENV === 'development') {
              console.log(
                '[respostas POST] ✅ Respostas salvas no banco com sucesso'
              );
            }
          } else {
            // Log quando não há respostas para salvar
            console.warn(
              '[respostas POST] ⚠️ Nenhuma resposta processada para salvar:',
              {
                respostaId,
                answersLength: answers.length,
                respostasProcessadasLength: respostasProcessadas.length,
                isDraft,
                answers: answers.map(a => ({
                  perguntaId: a.perguntaId,
                  tipo: a.tipo,
                  temValorTexto: !!a.valorTexto,
                  temValorBoolean:
                    a.valorBoolean !== undefined && a.valorBoolean !== null,
                  valorBoolean: a.valorBoolean,
                  temValorNumero:
                    a.valorNumero !== undefined && a.valorNumero !== null,
                  temValorOpcao: !!a.valorOpcao,
                  temNota: a.nota !== undefined && a.nota !== null,
                  nota: a.nota,
                })),
              }
            );
          }

          return updated;
        }
      }

      // Se não encontrou rascunho para atualizar, verificar se existe rascunho para o mesmo escopo
      if (isDraft && !rascunhoExistente) {
        rascunhoExistente = await tx.checklistResposta.findFirst({
          where: {
            escopoId: escopo.id,
            supervisorId: me.id,
            status: ChecklistRespostaStatus.RASCUNHO,
          },
        });

        if (rascunhoExistente) {
          // Buscar respostas antigas para preservar fotos que não foram reenviadas
          const respostasAntigas = await tx.checklistRespostaPergunta.findMany({
            where: { respostaId: rascunhoExistente.id },
          });

          // Criar um mapa de fotos antigas por perguntaId
          const fotosAntigasMap = new Map<string, string | null>();
          respostasAntigas.forEach(r => {
            if (r.fotoUrl) {
              fotosAntigasMap.set(r.perguntaId, r.fotoUrl);
            }
          });

          // Atualizar rascunho existente
          const observacoesValue =
            typeof observacoes === 'string' && observacoes.trim()
              ? observacoes.trim()
              : null;

          if (process.env.NODE_ENV === 'development') {
            console.log(
              '[respostas POST] Atualizando rascunho existente (sem respostaId):',
              {
                respostaId: rascunhoExistente.id,
                observacoesLength: observacoesValue?.length || 0,
                observacoesPreview:
                  observacoesValue?.substring(0, 50) || '(null)',
                lat,
                lng,
                answersCount: respostasProcessadas.length,
              }
            );
          }

          const updated = await tx.checklistResposta.update({
            where: { id: rascunhoExistente.id },
            data: {
              observacoes: observacoesValue,
              lat: lat !== undefined ? lat : null,
              lng: lng !== undefined ? lng : null,
              accuracy: accuracy !== undefined ? accuracy : null,
              endereco: endereco || null,
              userAgent: userAgent || null,
              deviceId: deviceId || null,
              updatedAt: new Date(),
            },
          });

          // Deletar respostas antigas
          await tx.checklistRespostaPergunta.deleteMany({
            where: { respostaId: rascunhoExistente.id },
          });

          // Criar novas respostas, preservando fotos antigas se não houver foto nova
          // IMPORTANTE: Sempre criar respostas mesmo que o array esteja vazio inicialmente
          if (respostasProcessadas.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(
                '[respostas POST] Criando novas respostas (rascunho existente):',
                {
                  respostaId: rascunhoExistente.id,
                  totalRespostas: respostasProcessadas.length,
                  respostas: respostasProcessadas.map(r => ({
                    perguntaId: r.perguntaId,
                    temValorTexto: !!r.valorTexto,
                    temValorBoolean:
                      r.valorBoolean !== undefined && r.valorBoolean !== null,
                    temValorNumero:
                      r.valorNumero !== undefined && r.valorNumero !== null,
                    temValorOpcao: !!r.valorOpcao,
                    temFotoUrl: !!r.fotoUrl,
                    temNota: r.nota !== undefined && r.nota !== null,
                  })),
                }
              );
            }

            await tx.checklistRespostaPergunta.createMany({
              data: respostasProcessadas.map(respostaProcessada => {
                // Se não tem fotoUrl nova mas tinha foto antiga, preservar a antiga
                const fotoUrlFinal =
                  respostaProcessada.fotoUrl ??
                  fotosAntigasMap.get(respostaProcessada.perguntaId) ??
                  null;

                return {
                  respostaId: rascunhoExistente!.id,
                  perguntaId: respostaProcessada.perguntaId,
                  valorTexto: respostaProcessada.valorTexto ?? null,
                  valorBoolean:
                    respostaProcessada.valorBoolean === undefined
                      ? null
                      : respostaProcessada.valorBoolean,
                  valorNumero:
                    respostaProcessada.valorNumero === undefined
                      ? null
                      : respostaProcessada.valorNumero,
                  valorOpcao: respostaProcessada.valorOpcao ?? null,
                  fotoUrl: fotoUrlFinal,
                  observacao: respostaProcessada.observacao ?? null,
                  nota: respostaProcessada.nota ?? null,
                };
              }),
            });
          }

          return updated;
        }
      }

      // Criar novo checklist (rascunho ou finalizado)
      const observacoesValue =
        typeof observacoes === 'string' && observacoes.trim()
          ? observacoes.trim()
          : null;

      if (process.env.NODE_ENV === 'development') {
        console.log('[respostas POST] Criando novo rascunho:', {
          escopoId: escopo.id,
          observacoesLength: observacoesValue?.length || 0,
          observacoesPreview: observacoesValue?.substring(0, 50) || '(null)',
          lat,
          lng,
          answersCount: respostasProcessadas.length,
        });
      }

      const created = await tx.checklistResposta.create({
        data: {
          templateId: escopo.templateId,
          escopoId: escopo.id,
          unidadeId: escopo.unidadeId,
          grupoId: escopo.grupoId,
          supervisorId: me.id,
          status: isDraft
            ? ChecklistRespostaStatus.RASCUNHO
            : ChecklistRespostaStatus.CONCLUIDO,
          observacoes: observacoesValue,
          startedAt: new Date(),
          submittedAt: isDraft ? null : new Date(),
          // Dados de assinatura (apenas se não for rascunho)
          protocolo: protocolo || null,
          assinaturaFotoUrl: isDraft ? null : assinaturaFotoUrl,
          gerenteAssinaturaFotoUrl: isDraft
            ? null
            : gerenteAssinaturaFotoUrl || null,
          gerenteAssinadoEm:
            isDraft || !gerenteAssinaturaFotoUrl ? null : new Date(),
          gerenteAssinadoPorId: null,
          lat: lat !== undefined ? lat : null,
          lng: lng !== undefined ? lng : null,
          accuracy: accuracy !== undefined ? accuracy : null,
          endereco: endereco || null,
          userAgent: userAgent || null,
          deviceId: deviceId || null,
          hash: hash || null,
        } as any,
      });

      // Criar todas as respostas em paralelo usando createMany (mais rápido)
      if (respostasProcessadas.length > 0) {
        await tx.checklistRespostaPergunta.createMany({
          data: respostasProcessadas.map(respostaProcessada => ({
            respostaId: created.id,
            perguntaId: respostaProcessada.perguntaId,
            valorTexto: respostaProcessada.valorTexto ?? null,
            valorBoolean:
              respostaProcessada.valorBoolean === undefined
                ? null
                : respostaProcessada.valorBoolean,
            valorNumero:
              respostaProcessada.valorNumero === undefined
                ? null
                : respostaProcessada.valorNumero,
            valorOpcao: respostaProcessada.valorOpcao ?? null,
            fotoUrl: respostaProcessada.fotoUrl ?? null,
            observacao: respostaProcessada.observacao ?? null,
            nota: respostaProcessada.nota ?? null,
          })),
        });
      }

      await tx.checklistEscopo.update({
        where: { id: escopo.id },
        data: {
          ultimoEnvioEm: new Date(),
          ultimoSupervisorId: me.id,
        },
      });

      return created;
    });

    // Para rascunhos, incluir as respostas no retorno
    const respostaComDados = await prisma.checklistResposta.findUnique({
      where: { id: resposta.id },
      select: isDraft
        ? {
            ...respostaListSelect,
            respostas: {
              include: {
                pergunta: {
                  select: {
                    id: true,
                    tipo: true,
                  },
                },
              },
            },
          }
        : respostaListSelect,
    });

    // Não enviar automaticamente - aguardar aprovação do operacional
    // O envio será feito após aprovação através da API de aprovação

    // Enviar notificações em background apenas se não for rascunho (não bloquear a resposta)
    if (!isDraft) {
      Promise.all([
        // Notificar equipe operacional por email
        (async () => {
          try {
            const { notifyOperacionalTeam } = await import(
              '@/lib/checklists-operacionais/notifications'
            );
            await notifyOperacionalTeam({
              respostaId: resposta.id,
              protocolo: protocolo || '',
              templateTitulo: escopo.template.titulo,
              unidadeNome: escopo.unidade.nome,
              grupoNome: escopo.grupo?.nome || null,
              supervisorNome: me.name,
              supervisorEmail: me.email,
              submittedAt: new Date(),
            });
          } catch (error) {
            console.error('Erro ao notificar equipe operacional:', error);
          }
        })(),
        // Notificar supervisor por WhatsApp
        (async () => {
          try {
            const { notifySupervisorWhatsApp } = await import(
              '@/lib/checklists-operacionais/notifications'
            );
            await notifySupervisorWhatsApp({
              supervisorId: me.id,
              unidadeId: escopo.unidadeId,
              grupoId: escopo.grupoId || null,
              templateTitulo: escopo.template.titulo,
              unidadeNome: escopo.unidade.nome,
              grupoNome: escopo.grupo?.nome || null,
              protocolo: protocolo || '',
              submittedAt: new Date(),
            });
          } catch (error) {
            console.error('Erro ao notificar supervisor via WhatsApp:', error);
          }
        })(),
      ]).catch(error => {
        console.error('Erro ao enviar notificações:', error);
      });
    }

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      const respostaComRespostas = respostaComDados as any;
      console.log('[respostas POST] Rascunho criado/atualizado:', {
        respostaId: resposta.id,
        isDraft,
        temRespostaComDados: !!respostaComDados,
        observacoesNaResposta:
          respostaComDados?.observacoes?.substring(0, 50) || '(null)',
        respostasCount: respostaComRespostas?.respostas?.length || 0,
      });
    }

    // Serializar resposta incluindo respostas se for rascunho
    let respostaSerializada: any;
    if (respostaComDados) {
      respostaSerializada = serializeResposta(respostaComDados as any);
      // Se for rascunho e tiver respostas, incluir no retorno
      const respostaComRespostas = respostaComDados as any;
      if (isDraft && respostaComRespostas?.respostas) {
        respostaSerializada.respostas = respostaComRespostas.respostas.map(
          (r: any) => ({
            perguntaId: r.perguntaId,
            valorTexto: r.valorTexto,
            valorBoolean: r.valorBoolean,
            valorNumero: r.valorNumero,
            valorOpcao: r.valorOpcao,
            fotoUrl: r.fotoUrl,
            observacao: r.observacao,
            nota: r.nota,
            pergunta: r.pergunta,
          })
        );
      }
    } else {
      respostaSerializada = {
        id: resposta.id,
        escopoId: resposta.escopoId,
        status: resposta.status,
        startedAt: resposta.startedAt.toISOString(),
        updatedAt: resposta.updatedAt.toISOString(),
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[respostas POST] Retornando resposta:', {
        respostaId: respostaSerializada.id,
        isDraft,
        temRespostas: !!respostaSerializada.respostas,
        respostasCount: respostaSerializada.respostas?.length || 0,
      });
    }

    return NextResponse.json(
      {
        resposta: respostaSerializada,
        protocolo: protocolo || null,
        isDraft,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'Erro ao registrar resposta de checklist operacional:',
      error
    );

    // Retornar mensagem de erro mais detalhada
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar a resposta.';

    return NextResponse.json(
      {
        error: 'internal_error',
        message: errorMessage,
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
