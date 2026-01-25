import { NextRequest, NextResponse } from 'next/server';
import { ChecklistPerguntaTipo } from '@prisma/client';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { templateFullInclude, serializeTemplate } from '@/lib/checklists-operacionais/serializer';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';

const perguntaSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.nativeEnum(ChecklistPerguntaTipo),
  obrigatoria: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
  instrucoes: z.string().optional(),
  opcoes: z.array(z.string().min(1)).optional(),
  peso: z.number().int().min(1).max(5).optional().nullable(),
  permiteMultiplasFotos: z.boolean().optional(),
  permiteAnexarFoto: z.boolean().optional(),
});

const grupoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0).optional(),
  perguntas: z.array(perguntaSchema).default([]),
});

const templateSchema = z.object({
  titulo: z.string().min(1, 'Informe um título para o checklist'),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  grupos: z.array(grupoSchema).default([]),
  unidadeIds: z
    .array(z.string().min(1))
    .optional()
    .transform(arr => arr?.filter(Boolean) ?? []),
});

export async function GET() {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const templates = await prisma.checklistTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: templateFullInclude,
  });

  return NextResponse.json({
    templates: templates.map(serializeTemplate),
  });
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'create')) {
    return NextResponse.json(forbiddenPayload('checklists', 'create'), {
      status: 403,
    });
  }

  let payload: z.infer<typeof templateSchema>;

  try {
    payload = templateSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'validation_error',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const grupos = payload.grupos ?? [];

  try {
    const template = await prisma.$transaction(async tx => {
      const created = await tx.checklistTemplate.create({
        data: {
          titulo: payload.titulo,
          descricao: payload.descricao,
          ativo: payload.ativo ?? true,
          criadoPorId: me.id,
          atualizadoPorId: me.id,
          grupos: {
            create: grupos.map((grupo, grupoIndex) => ({
              titulo: grupo.titulo,
              descricao: grupo.descricao,
              ordem: grupo.ordem ?? grupoIndex,
              perguntas: {
                create: (grupo.perguntas ?? []).map((pergunta, perguntaIndex) => ({
                  titulo: pergunta.titulo,
                  descricao: pergunta.descricao,
                  tipo: pergunta.tipo,
                  obrigatoria: pergunta.obrigatoria ?? false,
                  ordem: pergunta.ordem ?? perguntaIndex,
                  instrucoes: pergunta.instrucoes,
                  opcoes:
                    pergunta.tipo === ChecklistPerguntaTipo.SELECAO
                      ? pergunta.opcoes ?? []
                      : [],
                  peso: pergunta.peso ?? null,
                  permiteMultiplasFotos: pergunta.tipo === ChecklistPerguntaTipo.FOTO 
                    ? (pergunta.permiteMultiplasFotos ?? false)
                    : false,
                  permiteAnexarFoto: pergunta.permiteAnexarFoto ?? false,
                })),
              },
            })),
          },
        },
      });

      if (payload.unidadeIds?.length) {
        const unidades = await tx.unidade.findMany({
          where: { id: { in: payload.unidadeIds } },
          select: {
            id: true,
            mapeamentos: {
              where: { ativo: true },
              select: { grupoId: true },
              take: 1,
            },
          },
        });

        for (const unidade of unidades) {
          await tx.checklistEscopo.create({
            data: {
              templateId: created.id,
              unidadeId: unidade.id,
              grupoId: unidade.mapeamentos[0]?.grupoId ?? null,
            },
          });
        }
      }

      return tx.checklistTemplate.findUniqueOrThrow({
        where: { id: created.id },
        include: templateFullInclude,
      });
    });

    // Registrar auditoria
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.create',
      resource: 'ChecklistTemplate',
      resourceId: template.id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: true,
      ip,
      userAgent,
      method: 'POST',
      url: '/api/checklists-operacionais/templates',
      description: `Checklist criado: ${payload.titulo}`,
      metadata: {
        titulo: payload.titulo,
        gruposCount: grupos.length,
        ativo: payload.ativo ?? true,
      },
    });

    return NextResponse.json(
      {
        template: serializeTemplate(template),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar checklist operacional:', error);
    
    // Registrar auditoria de erro
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.create',
      resource: 'ChecklistTemplate',
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ip,
      userAgent,
      method: 'POST',
      url: '/api/checklists-operacionais/templates',
    });
    
    return NextResponse.json(
      { error: 'internal_error', message: 'Não foi possível criar o checklist' },
      { status: 500 }
    );
  }
}

