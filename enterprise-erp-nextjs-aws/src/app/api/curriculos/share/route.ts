import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { Readable } from 'node:stream';
import { getSupervisorScope } from '@/lib/supervisor-scope';

export const runtime = 'nodejs';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface ShareGroupPayload {
  label: string;
  curriculoIds: string[];
}

const sanitize = (value: string, fallback: string) => {
  const sanitized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
  return sanitized || fallback;
};

const resolveS3Key = (arquivoUrl: string, bucket: string) => {
  if (arquivoUrl.startsWith('s3://')) {
    const pathWithoutPrefix = arquivoUrl.replace('s3://', '');
    const parts = pathWithoutPrefix.split('/');
    const bucketFromUrl = parts[0];
    const key = parts.slice(1).join('/');
    if (bucketFromUrl !== bucket) {
      console.warn(
        `Bucket mismatch: URL has ${bucketFromUrl}, env has ${bucket}. Using env bucket.`
      );
    }
    return key;
  }

  if (arquivoUrl.includes('/')) {
    return arquivoUrl.startsWith('/') ? arquivoUrl.slice(1) : arquivoUrl;
  }

  throw new Error('Formato de URL não suportado');
};

const streamToBuffer = async (stream: any): Promise<Buffer> => {
  if (!stream) return Buffer.alloc(0);

  if (stream instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  if (typeof stream.arrayBuffer === 'function') {
    const arrayBuffer = await stream.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('Tipo de stream não suportado');
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['MASTER', 'ADMIN', 'RH', 'OPERACIONAL'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const groups = (body?.groups || []) as ShareGroupPayload[];

    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum grupo de currículos informado' },
        { status: 400 }
      );
    }

    const allIds = Array.from(
      new Set(
        groups.flatMap(group => Array.isArray(group.curriculoIds) ? group.curriculoIds : [])
      )
    );

    if (allIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum currículo com arquivo disponível nas cidades selecionadas' },
        { status: 400 }
      );
    }

    const curriculos = await prisma.curriculo.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        arquivoUrl: true,
        unidadeId: true,
        unidade: { select: { cidade: true, estado: true } },
      },
    });

    const curriculosById = new Map(curriculos.map(curriculo => [curriculo.id, curriculo]));
    const bucket = process.env.AWS_S3_BUCKET!;
    const zip = new JSZip();
    const skipped: Array<{ id: string; reason: string }> = [];
    let addedFiles = 0;

    let allowedUnidadeIds: Set<string> | null = null;
    if (user.role === 'SUPERVISOR') {
      const scope = await getSupervisorScope(user.id);
      if (!scope.unidadeIds.length) {
        return NextResponse.json(
          { error: 'Nenhuma unidade vinculada ao supervisor' },
          { status: 403 }
        );
      }
      allowedUnidadeIds = new Set(scope.unidadeIds);
    }

    const sanitizedGroups: ShareGroupPayload[] = groups
      .map(group => {
        if (!group?.curriculoIds?.length) {
          return null;
        }
        if (!allowedUnidadeIds) return group;

        const filteredIds = group.curriculoIds.filter(curriculoId => {
          const curriculo = curriculosById.get(curriculoId);
          if (!curriculo?.unidadeId) return false;
          if (!allowedUnidadeIds!.has(curriculo.unidadeId)) {
            skipped.push({ id: curriculoId, reason: 'sem_permissao' });
            return false;
          }
          return true;
        });

        if (!filteredIds.length) return null;
        return { ...group, curriculoIds: filteredIds };
      })
      .filter(Boolean) as ShareGroupPayload[];

    if (!sanitizedGroups.length) {
      return NextResponse.json(
        { error: 'Nenhum currículo disponível para as cidades selecionadas' },
        { status: 400 }
      );
    }

    for (const group of sanitizedGroups) {
      const folder = zip.folder(sanitize(group.label || 'cidade', 'cidade'));
      if (!folder) continue;

      for (const curriculoId of group.curriculoIds || []) {
        const curriculo = curriculosById.get(curriculoId);

        if (!curriculo) {
          skipped.push({ id: curriculoId, reason: 'curriculo_nao_encontrado' });
          continue;
        }

        if (
          !curriculo.arquivoUrl ||
          curriculo.arquivoUrl === 'manual://sem-arquivo'
        ) {
          skipped.push({ id: curriculoId, reason: 'arquivo_indisponivel' });
          continue;
        }

        try {
          const key = resolveS3Key(curriculo.arquivoUrl, bucket);
          const command = new GetObjectCommand({ Bucket: bucket, Key: key });
          const object = await s3.send(command);
          const buffer = await streamToBuffer(object.Body);

          if (!buffer.length) {
            skipped.push({ id: curriculoId, reason: 'arquivo_vazio' });
            continue;
          }

          const nameBase = sanitize(
            `${curriculo.nome || 'curriculo'} ${curriculo.sobrenome || ''}`.trim(),
            curriculo.id
          );

          folder.file(`${nameBase}_${curriculo.id.slice(0, 8)}.pdf`, buffer);
          addedFiles++;
        } catch (error) {
          console.error('Erro ao anexar currículo ao pacote:', error);
          skipped.push({ id: curriculoId, reason: 'download_falhou' });
        }
      }
    }

    if (addedFiles === 0) {
      return NextResponse.json(
        {
          error: 'Nenhum arquivo disponível para as cidades selecionadas',
          skipped,
        },
        { status: 400 }
      );
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const uint8 = new Uint8Array(zipBuffer);
    const arrayBuffer = uint8.slice().buffer;

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="curriculos-${Date.now()}.zip"`,
    });

    if (skipped.length) {
      headers.set('x-skipped-files', encodeURIComponent(JSON.stringify(skipped)));
    }

    return new NextResponse(arrayBuffer, { status: 200, headers });
  } catch (error: any) {
    console.error('Erro ao gerar pacote de currículos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar pacote de currículos' },
      { status: 500 }
    );
  }
}

