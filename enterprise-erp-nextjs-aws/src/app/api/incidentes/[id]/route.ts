export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { can, forbiddenPayload } from '@/lib/auth/policy';
import { prisma } from '@/lib/prisma';
import { getSupervisorScope } from '@/lib/supervisor-scope';
import { sendChamadoConcluidoEmail } from '@/lib/email';
import { uploadBufferToS3 } from '@/lib/s3';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const me = await getCurrentUser(request);

  if (!me?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!can(me.role, 'incidentes', 'update')) {
    return NextResponse.json(forbiddenPayload('incidentes', 'update'), {
      status: 403,
    });
  }

  // Verificar se é FormData (com imagem) ou JSON
  const contentType = request.headers.get('content-type') || '';
  let status: 'ABERTO' | 'CONCLUIDO' | undefined;
  let conclusaoNotas: string | null = null;
  let imagemConclusao: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const statusValue = formData.get('status')?.toString();
    status = statusValue === 'ABERTO' || statusValue === 'CONCLUIDO' ? statusValue : undefined;
    conclusaoNotas = formData.get('conclusaoNotas')?.toString() || null;
    imagemConclusao = formData.get('imagemConclusao') as File | null;
  } else {
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'ABERTO' | 'CONCLUIDO';
      conclusaoNotas?: string | null;
    };
    status = body.status;
    conclusaoNotas = body.conclusaoNotas ?? null;
  }

  if (!status || !['ABERTO', 'CONCLUIDO'].includes(status)) {
    return NextResponse.json(
      { error: 'Status inválido' },
      { status: 400 }
    );
  }

  // Validações para conclusão
  if (status === 'CONCLUIDO') {
    if (!conclusaoNotas || conclusaoNotas.trim().length === 0) {
      return NextResponse.json(
        { error: 'Observação é obrigatória ao concluir um incidente' },
        { status: 400 }
      );
    }

    if (!imagemConclusao || imagemConclusao.size === 0) {
      return NextResponse.json(
        { error: 'Imagem de prova de conclusão é obrigatória' },
        { status: 400 }
      );
    }
  }

  const incidente = await prisma.incidente.findUnique({
    where: { id: params.id },
    include: {
      grupo: { select: { id: true, nome: true } },
      unidade: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      criadoPor: { select: { id: true, name: true } },
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

  if (!incidente) {
    return NextResponse.json(
      { error: 'Incidente não encontrado' },
      { status: 404 }
    );
  }

  if (me.role === 'SUPERVISOR') {
    const scope = await getSupervisorScope(me.id);
    if (!scope.unidadeIds.includes(incidente.unidadeId)) {
      return NextResponse.json(
        { error: 'Você não tem acesso a este incidente' },
        { status: 403 }
      );
    }

    if (status === 'ABERTO' && incidente.criadoPorId !== me.id) {
      return NextResponse.json(
        { error: 'Apenas o criador ou administradores podem reabrir' },
        { status: 403 }
      );
    }
  }

  // Processar upload de imagem de conclusão se fornecida
  let imagemConclusaoUrl: string | null = null;
  if (status === 'CONCLUIDO' && imagemConclusao && imagemConclusao.size > 0) {
    try {
      if (!imagemConclusao.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Arquivo deve ser uma imagem' },
          { status: 400 }
        );
      }

      if (imagemConclusao.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Imagem muito grande (máximo 5MB)' },
          { status: 400 }
        );
      }

      const arrayBuffer = await imagemConclusao.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imagemConclusaoUrl = await uploadBufferToS3({
        buffer,
        originalName: imagemConclusao.name,
        contentType: imagemConclusao.type || 'image/jpeg',
        prefix: 'incidentes/conclusao',
      });
    } catch (uploadError) {
      console.error('Erro ao fazer upload da imagem de conclusão:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      );
    }
  }

  const updateData: any = {
    status,
    conclusaoNotas: status === 'CONCLUIDO' ? conclusaoNotas ?? null : null,
  };

  if (status === 'CONCLUIDO') {
    updateData.concluidoPorId = me.id;
    updateData.concluidoEm = new Date();
    if (imagemConclusaoUrl) {
      updateData.imagemConclusaoUrl = imagemConclusaoUrl;
    }
  } else {
    updateData.concluidoPorId = null;
    updateData.concluidoEm = null;
    updateData.imagemConclusaoUrl = null;
  }

  const updated = await prisma.incidente.update({
    where: { id: params.id },
    data: updateData,
    include: {
      grupo: { select: { id: true, nome: true } },
      unidade: {
        select: { id: true, nome: true, cidade: true, estado: true },
      },
      criadoPor: { select: { id: true, name: true } },
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

  // Enviar email de notificação quando o chamado for concluído
  if (status === 'CONCLUIDO' && updated.clienteFinal) {
    try {
      await sendChamadoConcluidoEmail({
        email: updated.clienteFinal.email,
        nome: updated.clienteFinal.nome,
        titulo: updated.titulo,
        categoria: updated.categoria as string | null,
        urgencia: null, // Campo legado, não usado mais (usamos categoriaUrgencia)
        descricao: updated.descricao,
        grupo: updated.grupo.nome,
        unidade: updated.unidade.nome,
        conclusaoNotas: updated.conclusaoNotas,
        imagemUrl: updated.imagemConclusaoUrl || updated.imagemUrl, // Priorizar foto de conclusão
        incidenteId: updated.id,
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação de conclusão:', emailError);
      // Não falhar o processo se o email não for enviado
    }
  }

  return NextResponse.json({ incidente: updated });
}

