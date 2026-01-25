import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createHash } from 'crypto';
import { ChecklistRespostaStatus } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import {
  respostaListSelect,
  serializeResposta,
} from '@/lib/checklists-operacionais/serializer';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ respostaId: string }> }
) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'create')) {
    return NextResponse.json(forbiddenPayload('checklists', 'create'), {
      status: 403,
    });
  }

  const { respostaId } = await params;

  // Buscar o rascunho
  const rascunho = await prisma.checklistResposta.findUnique({
    where: { id: respostaId },
    include: {
      template: {
        select: {
          id: true,
          titulo: true,
          grupos: {
            include: {
              perguntas: true,
            },
          },
        },
      },
      escopo: {
        include: {
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
      },
      respostas: {
        include: {
          pergunta: true,
        },
      },
    },
  });

  if (!rascunho) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Verificar se é um rascunho e pertence ao supervisor
  if (rascunho.status !== ChecklistRespostaStatus.RASCUNHO) {
    return NextResponse.json(
      { error: 'Este checklist não está em rascunho' },
      { status: 400 }
    );
  }

  if (rascunho.supervisorId !== me.id) {
    return NextResponse.json(forbiddenPayload('checklists', 'create'), {
      status: 403,
    });
  }

  const formData = await request.formData();
  const assinaturaFoto = formData.get('assinaturaFoto');
  const assinaturaGerenteDataUrl = formData.get('assinaturaGerenteDataUrl');
  const lat = formData.get('lat') ? Number(formData.get('lat')) : undefined;
  const lng = formData.get('lng') ? Number(formData.get('lng')) : undefined;
  const accuracy = formData.get('accuracy')
    ? Number(formData.get('accuracy'))
    : undefined;
  const endereco = String(formData.get('endereco') ?? '').trim() || null;
  const deviceId = String(formData.get('deviceId') ?? '').trim();
  const userAgent = request.headers.get('user-agent') || '';
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || '';

  // Validar que todas as perguntas obrigatórias foram respondidas
  const perguntas = rascunho.template.grupos.flatMap(grupo => grupo.perguntas);
  for (const pergunta of perguntas) {
    if (!pergunta.obrigatoria) continue;
    const answered = rascunho.respostas.some(
      resposta => resposta.perguntaId === pergunta.id
    );
    if (!answered) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `A pergunta "${pergunta.titulo}" é obrigatória. Preencha todas as perguntas obrigatórias antes de finalizar.`,
        },
        { status: 422 }
      );
    }
  }

  // Processar assinaturas
  const uploadPromises: Promise<{ tipo: 'supervisor' | 'gerente'; url: string | null }>[] = [];

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
            prefix: `checklists/assinaturas/${rascunho.escopoId}`,
          });
          return { tipo: 'supervisor' as const, url };
        } catch (error) {
          console.error('Erro ao fazer upload da foto de assinatura:', error);
          return { tipo: 'supervisor' as const, url: null };
        }
      })()
    );
  } else {
    uploadPromises.push(Promise.resolve({ tipo: 'supervisor' as const, url: null }));
  }

  if (assinaturaGerenteDataUrl && typeof assinaturaGerenteDataUrl === 'string') {
    uploadPromises.push(
      (async () => {
        try {
          const base64Data = assinaturaGerenteDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const timestamp = Date.now();
          
          const url = await uploadBufferToS3({
            buffer,
            originalName: `assinatura-gerente-${timestamp}-${rascunho.escopoId}.png`,
            contentType: 'image/png',
            prefix: `checklists/assinaturas-gerente/${rascunho.escopoId}`,
          });
          return { tipo: 'gerente' as const, url };
        } catch (error) {
          console.error('Erro ao fazer upload da assinatura do gerente:', error);
          return { tipo: 'gerente' as const, url: null };
        }
      })()
    );
  } else {
    uploadPromises.push(Promise.resolve({ tipo: 'gerente' as const, url: null }));
  }

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

  // Gerar protocolo e hash
  const now = new Date();
  const canonical = [
    `ts=${now.toISOString()}`,
    `supervisor=${me.id}`,
    `unidade=${rascunho.unidadeId}`,
    `template=${rascunho.templateId}`,
    `escopo=${rascunho.escopoId}`,
    `ip=${ip || ''}`,
    `device=${deviceId || ''}`,
  ].join('|');
  const hash = createHash('sha256').update(canonical).digest('hex');
  const protocolo = `KL-${now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${hash.slice(0, 8).toUpperCase()}`;

  try {
    const resposta = await prisma.checklistResposta.update({
      where: { id: respostaId },
      data: {
        status: ChecklistRespostaStatus.CONCLUIDO,
        submittedAt: new Date(),
        protocolo,
        assinaturaFotoUrl: assinaturaFotoUrl || null,
        gerenteAssinaturaFotoUrl: gerenteAssinaturaFotoUrl || null,
        gerenteAssinadoEm: gerenteAssinaturaFotoUrl ? new Date() : null,
        gerenteAssinadoPorId: null,
        lat: lat !== undefined ? lat : rascunho.lat,
        lng: lng !== undefined ? lng : rascunho.lng,
        accuracy: accuracy !== undefined ? accuracy : rascunho.accuracy,
        endereco: endereco || rascunho.endereco,
        userAgent: userAgent || rascunho.userAgent,
        deviceId: deviceId || rascunho.deviceId,
        hash,
      },
    });

    const respostaComDados = await prisma.checklistResposta.findUnique({
      where: { id: resposta.id },
      select: respostaListSelect,
    });

    // Enviar notificações em background
    Promise.all([
      (async () => {
        try {
          const { notifyOperacionalTeam } = await import('@/lib/checklists-operacionais/notifications');
          await notifyOperacionalTeam({
            respostaId: resposta.id,
            protocolo,
            templateTitulo: rascunho.template.titulo,
            unidadeNome: rascunho.escopo.unidade.nome,
            grupoNome: rascunho.escopo.grupo?.nome || null,
            supervisorNome: me.name,
            supervisorEmail: me.email,
            submittedAt: new Date(),
          });
        } catch (error) {
          console.error('Erro ao notificar equipe operacional:', error);
        }
      })(),
      (async () => {
        try {
          const { notifySupervisorWhatsApp } = await import('@/lib/checklists-operacionais/notifications');
          await notifySupervisorWhatsApp({
            supervisorId: me.id,
            unidadeId: rascunho.unidadeId,
            grupoId: rascunho.grupoId || null,
            templateTitulo: rascunho.template.titulo,
            unidadeNome: rascunho.escopo.unidade.nome,
            grupoNome: rascunho.escopo.grupo?.nome || null,
            protocolo,
            submittedAt: new Date(),
          });
        } catch (error) {
          console.error('Erro ao notificar supervisor via WhatsApp:', error);
        }
      })(),
    ]).catch(error => {
      console.error('Erro ao enviar notificações:', error);
    });

    return NextResponse.json(
      {
        resposta: respostaComDados ? serializeResposta(respostaComDados) : null,
        protocolo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao finalizar checklist:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Não foi possível finalizar o checklist.',
      },
      { status: 500 }
    );
  }
}

