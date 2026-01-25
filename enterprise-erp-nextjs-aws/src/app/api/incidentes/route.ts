export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import {
  filterWhereByUnidades,
  getSupervisorScope,
} from '@/lib/supervisor-scope';

const s3Client =
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

const INCIDENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(request: NextRequest): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'list')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'list'), {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const grupoId = searchParams.get('grupoId');
  const unidadeId = searchParams.get('unidadeId');
  const search = searchParams.get('q');

  let where: any = {};

  if (statusParam && ['ABERTO', 'CONCLUIDO'].includes(statusParam)) {
    where.status = statusParam;
  }

  if (grupoId) {
    where.grupoId = grupoId;
  }

  if (unidadeId) {
    where.unidadeId = unidadeId;
  }

  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: 'insensitive' } },
      { descricao: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.length) {
      return NextResponse.json({ incidentes: [] });
    }

    where = filterWhereByUnidades(where, scope.unidadeIds);

    if (scope.grupoIds.length) {
      if (!where.grupoId) {
        where.grupoId = { in: scope.grupoIds };
      } else if (typeof where.grupoId === 'string') {
        if (!scope.grupoIds.includes(where.grupoId)) {
          return NextResponse.json({ incidentes: [] });
        }
      } else if (where.grupoId?.in) {
        const intersection = where.grupoId.in.filter((id: string) =>
          scope.grupoIds.includes(id)
        );
        if (!intersection.length) {
          return NextResponse.json({ incidentes: [] });
        }
        where.grupoId = { in: intersection };
      }
    }
  }

  const incidentes = await prisma.incidente.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      grupo: { select: { id: true, nome: true } },
      unidade: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      criadoPor: { select: { id: true, name: true, email: true } },
      concluidoPor: { select: { id: true, name: true } },
      clienteFinal: { select: { id: true, email: true, nome: true } },
      categoriaUrgencia: {
        select: {
          id: true,
          urgenciaNivel: true,
          nome: true,
          prazoHoras: true,
          descricao: true,
        },
      },
    },
  });

  return NextResponse.json({ incidentes });
}

export async function POST(request: NextRequest): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'create')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'create'), {
      status: 403,
    });
  }

  const formData = await request.formData();
  const titulo = String(formData.get('titulo') || '').trim();
  const descricao = String(formData.get('descricao') || '').trim();
  const grupoId = String(formData.get('grupoId') || '').trim();
  const unidadeId = String(formData.get('unidadeId') || '').trim();
  const categoriaUrgenciaId = String(formData.get('categoriaUrgenciaId') || '').trim() || null;
  const imagemEntry = formData.get('imagem');

  if (!titulo || titulo.length < 3) {
    return NextResponse.json(
      { error: 'Título é obrigatório (mínimo 3 caracteres)' },
      { status: 400 }
    );
  }

  if (!descricao || descricao.length < 10) {
    return NextResponse.json(
      { error: 'Descrição é obrigatória (mínimo 10 caracteres)' },
      { status: 400 }
    );
  }

  if (!grupoId) {
    return NextResponse.json({ error: 'Grupo é obrigatório' }, { status: 400 });
  }

  if (!unidadeId) {
    return NextResponse.json(
      { error: 'Unidade é obrigatória' },
      { status: 400 }
    );
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.includes(unidadeId)) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta unidade' },
        { status: 403 }
      );
    }
    if (scope.grupoIds.length && !scope.grupoIds.includes(grupoId)) {
      return NextResponse.json(
        { error: 'Você não tem acesso a este grupo' },
        { status: 403 }
      );
    }
  }

  const grupo = await prisma.grupo.findUnique({
    where: { id: grupoId },
    select: { id: true },
  });
  if (!grupo) {
    return NextResponse.json(
      { error: 'Grupo não encontrado' },
      { status: 404 }
    );
  }

  const unidade = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: { id: true },
  });
  if (!unidade) {
    return NextResponse.json(
      { error: 'Unidade não encontrada' },
      { status: 404 }
    );
  }

  let imagemUrl: string | undefined;

  if (
    imagemEntry &&
    typeof imagemEntry === 'object' &&
    'arrayBuffer' in imagemEntry
  ) {
    if (!s3Client) {
      return NextResponse.json(
        { error: 'Configuração de armazenamento ausente' },
        { status: 500 }
      );
    }

    const file = imagemEntry as File;

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo deve ser uma imagem' },
        { status: 400 }
      );
    }

    if (file.size > INCIDENT_IMAGE_MAX_SIZE) {
      return NextResponse.json(
        { error: 'Imagem muito grande (máx. 5MB)' },
        { status: 400 }
      );
    }

    const ext = file.type.split('/')[1] || 'jpg';
    const key = `incidentes/${grupoId}/${unidadeId}/${new Date()
      .toISOString()
      .slice(0, 10)}/${randomUUID()}.${ext}`;

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: bytes,
          ContentType: file.type,
          CacheControl: 'max-age=31536000,immutable',
        })
      );
      imagemUrl = `s3://${process.env.AWS_S3_BUCKET}/${key}`;
    } catch (error) {
      console.error('Erro ao enviar imagem do incidente:', error);
      return NextResponse.json(
        { error: 'Falha ao enviar imagem para armazenamento' },
        { status: 500 }
      );
    }
  }

  const incidente = await prisma.incidente.create({
    data: {
      titulo,
      descricao,
      grupoId,
      unidadeId,
      imagemUrl,
      criadoPorId: me.id,
      categoriaUrgenciaId: categoriaUrgenciaId || null,
    },
    include: {
      grupo: { select: { id: true, nome: true } },
      unidade: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      criadoPor: { select: { id: true, name: true, email: true } },
      concluidoPor: { select: { id: true, name: true } },
      clienteFinal: { select: { id: true, email: true, nome: true } },
      categoriaUrgencia: {
        select: {
          id: true,
          urgenciaNivel: true,
          nome: true,
          prazoHoras: true,
          descricao: true,
        },
      },
    },
  });

  return NextResponse.json({ incidente }, { status: 201 });
}
