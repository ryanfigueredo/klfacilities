import { NextRequest, NextResponse } from 'next/server';
import { ChecklistPerguntaTipo } from '@prisma/client';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { serializeTemplate, templateFullInclude } from '@/lib/checklists-operacionais/serializer';
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
});

const grupoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0).optional(),
  perguntas: z.array(perguntaSchema).default([]),
});

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  grupos: z.array(grupoSchema).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'list')) {
    return NextResponse.json(forbiddenPayload('checklists', 'list'), {
      status: 403,
    });
  }

  const { id } = await params;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: templateFullInclude,
  });

  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    template: serializeTemplate(template),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'update')) {
    return NextResponse.json(forbiddenPayload('checklists', 'update'), {
      status: 403,
    });
  }

  const { id } = await params;

  const templateExists = await prisma.checklistTemplate.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!templateExists) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let payload: z.infer<typeof updateSchema>;

  try {
    payload = updateSchema.parse(await request.json());
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

  try {
    const template = await prisma.$transaction(
      async tx => {
        const updateData: Record<string, unknown> = {
          atualizadoPorId: me.id,
        };

        if (payload.titulo !== undefined) updateData.titulo = payload.titulo;
        if (payload.descricao !== undefined)
          updateData.descricao = payload.descricao;
        if (payload.ativo !== undefined) updateData.ativo = payload.ativo;

        await tx.checklistTemplate.update({
          where: { id },
          data: updateData,
        });

        if (payload.grupos) {
          const respostasCount = await tx.checklistResposta.count({
            where: { templateId: id },
          });

          if (respostasCount > 0) {
            throw new Error('CHECKLIST_HAS_RESPONSES');
          }

          await tx.checklistPerguntaTemplate.deleteMany({
            where: { grupo: { templateId: id } },
          });
          await tx.checklistGrupoTemplate.deleteMany({
            where: { templateId: id },
          });

          // Preparar todos os grupos para inserção em batch
          const gruposToCreate = payload.grupos.map((grupo, grupoIndex) => ({
            templateId: id,
            titulo: grupo.titulo,
            descricao: grupo.descricao,
            ordem: grupo.ordem ?? grupoIndex,
          }));

          // Criar todos os grupos de uma vez
          const createdGrupos = await tx.checklistGrupoTemplate.createManyAndReturn({
            data: gruposToCreate,
          });

          // Ordenar os grupos criados pela ordem para garantir correspondência
          createdGrupos.sort((a, b) => a.ordem - b.ordem);

          // Preparar todas as perguntas para inserção em batch
          const perguntasToCreate: Array<{
            grupoId: string;
            titulo: string;
            descricao: string | null;
            tipo: ChecklistPerguntaTipo;
            obrigatoria: boolean;
            ordem: number;
            instrucoes: string | null;
            opcoes: string[];
            peso: number | null;
            permiteMultiplasFotos: boolean;
          }> = [];

          for (const [grupoIndex, grupo] of payload.grupos.entries()) {
            const createdGrupo = createdGrupos[grupoIndex];
            if (!createdGrupo) continue;

            for (const [perguntaIndex, pergunta] of (
              grupo.perguntas ?? []
            ).entries()) {
              perguntasToCreate.push({
                grupoId: createdGrupo.id,
                titulo: pergunta.titulo,
                descricao: pergunta.descricao ?? null,
                tipo: pergunta.tipo,
                obrigatoria: pergunta.obrigatoria ?? false,
                ordem: pergunta.ordem ?? perguntaIndex,
                instrucoes: pergunta.instrucoes ?? null,
                opcoes:
                  pergunta.tipo === ChecklistPerguntaTipo.SELECAO
                    ? pergunta.opcoes ?? []
                    : [],
                peso: pergunta.peso ?? null,
                permiteMultiplasFotos: pergunta.tipo === ChecklistPerguntaTipo.FOTO 
                  ? (pergunta.permiteMultiplasFotos ?? false)
                  : false,
              });
            }
          }

          // Criar todas as perguntas de uma vez
          if (perguntasToCreate.length > 0) {
            await tx.checklistPerguntaTemplate.createMany({
              data: perguntasToCreate,
            });
          }
        }

        return tx.checklistTemplate.findUniqueOrThrow({
          where: { id },
          include: templateFullInclude,
        });
      },
      {
        maxWait: 10000, // 10 segundos para esperar o lock
        timeout: 30000, // 30 segundos de timeout para a transação
      }
    );

    // Registrar auditoria
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.update',
      resource: 'ChecklistTemplate',
      resourceId: id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: true,
      ip,
      userAgent,
      method: 'PUT',
      url: `/api/checklists-operacionais/templates/${id}`,
      description: `Checklist atualizado: ${payload.titulo || template.titulo}`,
      metadata: {
        titulo: payload.titulo,
        ativo: payload.ativo,
        gruposAlterados: !!payload.grupos,
        gruposCount: payload.grupos?.length,
      },
    });

    return NextResponse.json({
      template: serializeTemplate(template),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CHECKLIST_HAS_RESPONSES') {
      const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
      const ip = ipHeader.split(',')[0].trim();
      const userAgent = request.headers.get('user-agent') || 'api';
      
      await logAudit({
        action: 'checklist.template.update',
        resource: 'ChecklistTemplate',
        resourceId: id,
        userId: me.id,
        userEmail: me.email || '',
        userRole: me.role || '',
        success: false,
        error: 'CHECKLIST_HAS_RESPONSES',
        ip,
        userAgent,
        method: 'PUT',
        url: `/api/checklists-operacionais/templates/${id}`,
      });
      
      return NextResponse.json(
        {
          error: 'invalid_operation',
          message:
            'Não é possível alterar as perguntas porque já existem respostas registradas.',
        },
        { status: 409 }
      );
    }

    console.error('Erro ao atualizar checklist operacional:', error);
    
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.update',
      resource: 'ChecklistTemplate',
      resourceId: id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ip,
      userAgent,
      method: 'PUT',
      url: `/api/checklists-operacionais/templates/${id}`,
    });
    
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível atualizar o checklist',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();

  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!can(me.role, 'checklists', 'delete')) {
    return NextResponse.json(forbiddenPayload('checklists', 'delete'), {
      status: 403,
    });
  }

  const { id } = await params;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          escopos: true,
          respostas: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Verificar se há respostas registradas
  if (template._count.respostas > 0) {
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.delete',
      resource: 'ChecklistTemplate',
      resourceId: id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: false,
      error: `Não é possível excluir: ${template._count.respostas} resposta(s) registrada(s)`,
      ip,
      userAgent,
      method: 'DELETE',
      url: `/api/checklists-operacionais/templates/${id}`,
    });
    
    return NextResponse.json(
      {
        error: 'invalid_operation',
        message: `Não é possível excluir este checklist porque existem ${template._count.respostas} resposta(s) registrada(s).`,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async tx => {
      // Deletar perguntas
      await tx.checklistPerguntaTemplate.deleteMany({
        where: { grupo: { templateId: id } },
      });

      // Deletar grupos
      await tx.checklistGrupoTemplate.deleteMany({
        where: { templateId: id },
      });

      // Deletar escopos
      await tx.checklistEscopo.deleteMany({
        where: { templateId: id },
      });

      // Deletar template
      await tx.checklistTemplate.delete({
        where: { id },
      });
    });

    // Registrar auditoria
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.delete',
      resource: 'ChecklistTemplate',
      resourceId: id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: true,
      ip,
      userAgent,
      method: 'DELETE',
      url: `/api/checklists-operacionais/templates/${id}`,
      description: `Checklist excluído: ${template.titulo}`,
      metadata: {
        titulo: template.titulo,
        escoposCount: template._count.escopos,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar checklist operacional:', error);
    
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'api';
    
    await logAudit({
      action: 'checklist.template.delete',
      resource: 'ChecklistTemplate',
      resourceId: id,
      userId: me.id,
      userEmail: me.email || '',
      userRole: me.role || '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ip,
      userAgent,
      method: 'DELETE',
      url: `/api/checklists-operacionais/templates/${id}`,
    });
    
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Não foi possível deletar o checklist',
      },
      { status: 500 }
    );
  }
}

