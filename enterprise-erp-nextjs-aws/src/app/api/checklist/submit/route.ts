import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import { z } from 'zod';
import { Buffer } from 'node:buffer';

// Schema de validação para o formulário de checklist
const checklistSchema = z.object({
  unidadeId: z.string().min(1, 'ID da unidade é obrigatório'),
  tipo: z.enum(['LIMPEZA', 'INSUMOS', 'SATISFACAO']),

  // Campos específicos para limpeza
  servicosLimpeza: z.array(z.enum(['LIMPEZA', 'RETIRADA_LIXO'])).optional(),

  // Campos específicos para insumos
  insumosSolicitados: z
    .array(
      z.enum([
        'ALCOOL_HIGIENIZACAO',
        'PAPEL_HIGIENICO',
        'PAPEL_TOALHA',
        'SABONETE',
      ])
    )
    .optional(),

  // Campos específicos para satisfação
  avaliacaoLimpeza: z
    .enum(['MUITO_RUIM', 'RUIM', 'REGULAR', 'BOM', 'MUITO_BOM'])
    .optional(),
  fatoresInfluencia: z
    .array(
      z.enum([
        'CHEIRO',
        'DISPONIBILIDADE_INSUMOS',
        'LIMPEZA_SUPERFICIES',
        'POSTURA_EQUIPE',
        'RECOLHIMENTO_LIXO',
      ])
    )
    .optional(),
  comentarios: z.string().max(1000, 'Comentários muito longos').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extrair dados do formulário
    const unidadeId = formData.get('unidadeId')?.toString();
    const tipo = formData.get('tipo')?.toString();
    const dataRaw = formData.get('data')?.toString();
    const foto = formData.get('foto') as File | null;

    if (!unidadeId || !tipo || !dataRaw) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(dataRaw);
    } catch {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    body.unidadeId = unidadeId;
    body.tipo = tipo;

    // Validar dados
    const validatedData = checklistSchema.parse(body);

    // Verificar se a unidade existe
    const unidade = await prisma.unidade.findUnique({
      where: { id: validatedData.unidadeId },
      select: { id: true, nome: true },
    });

    if (!unidade) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      );
    }

    // Obter informações do cliente
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Processar upload de foto se houver
    let fotoUrl: string | null = null;
    if (foto && foto instanceof File && foto.size > 0) {
      try {
        // Validar tipo de arquivo
        if (!foto.type.startsWith('image/')) {
          return NextResponse.json(
            { error: 'Arquivo deve ser uma imagem' },
            { status: 400 }
          );
        }

        // Validar tamanho (10MB)
        if (foto.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Arquivo muito grande (máximo 10MB)' },
            { status: 400 }
          );
        }

        // Fazer upload para S3
        const arrayBuffer = await foto.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fotoUrl = await uploadBufferToS3({
          buffer,
          originalName: foto.name || `checklist-limpeza-${Date.now()}.jpg`,
          contentType: foto.type || 'image/jpeg',
          prefix: `checklists/limpeza/${validatedData.unidadeId}`,
        });
      } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        return NextResponse.json(
          { error: 'Erro ao fazer upload da foto' },
          { status: 500 }
        );
      }
    }

    // Criar registro no banco
    const checklist = await prisma.checklistDigital.create({
      data: {
        unidadeId: validatedData.unidadeId,
        tipo: validatedData.tipo,
        servicosLimpeza: validatedData.servicosLimpeza || [],
        insumosSolicitados: validatedData.insumosSolicitados || [],
        avaliacaoLimpeza: validatedData.avaliacaoLimpeza,
        fatoresInfluencia: validatedData.fatoresInfluencia || [],
        comentarios: validatedData.comentarios,
        fotoUrl,
        ipAddress,
        userAgent,
      },
      include: {
        unidade: {
          select: {
            nome: true,
            whatsappLider: true,
          },
        },
      },
    });

    // Enviar notificação WhatsApp apenas para LIMPEZA e INSUMOS
    let whatsappSent = false;
    if (
      checklist.unidade.whatsappLider &&
      (validatedData.tipo === 'LIMPEZA' || validatedData.tipo === 'INSUMOS')
    ) {
      try {
        const whatsappResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/whatsapp/send-message`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              checklistId: checklist.id,
              unidadeId: checklist.unidadeId,
            }),
          }
        );

        if (whatsappResponse.ok) {
          whatsappSent = true;
        }
      } catch (error) {
        console.error('Erro ao enviar notificação WhatsApp:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Checklist enviado com sucesso!',
      data: {
        id: checklist.id,
        unidade: checklist.unidade.nome,
        tipo: checklist.tipo,
        timestamp: checklist.timestamp,
        whatsappSent,
      },
    });
  } catch (error) {
    console.error('Erro ao processar checklist:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
