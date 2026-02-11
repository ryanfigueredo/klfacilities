import { NextRequest, NextResponse } from 'next/server';
import { ChecklistPerguntaTipo } from '@prisma/client';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { serializeTemplate, templateFullInclude } from '@/lib/checklists-operacionais/serializer';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/log';

const perguntaSchema = z.object({
  id: z.string().optional(), // ID opcional para atualizar pergunta existente
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.nativeEnum(ChecklistPerguntaTipo),
  obrigatoria: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
  instrucoes: z.string().optional(),
  opcoes: z.array(z.string().min(1)).optional(),
  peso: z.number().int().min(1).max(5).optional().nullable(),
  permiteMultiplasFotos: z.boolean().optional(),
  permiteAnexarFoto: z.boolean().optional(), // Adicionar campo permiteAnexarFoto
});

const grupoSchema = z.object({
  id: z.string().optional(), // ID opcional para atualizar grupo existente
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
          // Buscar grupos e perguntas existentes
          const gruposExistentes = await tx.checklistGrupoTemplate.findMany({
            where: { templateId: id },
            include: { perguntas: true },
            orderBy: { ordem: 'asc' },
          });

          const perguntasExistentesMap = new Map<string, typeof gruposExistentes[0]['perguntas'][0]>();
          gruposExistentes.forEach(grupo => {
            grupo.perguntas.forEach(pergunta => {
              perguntasExistentesMap.set(pergunta.id, pergunta);
            });
          });

          // Processar grupos: atualizar existentes ou criar novos
          const gruposProcessados: Array<{ id: string; ordem: number }> = [];

          for (const [grupoIndex, grupoPayload] of payload.grupos.entries()) {
            let grupoId: string;

            // Se grupo tem ID e existe, atualizar; senão, criar novo
            if (grupoPayload.id) {
              const grupoExistente = gruposExistentes.find(g => g.id === grupoPayload.id);
              if (grupoExistente) {
                // Atualizar grupo existente
                await tx.checklistGrupoTemplate.update({
                  where: { id: grupoPayload.id },
                  data: {
                    titulo: grupoPayload.titulo,
                    descricao: grupoPayload.descricao ?? null,
                    ordem: grupoPayload.ordem ?? grupoIndex,
                  },
                });
                grupoId = grupoPayload.id;
              } else {
                // ID não encontrado, criar novo
                const novoGrupo = await tx.checklistGrupoTemplate.create({
                  data: {
                    templateId: id,
                    titulo: grupoPayload.titulo,
                    descricao: grupoPayload.descricao ?? null,
                    ordem: grupoPayload.ordem ?? grupoIndex,
                  },
                });
                grupoId = novoGrupo.id;
              }
            } else {
              // Criar novo grupo
              const novoGrupo = await tx.checklistGrupoTemplate.create({
                data: {
                  templateId: id,
                  titulo: grupoPayload.titulo,
                  descricao: grupoPayload.descricao ?? null,
                  ordem: grupoPayload.ordem ?? grupoIndex,
                },
              });
              grupoId = novoGrupo.id;
            }

            gruposProcessados.push({ id: grupoId, ordem: grupoPayload.ordem ?? grupoIndex });

            // Processar perguntas do grupo
            for (const [perguntaIndex, perguntaPayload] of (grupoPayload.perguntas ?? []).entries()) {
              if (perguntaPayload.id && perguntasExistentesMap.has(perguntaPayload.id)) {
                // Atualizar pergunta existente (preserva respostas)
                await tx.checklistPerguntaTemplate.update({
                  where: { id: perguntaPayload.id },
                  data: {
                    titulo: perguntaPayload.titulo,
                    descricao: perguntaPayload.descricao ?? null,
                    tipo: perguntaPayload.tipo,
                    obrigatoria: perguntaPayload.obrigatoria ?? false,
                    ordem: perguntaPayload.ordem ?? perguntaIndex,
                    instrucoes: perguntaPayload.instrucoes ?? null,
                    opcoes:
                      perguntaPayload.tipo === ChecklistPerguntaTipo.SELECAO
                        ? perguntaPayload.opcoes ?? []
                        : [],
                    peso: perguntaPayload.peso ?? null,
                    permiteMultiplasFotos: perguntaPayload.tipo === ChecklistPerguntaTipo.FOTO 
                      ? (perguntaPayload.permiteMultiplasFotos ?? false)
                      : false,
                    permiteAnexarFoto: perguntaPayload.permiteAnexarFoto ?? false,
                    // Atualizar grupoId se mudou
                    grupoId: grupoId,
                  },
                });
              } else {
                // Criar nova pergunta
                await tx.checklistPerguntaTemplate.create({
                  data: {
                    grupoId: grupoId,
                    titulo: perguntaPayload.titulo,
                    descricao: perguntaPayload.descricao ?? null,
                    tipo: perguntaPayload.tipo,
                    obrigatoria: perguntaPayload.obrigatoria ?? false,
                    ordem: perguntaPayload.ordem ?? perguntaIndex,
                    instrucoes: perguntaPayload.instrucoes ?? null,
                    opcoes:
                      perguntaPayload.tipo === ChecklistPerguntaTipo.SELECAO
                        ? perguntaPayload.opcoes ?? []
                        : [],
                    peso: perguntaPayload.peso ?? null,
                    permiteMultiplasFotos: perguntaPayload.tipo === ChecklistPerguntaTipo.FOTO 
                      ? (perguntaPayload.permiteMultiplasFotos ?? false)
                      : false,
                    permiteAnexarFoto: perguntaPayload.permiteAnexarFoto ?? false,
                  },
                });
              }
            }
          }

          // Deletar grupos que não estão mais no payload
          const gruposIdsPayload = new Set(
            payload.grupos
              .map(g => g.id)
              .filter((id): id is string => !!id)
          );
          const gruposParaDeletar = gruposExistentes.filter(g => !gruposIdsPayload.has(g.id));
          
          if (gruposParaDeletar.length > 0) {
            const gruposIdsParaDeletar = gruposParaDeletar.map(g => g.id);
            
            // Deletar perguntas dos grupos que serão deletados
            await tx.checklistPerguntaTemplate.deleteMany({
              where: { grupoId: { in: gruposIdsParaDeletar } },
            });
            
            // Deletar grupos
            await tx.checklistGrupoTemplate.deleteMany({
              where: { id: { in: gruposIdsParaDeletar } },
            });
          }

          // Deletar perguntas que não estão mais no payload (mas mantém os grupos)
          const perguntasIdsPayload = new Set(
            payload.grupos
              .flatMap(g => g.perguntas ?? [])
              .map(p => p.id)
              .filter((id): id is string => !!id)
          );
          
          const perguntasParaDeletar = Array.from(perguntasExistentesMap.values()).filter(
            p => !perguntasIdsPayload.has(p.id)
          );

          if (perguntasParaDeletar.length > 0) {
            const perguntasIdsParaDeletar = perguntasParaDeletar.map(p => p.id);
            await tx.checklistPerguntaTemplate.deleteMany({
              where: { id: { in: perguntasIdsParaDeletar } },
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
    // Removido: Não bloqueia mais edição quando há respostas
    // Agora permite atualizar perguntas existentes preservando as respostas

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

